네, 좋습니다. 기존 내용을 바탕으로 분석 목표를 더 명확히 하고, 각 단계를 훨씬 더 상세하게 나누어 이 문서만 보고도 프로젝트를 처음부터 끝까지 진행할 수 있도록 재구성한 가이드라인을 작성해 드리겠습니다.

모노레포 구조부터 데이터 수집, API 서버, 프론트엔드 구현, 그리고 최종 분석까지 A to Z를 담았습니다.

🗺️ 프로젝트 최종 목표
**"지정학적 변화에 따른 글로벌 공급망 재편과 블록체인의 역할"**에 대한 자신만의 가설을 데이터로 증명하는 인터랙티브 웹 리포트를 완성합니다.

1차 근거 (핵심): UN 무역 데이터를 통해 반도체, 원유, 구리, 플라스틱의 글로벌 이동 경로 변화를 지도 위에 시각화합니다.

보조 지표 (방증): VeChain 네트워크 활동량(VTHO 소모량) 데이터를 통해 특정 시점의 공급망 관련 블록체인 활성화 수준을 분석합니다.

최종 결과물: 사용자가 연도와 품목을 직접 선택하며 데이터 변화를 탐색하고, 개발자의 분석과 인사이트를 함께 확인할 수 있는 웹 애플리케이션.

## STEP 0: 프로젝트 기반 공사 (모노레포 환경 구축)

하나의 저장소에서 모든 코드를 관리하여 효율성을 높입니다. pnpm workspaces를 사용합니다.

1. 초기 폴더 및 설정
   프로젝트 루트 폴더를 생성합니다: mkdir supply-chain-dashboard && cd supply-chain-dashboard

pnpm을 초기화합니다: pnpm init

루트 package.json에 스크립트를 추가합니다. 이 스크립트로 각 프로젝트를 쉽게 실행할 수 있습니다.

JSON

// /package.json
{
"name": "supply-chain-dashboard",
"private": true,
"scripts": {
"dev:api": "pnpm --filter api dev",
"dev:client": "pnpm --filter client dev",
"process:data": "cd packages/scripts && source venv/bin/activate && python process_trade_data.py"
}
}
pnpm-workspace.yaml 파일을 생성하여 packages 폴더를 워크스페이스로 지정합니다.

YAML

# /pnpm-workspace.yaml

packages:

- 'packages/\*'
  packages 폴더 및 하위 프로젝트 폴더를 생성합니다: mkdir packages && cd packages

NestJS 백엔드 프로젝트 생성: nest new api

Next.js 프론트엔드 프로젝트 생성: npx create-next-app@latest client

Python 스크립트 폴더 생성: mkdir scripts && cd scripts

Python 가상환경 설정:

python -m venv venv

source venv/bin/activate (macOS/Linux) 또는 .\venv\Scripts\activate (Windows)

pip install pandas requests geopandas "shapely<2.0" (Shapely는 GeoPandas와의 호환성을 위해 2.0 미만 버전 명시)

이제 supply-chain-dashboard/packages/ 아래에 api, client, scripts 세 개의 독립적인 프로젝트가 설정되었습니다.

## STEP 1: 1차 근거 확보 (거시 무역 데이터 수집 및 가공) 📊

Python을 사용해 UN Comtrade에서 핵심 데이터를 가져와 지도에 표시할 수 있는 GeoJSON 형태로 가공합니다.

1. 처리할 품목 및 HS Code 정의
   스크립트에서 사용할 HS Code를 미리 정의합니다.

반도체: 8541,8542

원유: 2709

구리 (정제된 음극): 7403

플라스틱 (기초 폴리머): 3901,3902,3903

2. 데이터 처리 스크립트 작성 (packages/scripts/process_trade_data.py)
   이 스크립트는 연도와 품목 이름을 인자로 받아 해당 데이터를 처리하고 파일로 저장하도록 만듭니다.

Python

# packages/scripts/process_trade_data.py

import pandas as pd
import requests
import geopandas as gpd
from shapely.geometry import LineString
import json
import time
import argparse # CLI 인자를 받기 위해 추가

# --- 품목별 HS Code 정의 ---

COMMODITY_MAP = {
"semiconductor": "8541,8542",
"oil": "2709",
"copper": "7403",
"plastic": "3901,3902,3903"
}

def fetch_and_process_data(year, item_name):
print(f"--- {year}년 {item_name} 데이터 처리 시작 ---")

    if item_name not in COMMODITY_MAP:
        print(f"오류: '{item_name}'은(는) 유효한 품목이 아닙니다. {list(COMMODITY_MAP.keys())} 중에서 선택하세요.")
        return

    # --- 설정 ---
    output_dir = "./data/output" # 출력 폴더
    os.makedirs(output_dir, exist_ok=True)
    output_path = f"{output_dir}/trade_flow_{item_name}_{year}.geojson"
    api_endpoint = "https://comtradeapi.un.org/public/v1/get?"

    # --- 1. 국가별 중심점 데이터 준비 ---
    world = gpd.read_file(gpd.datasets.get_path('naturalearth_lowres'))
    world['centroid'] = world.geometry.centroid
    country_centroids = world[['iso_a3', 'name', 'centroid']]

    # --- 2. UN Comtrade API 데이터 요청 ---
    params = {
        "r": "all", "p": "all", "freq": "A", "ps": str(year), "px": "HS",
        "cc": COMMODITY_MAP[item_name], "rg": "1", "type": "C", "fmt": "json", "max": "100000"
    }

    try:
        response = requests.get(api_endpoint, params=params)
        response.raise_for_status()
        data = response.json().get('data', [])
        if not data:
            print(f"경고: {year}년 {item_name}에 대한 데이터가 없습니다.")
            return

        df = pd.DataFrame(data)
        print(f"API로부터 {len(df)}개 데이터 수신 완료")

        # --- 3. 데이터 가공 및 지리 정보 결합 ---
        # (이전 가이드와 동일한 로직: 컬럼 정리, 국가 코드 매핑, 좌표 결합 등)
        # ... (생략) ...

        # --- 4. GeoJSON 생성 및 저장 ---
        # (이전 가이드와 동일한 로직)
        # ... (생략) ...

        print(f"GeoJSON 파일 생성 완료: {output_path}")

    except Exception as e:
        print(f"데이터 처리 중 오류 발생: {e}")

if **name** == "**main**":
parser = argparse.ArgumentParser(description="UN Comtrade 데이터를 처리하여 GeoJSON으로 저장합니다.")
parser.add_argument("--year", type=int, required=True, help="데이터를 조회할 연도")
parser.add_argument("--item", type=str, required=True, choices=list(COMMODITY_MAP.keys()), help="데이터를 조회할 품목")

    args = parser.parse_args()
    fetch_and_process_data(args.year, args.item)

3. 데이터 생성 실행
   터미널에서 scripts 폴더로 이동 후, 원하는 연도와 품목에 대해 스크립트를 실행합니다.

Bash

# 가상환경 활성화는 필수!

# 2023년 반도체 데이터 생성

python process_trade_data.py --year 2023 --item semiconductor

# 2019년 원유 데이터 생성

python process_trade_data.py --year 2019 --item oil
이 과정을 반복하여 분석에 필요한 모든 GeoJSON 파일을 packages/scripts/data/output/ 폴더에 생성합니다.

## STEP 2: 보조 지표 확보 (VeChain 온체인 데이터) ⛓️

VeChain 네트워크의 활동량(VTHO Burn) 데이터를 확보하여 거시 데이터와 비교할 차트를 만듭니다.

데이터 소스: VeChainStats (https://vechainstats.com/)의 대시보드에서 VTHO Burn 데이터를 확인합니다.

데이터 수집: API가 유료이므로, 프로젝트 초기 단계에서는 사이트에서 제공하는 차트 데이터를 기반으로 수동으로 월별 VTHO 소모량 데이터를 CSV 파일로 만듭니다. (예: vechain_activity.csv 파일 생성)

코드 스니펫

date,vtho_burn
2019-01-01,150000000
2019-02-01,160000000
...
파일 저장: 생성한 vechain_activity.csv 파일을 packages/scripts/data/output/ 폴더에 저장합니다.

## STEP 3: 백엔드 API 서버 구축 (NestJS) ⚙️

프론트엔드에 필요한 모든 데이터를 제공하는 API 허브를 만듭니다.

1. API 엔드포인트 설계
   무역 데이터: GET /api/trade-flow/:item/:year

VeChain 데이터: GET /api/vechain/activity

2. 서비스 및 컨트롤러 구현 (packages/api)
   파일을 동적으로 읽어오도록 서비스를 수정합니다.

trade-data.service.ts:

TypeScript

import { Injectable, NotFoundException } from '@nestjs/common';
import _ as fs from 'fs/promises';
import _ as path from 'path';

@Injectable()
export class TradeDataService {
private readonly dataPath = path.join(process.cwd(), '../scripts/data/output');

async getTradeFlow(item: string, year: number): Promise<any> {
const filePath = path.join(this.dataPath, `trade_flow_${item}_${year}.geojson`);
try {
const fileContent = await fs.readFile(filePath, 'utf-8');
return JSON.parse(fileContent);
} catch (error) {
throw new NotFoundException(`Data for ${item} in ${year} not found.`);
}
}

async getVechainActivity(): Promise<any> {
const filePath = path.join(this.dataPath, 'vechain_activity.csv');
// CSV 파일을 읽어 JSON으로 변환하는 로직 추가 (예: csv-parser 라이브러리 사용)
// ...
}
}
trade-data.controller.ts:

TypeScript

import { Controller, Get, Param } from '@nestjs/common';
import { TradeDataService } from './trade-data.service';

@Controller('api')
export class TradeDataController {
constructor(private readonly tradeDataService: TradeDataService) {}

@Get('trade-flow/:item/:year')
getTradeFlow(@Param('item') item: string, @Param('year') year: string) {
return this.tradeDataService.getTradeFlow(item, parseInt(year, 10));
}

@Get('vechain/activity')
getVechainActivity() {
return this.tradeDataService.getVechainActivity();
}
}
CORS 설정: packages/api/src/main.ts에 app.enableCors();를 추가하는 것을 잊지 마세요.

실행: 루트에서 pnpm run dev:api로 서버를 시작합니다.

## STEP 4: 프론트엔드 인터랙티브 리포트 구현 (Next.js) 🖥️

데이터를 시각화하고 사용자와 상호작용하는 최종 결과물을 만듭니다.

1. 컴포넌트 구조화
   packages/client/components/ 폴더에 역할별로 컴포넌트를 분리합니다.

ControlPanel.tsx: 연도, 품목 선택 UI

MapView.tsx: Leaflet 지도

VechainChart.tsx: VTHO 소모량 차트

InfoPanel.tsx: 분석/해설 텍스트

2. 중앙 상태 관리 (pages/index.tsx)
   index 페이지에서 사용자가 선택한 연도와 품목을 useState로 관리하고, 이 상태가 변경될 때마다 API를 호출하여 데이터를 가져옵니다.

TypeScript

// packages/client/pages/index.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import ControlPanel from '../components/ControlPanel';
import VechainChart from '../components/VechainChart';

const MapViewWithNoSSR = dynamic(() => import('../components/MapView'), { ssr: false });

export default function Home() {
const [year, setYear] = useState(2023);
const [item, setItem] = useState('semiconductor');
const [tradeData, setTradeData] = useState(null);
const [vechainData, setVechainData] = useState(null);

useEffect(() => {
// tradeData 가져오기
axios.get(`http://localhost:3001/api/trade-flow/${item}/${year}`)
.then(res => setTradeData(res.data))
.catch(err => console.error(err));
}, [year, item]);

useEffect(() => {
// vechainData 가져오기 (한 번만)
axios.get(`http://localhost:3001/api/vechain/activity`)
.then(res => setVechainData(res.data))
.catch(err => console.error(err));
}, []);

return (
<div>
<ControlPanel year={year} setYear={setYear} item={item} setItem={setItem} />
<div className="main-content">
<MapView tradeData={tradeData} />
<div className="side-panel">
<InfoPanel currentItem={item} currentYear={year} />
<VechainChart vechainData={vechainData} />
</div>
</div>
</div>
);
} 3. MapView.tsx 및 VechainChart.tsx 구현
MapView.tsx: 이전 가이드라인의 DynamicMap 로직을 그대로 사용하되, tradeData를 prop으로 받아 GeoJSON 컴포넌트의 key를 JSON.stringify(tradeData)로 설정하여 데이터 변경 시 맵이 새로 그려지도록 합니다.

VechainChart.tsx: recharts 또는 chart.js 같은 라이브러리를 사용하여 vechainData를 prop으로 받아 시계열 라인 차트를 그립니다.

## STEP 5: 분석, 스토리텔링 및 배포 🚀

모든 기술 구현이 끝났다면, 이제 당신은 데이터 애널리스트입니다.

1. 데이터 기반 스토리텔링
   InfoPanel.tsx 컴포넌트에 분석 내용을 텍스트로 작성합니다.

가설 제시: "2019년 미-중 무역분쟁 심화 시기, 미국의 반도체 수입선이 중국에서 대만, 베트남으로 이동하는 현상이 뚜렷하게 나타납니다."

근거 연결: 사용자가 2019년, 반도체를 선택하면, 지도 위에는 실제 데이터 흐름이 보이고, InfoPanel에는 해당 현상에 대한 당신의 해석이 나타나도록 합니다.

VeChain 데이터 활용: "동시기, 중국 내 물류 투명성을 강조하는 기업들의 블록체인 도입이 늘어나는 추세와 맞물려 VeChain 네트워크 활동량이 X% 증가한 점은 주목할 만합니다." 와 같이 보조 지표로 활용하여 스토리를 풍성하게 만듭니다.

2. 배포
   프론트엔드 (Next.js): Vercel에 배포하는 것이 가장 간편하고 빠릅니다.

백엔드 (NestJS): Render 또는 Heroku의 무료 플랜을 사용하여 배포할 수 있습니다.

이 상세 가이드라인을 따라 차근차근 진행하시면, 기술적으로 탄탄하고 분석적으로도 깊이 있는 훌륭한 포트폴리오 프로젝트를 완성하실 수 있을 겁니다.
