#!/usr/bin/env python3
"""
실제 작동하는 UN Comtrade 데이터 수집기

이 스크립트는 comtradeapicall 패키지를 사용하여 UN Comtrade 데이터를 수집하고
지도 시각화에 적합한 GeoJSON 형태로 변환합니다.

사용법:
    python working_data_collector.py --year 2020 --item oil --reporter 842 --partner 156
    python working_data_collector.py --year 2019 --item semiconductor --reporter all --partner all
"""

import comtradeapicall
import pandas as pd
import geopandas as gpd
from shapely.geometry import LineString
import json
import os
import sys
import argparse
from datetime import datetime

# 품목별 HS Code 정의 (GUIDE.md 기준)
COMMODITY_MAP = {
    "semiconductor": "8541,8542",      # 다이오드, 트랜지스터, 집적회로
    "oil": "2709",                     # 석유 및 역청유 (원유)
    "copper": "7403",                  # 정제된 구리 및 구리 합금
    "plastic": "3901,3902,3903"        # 기초 플라스틱 폴리머
}

# 주요 국가 코드
COUNTRY_MAP = {
    "usa": "842",
    "china": "156", 
    "japan": "392",
    "germany": "276",
    "korea": "410",
    "all": "all"
}

def log_message(message):
    """메시지를 출력하고 로그"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def get_country_centroids():
    """국가별 중심점 데이터 준비"""
    try:
        log_message("국가별 중심점 데이터 로딩 중...")
        world = gpd.read_file(gpd.datasets.get_path('naturalearth_lowres'))
        world['centroid'] = world.geometry.centroid
        world['centroid_lon'] = world['centroid'].x
        world['centroid_lat'] = world['centroid'].y
        
        # 국가 코드 매핑을 위한 딕셔너리 생성
        country_coords = {}
        for idx, row in world.iterrows():
            # ISO 코드와 이름으로 매핑
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
        
        log_message(f"총 {len(country_coords)}개 국가 좌표 준비 완료")
        return country_coords
        
    except Exception as e:
        log_message(f"국가 데이터 로딩 실패: {e}")
        return None

def collect_trade_data(year, item, reporter_code, partner_code):
    """UN Comtrade에서 무역 데이터 수집"""
    try:
        log_message(f"{year}년 {item} 데이터 수집 시작 (보고국: {reporter_code}, 파트너: {partner_code})")
        
        if item not in COMMODITY_MAP:
            log_message(f"오류: 유효하지 않은 품목 '{item}'")
            return None
        
        # 데이터 요청
        data = comtradeapicall.getFinalData(
            subscription_key=None,
            typeCode='C',               # 상품
            freqCode='A',               # 연간
            clCode='HS',                # HS 분류
            period=str(year),           # 연도
            reporterCode=reporter_code, # 보고국
            cmdCode=COMMODITY_MAP[item], # 상품 코드
            flowCode='M',               # 수입 (Import)
            partnerCode=partner_code,   # 파트너국
            partner2Code='0',           # 2차 파트너 없음
            customsCode='C00',          # 기본 관세 코드
            motCode='0',                # 운송 모드 없음
            maxRecords=1000,            # 최대 1000개 레코드
            format_output='JSON',
            includeDesc=True
        )
        
        if data is not None and isinstance(data, pd.DataFrame) and not data.empty:
            log_message(f"데이터 수집 성공: {len(data)} 레코드")
            return data
        elif data is not None and isinstance(data, list) and data:
            log_message(f"데이터 수집 성공: {len(data)} 레코드 (리스트 형태)")
            return pd.DataFrame(data)
        else:
            log_message("수집된 데이터가 없습니다.")
            return None
            
    except Exception as e:
        log_message(f"데이터 수집 오류: {e}")
        import traceback
        traceback.print_exc()
        return None

def process_to_geojson(df, country_coords, item_name, year):
    """데이터를 GeoJSON으로 변환"""
    try:
        log_message("GeoJSON 변환 시작...")
        
        features = []
        processed_count = 0
        
        for idx, row in df.iterrows():
            try:
                # 보고국과 파트너국 정보 추출
                reporter_name = row.get('reporterDesc', 'Unknown')
                partner_name = row.get('partnerDesc', 'Unknown')
                
                # 좌표 찾기 (여러 방법 시도)
                reporter_coords = None
                partner_coords = None
                
                # ISO 코드로 찾기
                if row.get('reporterCodeIsoAlpha3'):
                    reporter_coords = country_coords.get(row['reporterCodeIsoAlpha3'])
                if row.get('PartnerCodeIsoAlpha3'):
                    partner_coords = country_coords.get(row['PartnerCodeIsoAlpha3'])
                
                # 이름으로 찾기 (ISO 코드가 없을 경우)
                if not reporter_coords:
                    reporter_coords = country_coords.get(reporter_name)
                if not partner_coords:
                    partner_coords = country_coords.get(partner_name)
                
                # 좌표가 모두 있는 경우에만 처리
                if reporter_coords and partner_coords:
                    # LineString 생성 (파트너국 -> 보고국, 즉 수출국 -> 수입국)
                    line = LineString([
                        (partner_coords['lon'], partner_coords['lat']),    # 수출국
                        (reporter_coords['lon'], reporter_coords['lat'])   # 수입국
                    ])
                    
                    # 속성 정보
                    properties = {
                        'reporter_name': reporter_name,
                        'partner_name': partner_name,
                        'trade_value': float(row.get('primaryValue', 0)),
                        'net_weight': float(row.get('netWgt', 0)) if pd.notna(row.get('netWgt')) else 0,
                        'quantity': float(row.get('qty', 0)) if pd.notna(row.get('qty')) else 0,
                        'item': item_name,
                        'year': year,
                        'flow_direction': f"{partner_name} → {reporter_name}"
                    }
                    
                    feature = {
                        'type': 'Feature',
                        'geometry': line.__geo_interface__,
                        'properties': properties
                    }
                    
                    features.append(feature)
                    processed_count += 1
                    
            except Exception as e:
                log_message(f"레코드 처리 오류 (인덱스 {idx}): {e}")
                continue
        
        geojson = {
            'type': 'FeatureCollection',
            'features': features,
            'metadata': {
                'item': item_name,
                'year': year,
                'total_flows': len(features),
                'processed_records': processed_count,
                'total_records': len(df),
                'created_at': datetime.now().isoformat()
            }
        }
        
        log_message(f"GeoJSON 생성 완료: {len(features)}개 무역 흐름")
        return geojson
        
    except Exception as e:
        log_message(f"GeoJSON 변환 오류: {e}")
        import traceback
        traceback.print_exc()
        return None

def save_data(df, geojson, item_name, year, reporter, partner):
    """데이터를 파일로 저장"""
    try:
        # 출력 디렉터리 확인
        output_dir = "./data/output"
        os.makedirs(output_dir, exist_ok=True)
        
        # 파일명 생성
        base_filename = f"trade_{item_name}_{year}_{reporter}_{partner}"
        
        # CSV 저장
        csv_path = os.path.join(output_dir, f"{base_filename}.csv")
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        log_message(f"CSV 파일 저장: {csv_path}")
        
        # GeoJSON 저장
        if geojson:
            geojson_path = os.path.join(output_dir, f"{base_filename}.geojson")
            with open(geojson_path, 'w', encoding='utf-8') as f:
                json.dump(geojson, f, indent=2, ensure_ascii=False)
            log_message(f"GeoJSON 파일 저장: {geojson_path}")
        
        return True
        
    except Exception as e:
        log_message(f"파일 저장 오류: {e}")
        return False

def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description="UN Comtrade 데이터 수집 및 GeoJSON 변환",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예시:
  python working_data_collector.py --year 2020 --item oil --reporter 842 --partner 156
  python working_data_collector.py --year 2019 --item semiconductor --reporter all --partner all

품목 옵션:
  semiconductor : 반도체 (HS Code: 8541)
  oil          : 원유 (HS Code: 2709)
  copper       : 구리 (HS Code: 7403)
  plastic      : 플라스틱 (HS Code: 3901)

국가 코드:
  842 : 미국     156 : 중국     392 : 일본
  276 : 독일     410 : 한국     all : 모든 국가
        """
    )
    
    parser.add_argument("--year", type=int, required=True, help="데이터 연도")
    parser.add_argument("--item", type=str, required=True, 
                       choices=list(COMMODITY_MAP.keys()), help="품목")
    parser.add_argument("--reporter", type=str, required=True, 
                       help="보고국 코드 (예: 842, all)")
    parser.add_argument("--partner", type=str, required=True,
                       help="파트너국 코드 (예: 156, all)")
    
    args = parser.parse_args()
    
    log_message("=== UN Comtrade 데이터 수집 시작 ===")
    log_message(f"연도: {args.year}, 품목: {args.item}, 보고국: {args.reporter}, 파트너: {args.partner}")
    
    # 1. 국가 좌표 데이터 준비
    country_coords = get_country_centroids()
    if not country_coords:
        log_message("❌ 국가 좌표 데이터 로딩 실패")
        sys.exit(1)
    
    # 2. 무역 데이터 수집
    trade_data = collect_trade_data(args.year, args.item, args.reporter, args.partner)
    if trade_data is None or trade_data.empty:
        log_message("❌ 무역 데이터 수집 실패")
        sys.exit(1)
    
    # 3. GeoJSON 변환
    geojson = process_to_geojson(trade_data, country_coords, args.item, args.year)
    
    # 4. 데이터 저장
    success = save_data(trade_data, geojson, args.item, args.year, args.reporter, args.partner)
    
    if success:
        log_message("✅ 데이터 수집 및 저장 완료!")
        
        # 요약 정보 출력
        log_message(f"📊 요약:")
        log_message(f"   - 총 레코드: {len(trade_data)}")
        if geojson:
            log_message(f"   - 지도 표시 가능한 무역 흐름: {len(geojson['features'])}")
        if 'primaryValue' in trade_data.columns:
            total_value = trade_data['primaryValue'].sum()
            log_message(f"   - 총 무역액: ${total_value:,.0f}")
        
        sys.exit(0)
    else:
        log_message("❌ 파일 저장 실패")
        sys.exit(1)

if __name__ == "__main__":
    main()
