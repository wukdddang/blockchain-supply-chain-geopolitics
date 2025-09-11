#!/usr/bin/env python3
"""
UN Comtrade 데이터를 처리하여 GeoJSON으로 저장하는 스크립트

이 스크립트는 UN Comtrade API를 통해 무역 데이터를 가져와서
지도에서 시각화할 수 있는 GeoJSON 형태로 변환합니다.

사용법:
    python process_trade_data.py --year 2023 --item semiconductor
    python process_trade_data.py --year 2019 --item oil
"""

import pandas as pd
import requests
import geopandas as gpd
from shapely.geometry import LineString, Point
import json
import time
import argparse
import os
import sys
from typing import Dict, List, Optional, Tuple

# --- 품목별 HS Code 정의 ---
COMMODITY_MAP = {
    "semiconductor": "8541,8542",
    "oil": "2709", 
    "copper": "7403",
    "plastic": "3901,3902,3903"
}

# --- 설정 ---
OUTPUT_DIR = "./data/output"
API_ENDPOINT = "https://comtradeapi.un.org/public/v1/get"

def ensure_output_directory():
    """출력 디렉터리가 존재하는지 확인하고, 없으면 생성"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"출력 디렉터리 확인됨: {OUTPUT_DIR}")

def get_country_centroids() -> gpd.GeoDataFrame:
    """국가별 중심점 데이터를 준비"""
    try:
        print("국가별 중심점 데이터 로딩 중...")
        world = gpd.read_file(gpd.datasets.get_path('naturalearth_lowres'))
        world['centroid'] = world.geometry.centroid
        
        # 좌표 추출
        world['centroid_lon'] = world['centroid'].x
        world['centroid_lat'] = world['centroid'].y
        
        country_centroids = world[['iso_a3', 'name', 'centroid_lon', 'centroid_lat']].copy()
        print(f"총 {len(country_centroids)}개 국가 데이터 로딩 완료")
        return country_centroids
    except Exception as e:
        print(f"국가 데이터 로딩 실패: {e}")
        return None

def fetch_trade_data(year: int, commodity_code: str) -> Optional[pd.DataFrame]:
    """UN Comtrade API에서 무역 데이터 가져오기"""
    params = {
        "r": "all",        # 모든 보고 국가
        "p": "all",        # 모든 파트너 국가
        "freq": "A",       # 연간 데이터
        "ps": str(year),   # 기간 (연도)
        "px": "HS",        # 분류 체계
        "cc": commodity_code,  # 상품 코드
        "rg": "1",         # 무역 흐름 (1=수입, 2=수출)
        "type": "C",       # 상품
        "fmt": "json",     # JSON 형식
        "max": "100000"    # 최대 레코드 수
    }
    
    try:
        print(f"UN Comtrade API 호출 중... (연도: {year}, 상품코드: {commodity_code})")
        response = requests.get(API_ENDPOINT, params=params, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        if 'data' not in data or not data['data']:
            print(f"경고: {year}년 상품코드 {commodity_code}에 대한 데이터가 없습니다.")
            return None
            
        df = pd.DataFrame(data['data'])
        print(f"API로부터 {len(df)}개 레코드 수신 완료")
        return df
        
    except requests.exceptions.RequestException as e:
        print(f"API 요청 실패: {e}")
        return None
    except Exception as e:
        print(f"데이터 처리 중 오류: {e}")
        return None

def process_trade_data(df: pd.DataFrame, country_centroids: gpd.GeoDataFrame) -> pd.DataFrame:
    """무역 데이터 전처리 및 지리 정보 결합"""
    try:
        print("무역 데이터 전처리 시작...")
        
        # 필요한 컬럼만 선택하고 이름 변경
        columns_to_keep = {
            'rtCode': 'reporter_code',
            'rtTitle': 'reporter_name', 
            'ptCode': 'partner_code',
            'ptTitle': 'partner_name',
            'TradeValue': 'trade_value',
            'NetWeight': 'net_weight',
            'TradeQuantity': 'trade_quantity'
        }
        
        # 컬럼이 존재하는지 확인
        available_columns = {}
        for old_col, new_col in columns_to_keep.items():
            if old_col in df.columns:
                available_columns[old_col] = new_col
        
        if not available_columns:
            print("필요한 컬럼을 찾을 수 없습니다.")
            return None
            
        df_processed = df[list(available_columns.keys())].copy()
        df_processed = df_processed.rename(columns=available_columns)
        
        # 무효한 데이터 제거
        if 'trade_value' in df_processed.columns:
            df_processed = df_processed[df_processed['trade_value'] > 0]
        
        # 국가 코드를 문자열로 변환
        if 'reporter_code' in df_processed.columns:
            df_processed['reporter_code'] = df_processed['reporter_code'].astype(str)
        if 'partner_code' in df_processed.columns:
            df_processed['partner_code'] = df_processed['partner_code'].astype(str)
        
        print(f"전처리 후 {len(df_processed)}개 레코드 남음")
        
        # 국가 중심점 데이터와 결합
        print("국가 중심점 데이터와 결합 중...")
        
        # Reporter 국가 정보 결합
        df_with_coords = df_processed.merge(
            country_centroids[['name', 'centroid_lon', 'centroid_lat']], 
            left_on='reporter_name', 
            right_on='name', 
            how='left',
            suffixes=('', '_reporter')
        )
        df_with_coords = df_with_coords.rename(columns={
            'centroid_lon': 'reporter_lon',
            'centroid_lat': 'reporter_lat'
        })
        df_with_coords = df_with_coords.drop(columns=['name'], errors='ignore')
        
        # Partner 국가 정보 결합
        df_with_coords = df_with_coords.merge(
            country_centroids[['name', 'centroid_lon', 'centroid_lat']], 
            left_on='partner_name', 
            right_on='name', 
            how='left',
            suffixes=('', '_partner')
        )
        df_with_coords = df_with_coords.rename(columns={
            'centroid_lon': 'partner_lon',
            'centroid_lat': 'partner_lat'
        })
        df_with_coords = df_with_coords.drop(columns=['name'], errors='ignore')
        
        # 좌표가 없는 레코드 제거
        df_final = df_with_coords.dropna(subset=['reporter_lon', 'reporter_lat', 'partner_lon', 'partner_lat'])
        
        print(f"좌표 결합 후 {len(df_final)}개 레코드 남음")
        return df_final
        
    except Exception as e:
        print(f"데이터 전처리 중 오류: {e}")
        return None

def create_geojson(df: pd.DataFrame, item_name: str, year: int) -> Dict:
    """GeoJSON 형태로 변환"""
    try:
        print("GeoJSON 생성 중...")
        
        features = []
        
        for idx, row in df.iterrows():
            # LineString 생성 (수출국 -> 수입국)
            line = LineString([
                (row['partner_lon'], row['partner_lat']),  # 수출국 (partner)
                (row['reporter_lon'], row['reporter_lat'])  # 수입국 (reporter)
            ])
            
            # 속성 정보
            properties = {
                'reporter_name': row.get('reporter_name', 'Unknown'),
                'partner_name': row.get('partner_name', 'Unknown'),
                'trade_value': float(row.get('trade_value', 0)),
                'item': item_name,
                'year': year
            }
            
            # 추가 속성이 있으면 포함
            if 'net_weight' in row and pd.notna(row['net_weight']):
                properties['net_weight'] = float(row['net_weight'])
            if 'trade_quantity' in row and pd.notna(row['trade_quantity']):
                properties['trade_quantity'] = float(row['trade_quantity'])
            
            feature = {
                'type': 'Feature',
                'geometry': line.__geo_interface__,
                'properties': properties
            }
            
            features.append(feature)
        
        geojson = {
            'type': 'FeatureCollection',
            'features': features,
            'metadata': {
                'item': item_name,
                'year': year,
                'total_flows': len(features),
                'created_at': pd.Timestamp.now().isoformat()
            }
        }
        
        print(f"GeoJSON 생성 완료: {len(features)}개 무역 흐름")
        return geojson
        
    except Exception as e:
        print(f"GeoJSON 생성 중 오류: {e}")
        return None

def save_geojson(geojson: Dict, item_name: str, year: int) -> str:
    """GeoJSON을 파일로 저장"""
    try:
        filename = f"trade_flow_{item_name}_{year}.geojson"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, indent=2, ensure_ascii=False)
        
        print(f"GeoJSON 파일 저장 완료: {filepath}")
        return filepath
        
    except Exception as e:
        print(f"파일 저장 중 오류: {e}")
        return None

def fetch_and_process_data(year: int, item_name: str) -> bool:
    """메인 처리 함수"""
    print(f"\n{'='*50}")
    print(f"  {year}년 {item_name} 데이터 처리 시작")
    print(f"{'='*50}")
    
    # 입력 검증
    if item_name not in COMMODITY_MAP:
        print(f"오류: '{item_name}'은(는) 유효한 품목이 아닙니다.")
        print(f"사용 가능한 품목: {list(COMMODITY_MAP.keys())}")
        return False
    
    # 출력 디렉터리 확인
    ensure_output_directory()
    
    # 국가 중심점 데이터 준비
    country_centroids = get_country_centroids()
    if country_centroids is None:
        print("국가 데이터를 로딩할 수 없습니다.")
        return False
    
    # UN Comtrade API에서 데이터 가져오기
    commodity_code = COMMODITY_MAP[item_name]
    trade_data = fetch_trade_data(year, commodity_code)
    if trade_data is None or trade_data.empty:
        print("무역 데이터를 가져올 수 없습니다.")
        return False
    
    # 데이터 전처리
    processed_data = process_trade_data(trade_data, country_centroids)
    if processed_data is None or processed_data.empty:
        print("데이터 전처리에 실패했습니다.")
        return False
    
    # GeoJSON 생성
    geojson = create_geojson(processed_data, item_name, year)
    if geojson is None:
        print("GeoJSON 생성에 실패했습니다.")
        return False
    
    # 파일 저장
    filepath = save_geojson(geojson, item_name, year)
    if filepath is None:
        print("파일 저장에 실패했습니다.")
        return False
    
    print(f"\n✅ 처리 완료!")
    print(f"   - 파일: {filepath}")
    print(f"   - 무역 흐름 수: {len(geojson['features'])}")
    
    return True

def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description="UN Comtrade 데이터를 처리하여 GeoJSON으로 저장합니다.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예시:
  python process_trade_data.py --year 2023 --item semiconductor
  python process_trade_data.py --year 2019 --item oil
  python process_trade_data.py --year 2022 --item copper
  python process_trade_data.py --year 2021 --item plastic

품목 옵션:
  semiconductor : 반도체 (HS Code: 8541,8542)
  oil          : 원유 (HS Code: 2709)  
  copper       : 구리 (HS Code: 7403)
  plastic      : 플라스틱 (HS Code: 3901,3902,3903)
        """
    )
    
    parser.add_argument(
        "--year", 
        type=int, 
        required=True, 
        help="데이터를 조회할 연도 (예: 2023)"
    )
    
    parser.add_argument(
        "--item", 
        type=str, 
        required=True, 
        choices=list(COMMODITY_MAP.keys()), 
        help="데이터를 조회할 품목"
    )
    
    args = parser.parse_args()
    
    # 처리 실행
    success = fetch_and_process_data(args.year, args.item)
    
    if success:
        print(f"\n🎉 성공적으로 완료되었습니다!")
        sys.exit(0)
    else:
        print(f"\n❌ 처리 중 오류가 발생했습니다.")
        sys.exit(1)

if __name__ == "__main__":
    main()
