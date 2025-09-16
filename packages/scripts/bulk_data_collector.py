#!/usr/bin/env python3
"""
2018-2024년 모든 품목 대량 데이터 수집기

이 스크립트는 여러 연도와 품목에 대해 자동으로 데이터를 수집합니다.
주요 무역 관계(미국-중국, 미국-일본, 독일-중국 등)를 중심으로 데이터를 수집합니다.

사용법:
    python bulk_data_collector.py --start-year 2018 --end-year 2024
    python bulk_data_collector.py --start-year 2020 --end-year 2022 --items semiconductor oil
"""

import comtradeapicall
import pandas as pd
import geopandas as gpd
from shapely.geometry import LineString
import json
import os
import sys
import argparse
import time
from datetime import datetime
from typing import List, Dict, Tuple

# 품목별 HS Code 정의 (GUIDE.md 기준) - 개별 코드로 분리
COMMODITY_MAP = {
    "semiconductor_8541": "8541",      # 다이오드, 트랜지스터 등
    "semiconductor_8542": "8542",      # 집적회로
    "oil": "2709",                     # 석유 및 역청유 (원유)
    "copper": "7403",                  # 정제된 구리 및 구리 합금
    "plastic_3901": "3901",            # 기초 플라스틱 폴리머 (에틸렌)
    "plastic_3902": "3902",            # 기초 플라스틱 폴리머 (프로필렌)
    "plastic_3903": "3903"             # 기초 플라스틱 폴리머 (스티렌)
}

# 품목 그룹 정의 (사용자 편의를 위해)
COMMODITY_GROUPS = {
    "semiconductor": ["semiconductor_8541", "semiconductor_8542"],
    "oil": ["oil"],
    "copper": ["copper"],
    "plastic": ["plastic_3901", "plastic_3902", "plastic_3903"]
}

# 주요 무역 관계 (보고국-파트너국 조합)
MAJOR_TRADE_PAIRS = [
    ("842", "156", "USA", "China"),      # 미국 ← 중국
    ("842", "392", "USA", "Japan"),      # 미국 ← 일본
    ("842", "276", "USA", "Germany"),    # 미국 ← 독일
    ("842", "410", "USA", "Korea"),      # 미국 ← 한국
    ("276", "156", "Germany", "China"),  # 독일 ← 중국
    ("276", "392", "Germany", "Japan"),  # 독일 ← 일본
    ("392", "156", "Japan", "China"),    # 일본 ← 중국
    ("410", "156", "Korea", "China"),    # 한국 ← 중국
    ("410", "392", "Korea", "Japan"),    # 한국 ← 일본
    ("156", "842", "China", "USA"),      # 중국 ← 미국 (역방향)
]

class BulkDataCollector:
    def __init__(self, output_dir="./data/output"):
        self.output_dir = output_dir
        self.country_coords = None
        self.collected_data = []
        self.failed_requests = []
        
        # 출력 디렉터리 생성
        os.makedirs(output_dir, exist_ok=True)
        
        # 로그 파일 설정
        self.log_file = os.path.join(output_dir, f"bulk_collection_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
        
    def log_message(self, message: str, print_console: bool = True):
        """메시지를 로그 파일과 콘솔에 출력"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        
        if print_console:
            print(log_entry)
        
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(log_entry + "\n")
    
    def load_country_coordinates(self):
        """국가별 중심점 데이터 로딩"""
        try:
            self.log_message("국가별 중심점 데이터 로딩 중...")
            world = gpd.read_file(gpd.datasets.get_path('naturalearth_lowres'))
            world['centroid'] = world.geometry.centroid
            world['centroid_lon'] = world['centroid'].x
            world['centroid_lat'] = world['centroid'].y
            
            # 국가 코드 매핑 딕셔너리 생성
            country_coords = {}
            for idx, row in world.iterrows():
                if pd.notna(row['iso_a3']):
                    country_coords[row['iso_a3']] = {
                        'name': row['name'],
                        'lon': row['centroid_lon'],
                        'lat': row['centroid_lat']
                    }
                if pd.notna(row['name']):
                    country_coords[row['name']] = {
                        'name': row['name'],
                        'lon': row['centroid_lon'],
                        'lat': row['centroid_lat']
                    }
            
            # UN Comtrade API 특수 국가명 매핑 추가
            comtrade_mappings = {
                'Rep. of Korea': country_coords.get('South Korea', country_coords.get('Korea')),
                'China, Hong Kong SAR': country_coords.get('Hong Kong'),
                'China, Macao SAR': country_coords.get('Macao'),
                'United States of America': country_coords.get('United States of America'),
                'Russian Federation': country_coords.get('Russia'),
                'United Kingdom': country_coords.get('United Kingdom'),
                'Viet Nam': country_coords.get('Vietnam'),
                'Iran (Islamic Rep. of)': country_coords.get('Iran'),
                'Venezuela (Boliv. Rep. of)': country_coords.get('Venezuela'),
                'Bolivia (Plurin. State of)': country_coords.get('Bolivia'),
                'Tanzania (United Rep. of)': country_coords.get('Tanzania'),
                'Moldova (Rep. of)': country_coords.get('Moldova'),
                'Macedonia (North)': country_coords.get('North Macedonia'),
                'Czechia': country_coords.get('Czech Rep.', country_coords.get('Czech Republic')),
                'Türkiye': country_coords.get('Turkey')
            }
            
            # 매핑 추가 (None이 아닌 경우만)
            for comtrade_name, coords in comtrade_mappings.items():
                if coords:
                    country_coords[comtrade_name] = coords
            
            self.country_coords = country_coords
            self.log_message(f"국가 좌표 데이터 로딩 완료: {len(country_coords)}개 국가 (UN Comtrade 매핑 포함)")
            return True
            
        except Exception as e:
            self.log_message(f"국가 데이터 로딩 실패: {e}")
            return False
    
    def collect_single_data(self, year: int, item: str, reporter_code: str, partner_code: str, 
                           reporter_name: str, partner_name: str) -> Dict:
        """단일 데이터 수집"""
        try:
            self.log_message(f"수집 중: {year}년 {item} {reporter_name}←{partner_name}", print_console=False)
            
            # API 호출
            data = comtradeapicall.getFinalData(
                subscription_key=None,
                typeCode='C',
                freqCode='A',
                clCode='HS',
                period=str(year),
                reporterCode=reporter_code,
                cmdCode=COMMODITY_MAP[item],
                flowCode='M',  # 수입
                partnerCode=partner_code,
                partner2Code='0',
                customsCode='C00',
                motCode='0',
                maxRecords=100,
                format_output='JSON',
                includeDesc=True
            )
            
            if data is not None and isinstance(data, pd.DataFrame) and not data.empty:
                return {
                    'success': True,
                    'data': data,
                    'year': year,
                    'item': item,
                    'reporter_code': reporter_code,
                    'partner_code': partner_code,
                    'reporter_name': reporter_name,
                    'partner_name': partner_name,
                    'records': len(data)
                }
            elif data is not None and isinstance(data, list) and data:
                return {
                    'success': True,
                    'data': pd.DataFrame(data),
                    'year': year,
                    'item': item,
                    'reporter_code': reporter_code,
                    'partner_code': partner_code,
                    'reporter_name': reporter_name,
                    'partner_name': partner_name,
                    'records': len(data)
                }
            else:
                return {
                    'success': False,
                    'error': 'No data returned',
                    'year': year,
                    'item': item,
                    'reporter_name': reporter_name,
                    'partner_name': partner_name
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'year': year,
                'item': item,
                'reporter_name': reporter_name,
                'partner_name': partner_name
            }
    
    def process_to_geojson(self, df: pd.DataFrame, item_name: str, year: int, 
                          reporter_name: str, partner_name: str) -> Dict:
        """데이터를 GeoJSON으로 변환"""
        try:
            features = []
            processed_count = 0
            
            for idx, row in df.iterrows():
                try:
                    # 국가명 추출
                    reporter_desc = row.get('reporterDesc', reporter_name)
                    partner_desc = row.get('partnerDesc', partner_name)
                    
                    # 좌표 찾기
                    reporter_coords = None
                    partner_coords = None
                    
                    # ISO 코드로 찾기
                    if row.get('reporterCodeIsoAlpha3'):
                        reporter_coords = self.country_coords.get(row['reporterCodeIsoAlpha3'])
                    if row.get('PartnerCodeIsoAlpha3'):
                        partner_coords = self.country_coords.get(row['PartnerCodeIsoAlpha3'])
                    
                    # 이름으로 찾기
                    if not reporter_coords:
                        reporter_coords = self.country_coords.get(reporter_desc)
                    if not partner_coords:
                        partner_coords = self.country_coords.get(partner_desc)
                    
                    if reporter_coords and partner_coords:
                        # LineString 생성 (파트너국 -> 보고국)
                        line = LineString([
                            (partner_coords['lon'], partner_coords['lat']),
                            (reporter_coords['lon'], reporter_coords['lat'])
                        ])
                        
                        # 속성 정보
                        properties = {
                            'reporter_name': reporter_desc,
                            'partner_name': partner_desc,
                            'trade_value': float(row.get('primaryValue', 0)),
                            'net_weight': float(row.get('netWgt', 0)) if pd.notna(row.get('netWgt')) else 0,
                            'quantity': float(row.get('qty', 0)) if pd.notna(row.get('qty')) else 0,
                            'item': item_name,
                            'year': year,
                            'flow_direction': f"{partner_desc} → {reporter_desc}"
                        }
                        
                        feature = {
                            'type': 'Feature',
                            'geometry': line.__geo_interface__,
                            'properties': properties
                        }
                        
                        features.append(feature)
                        processed_count += 1
                        
                except Exception as e:
                    continue
            
            geojson = {
                'type': 'FeatureCollection',
                'features': features,
                'metadata': {
                    'item': item_name,
                    'year': year,
                    'reporter': reporter_name,
                    'partner': partner_name,
                    'total_flows': len(features),
                    'processed_records': processed_count,
                    'total_records': len(df),
                    'created_at': datetime.now().isoformat()
                }
            }
            
            return geojson
            
        except Exception as e:
            self.log_message(f"GeoJSON 변환 오류: {e}")
            return None
    
    def save_data(self, result: Dict, geojson: Dict = None):
        """데이터를 파일로 저장"""
        try:
            # 파일명 생성
            base_filename = f"trade_{result['item']}_{result['year']}_{result['reporter_code']}_{result['partner_code']}"
            
            # CSV 저장
            csv_path = os.path.join(self.output_dir, f"{base_filename}.csv")
            result['data'].to_csv(csv_path, index=False, encoding='utf-8-sig')
            
            # GeoJSON 저장
            if geojson:
                geojson_path = os.path.join(self.output_dir, f"{base_filename}.geojson")
                with open(geojson_path, 'w', encoding='utf-8') as f:
                    json.dump(geojson, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception as e:
            self.log_message(f"파일 저장 오류: {e}")
            return False
    
    def collect_bulk_data(self, start_year: int, end_year: int, items: List[str] = None, 
                         trade_pairs: List[Tuple] = None, delay_seconds: float = 1.0):
        """대량 데이터 수집"""
        
        # 기본값 설정 및 품목 그룹 확장
        if items is None:
            items = list(COMMODITY_GROUPS.keys())
        if trade_pairs is None:
            trade_pairs = MAJOR_TRADE_PAIRS
        
        # 품목 그룹을 개별 품목으로 확장
        expanded_items = []
        for item in items:
            if item in COMMODITY_GROUPS:
                expanded_items.extend(COMMODITY_GROUPS[item])
            elif item in COMMODITY_MAP:
                expanded_items.append(item)
            else:
                self.log_message(f"⚠️  알 수 없는 품목: {item}")
        
        items = expanded_items
        
        self.log_message("=== 대량 데이터 수집 시작 ===")
        self.log_message(f"연도 범위: {start_year}-{end_year}")
        self.log_message(f"품목: {', '.join(items)}")
        self.log_message(f"무역 관계: {len(trade_pairs)}개")
        
        # 국가 좌표 로딩
        if not self.load_country_coordinates():
            self.log_message("❌ 국가 좌표 데이터 로딩 실패")
            return False
        
        # 총 작업 수 계산
        total_tasks = len(range(start_year, end_year + 1)) * len(items) * len(trade_pairs)
        self.log_message(f"총 {total_tasks}개 작업 예정")
        
        completed_tasks = 0
        successful_collections = 0
        
        # 연도별 수집
        for year in range(start_year, end_year + 1):
            self.log_message(f"\n📅 {year}년 데이터 수집 시작")
            
            # 품목별 수집
            for item in items:
                self.log_message(f"  📦 {item} 수집 중...")
                
                # 무역 관계별 수집
                for reporter_code, partner_code, reporter_name, partner_name in trade_pairs:
                    completed_tasks += 1
                    
                    # 진행률 표시
                    progress = (completed_tasks / total_tasks) * 100
                    self.log_message(f"    [{completed_tasks}/{total_tasks}] ({progress:.1f}%) {reporter_name}←{partner_name}", print_console=False)
                    
                    # 데이터 수집
                    result = self.collect_single_data(
                        year, item, reporter_code, partner_code, reporter_name, partner_name
                    )
                    
                    if result['success']:
                        # GeoJSON 변환
                        geojson = self.process_to_geojson(
                            result['data'], item, year, reporter_name, partner_name
                        )
                        
                        # 파일 저장
                        if self.save_data(result, geojson):
                            successful_collections += 1
                            self.collected_data.append(result)
                            
                            # 성공 로그
                            trade_value = result['data']['primaryValue'].sum() if 'primaryValue' in result['data'].columns else 0
                            self.log_message(f"      ✅ ${trade_value:,.0f} ({result['records']} 레코드)", print_console=False)
                        else:
                            self.failed_requests.append(result)
                    else:
                        self.failed_requests.append(result)
                        self.log_message(f"      ❌ {result.get('error', 'Unknown error')}", print_console=False)
                    
                    # API 제한을 위한 지연
                    if delay_seconds > 0:
                        time.sleep(delay_seconds)
        
        # 최종 결과 요약
        self.log_message(f"\n🎉 대량 수집 완료!")
        self.log_message(f"   - 총 작업: {total_tasks}")
        self.log_message(f"   - 성공: {successful_collections}")
        self.log_message(f"   - 실패: {len(self.failed_requests)}")
        self.log_message(f"   - 성공률: {(successful_collections/total_tasks)*100:.1f}%")
        
        # 실패 요약
        if self.failed_requests:
            self.log_message(f"\n❌ 실패한 요청들:")
            failure_summary = {}
            for failed in self.failed_requests:
                key = f"{failed['year']}_{failed['item']}"
                if key not in failure_summary:
                    failure_summary[key] = 0
                failure_summary[key] += 1
            
            for key, count in failure_summary.items():
                self.log_message(f"   - {key}: {count}개")
        
        # 수집된 데이터 요약 저장
        self.save_summary()
        
        return successful_collections > 0
    
    def save_summary(self):
        """수집 요약 정보 저장"""
        try:
            summary = {
                'collection_date': datetime.now().isoformat(),
                'total_successful': len(self.collected_data),
                'total_failed': len(self.failed_requests),
                'successful_collections': [],
                'failed_requests': self.failed_requests
            }
            
            # 성공한 수집 요약
            for result in self.collected_data:
                trade_value = result['data']['primaryValue'].sum() if 'primaryValue' in result['data'].columns else 0
                summary['successful_collections'].append({
                    'year': result['year'],
                    'item': result['item'],
                    'reporter': result['reporter_name'],
                    'partner': result['partner_name'],
                    'records': result['records'],
                    'trade_value': float(trade_value)
                })
            
            # 요약 파일 저장
            summary_path = os.path.join(self.output_dir, f"collection_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
            with open(summary_path, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False)
            
            self.log_message(f"📊 수집 요약 저장: {summary_path}")
            
        except Exception as e:
            self.log_message(f"요약 저장 오류: {e}")

def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description="2018-2024년 모든 품목 대량 데이터 수집",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예시:
  python bulk_data_collector.py --start-year 2018 --end-year 2024
  python bulk_data_collector.py --start-year 2020 --end-year 2022 --items semiconductor oil
  python bulk_data_collector.py --start-year 2023 --end-year 2024 --delay 2.0

품목 옵션:
  semiconductor : 반도체 (HS Code: 8541, 8542)
  oil          : 원유 (HS Code: 2709)
  copper       : 구리 (HS Code: 7403)
  plastic      : 플라스틱 (HS Code: 3901, 3902, 3903)

주요 무역 관계:
  미국←중국, 미국←일본, 미국←독일, 미국←한국
  독일←중국, 독일←일본, 일본←중국, 한국←중국, 한국←일본
        """
    )
    
    parser.add_argument("--start-year", type=int, default=2018, help="시작 연도 (기본값: 2018)")
    parser.add_argument("--end-year", type=int, default=2024, help="종료 연도 (기본값: 2024)")
    parser.add_argument("--items", nargs="+", choices=list(COMMODITY_GROUPS.keys()), 
                       default=list(COMMODITY_GROUPS.keys()), help="수집할 품목들")
    parser.add_argument("--delay", type=float, default=1.0, 
                       help="API 요청 간 지연 시간 (초, 기본값: 1.0)")
    parser.add_argument("--output-dir", type=str, default="./data/output",
                       help="출력 디렉터리 (기본값: ./data/output)")
    
    args = parser.parse_args()
    
    # 입력 검증
    if args.start_year > args.end_year:
        print("❌ 시작 연도가 종료 연도보다 클 수 없습니다.")
        sys.exit(1)
    
    if args.end_year > 2024:
        print("⚠️  2024년 이후 데이터는 아직 제공되지 않을 수 있습니다.")
    
    # 대량 수집기 실행
    collector = BulkDataCollector(args.output_dir)
    
    success = collector.collect_bulk_data(
        start_year=args.start_year,
        end_year=args.end_year,
        items=args.items,
        delay_seconds=args.delay
    )
    
    if success:
        print(f"\n🎉 대량 데이터 수집이 완료되었습니다!")
        print(f"📁 결과 파일: {args.output_dir}")
        print(f"📋 로그 파일: {collector.log_file}")
        sys.exit(0)
    else:
        print(f"\n❌ 대량 데이터 수집에 실패했습니다.")
        sys.exit(1)

if __name__ == "__main__":
    main()
