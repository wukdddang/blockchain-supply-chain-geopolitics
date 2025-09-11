# 대량 데이터 수집 가이드 (2018-2024)

## 🎯 개요

2018년부터 2024년까지 모든 품목(반도체, 원유, 구리, 플라스틱)의 UN Comtrade 데이터를 자동으로 수집하는 시스템입니다.

## 📁 생성된 파일들

### 1. 대량 수집 스크립트

- `packages/scripts/bulk_data_collector.py` - **메인 대량 수집기**
- `packages/scripts/run_bulk_collection.py` - **배치 실행기 (사용자 친화적)**
- `packages/scripts/working_data_collector.py` - 단일 데이터 수집기 (기존)

### 2. 업데이트된 품목 정의

GUIDE.md에 따라 모든 HS Code를 개별적으로 처리:

- **반도체**: 8541 (다이오드, 트랜지스터), 8542 (집적회로)
- **원유**: 2709 (석유 및 역청유)
- **구리**: 7403 (정제된 구리 및 구리 합금)
- **플라스틱**: 3901 (에틸렌), 3902 (프로필렌), 3903 (스티렌)

## 🚀 사용법

### 방법 1: 배치 실행기 (권장)

```bash
cd packages/scripts

# 대화형 모드 (가장 쉬움)
python run_bulk_collection.py

# 미리 정의된 시나리오 실행
python run_bulk_collection.py --scenario full        # 2018-2024 전체
python run_bulk_collection.py --scenario recent      # 2022-2024 최근
python run_bulk_collection.py --scenario test        # 2023-2024 테스트
```

### 방법 2: 직접 실행

```bash
cd packages/scripts

# 전체 수집 (2018-2024, 모든 품목)
python bulk_data_collector.py --start-year 2018 --end-year 2024

# 특정 연도와 품목
python bulk_data_collector.py --start-year 2020 --end-year 2022 --items semiconductor oil

# 빠른 수집 (지연 시간 단축)
python bulk_data_collector.py --start-year 2019 --end-year 2021 --items semiconductor --delay 0.5
```

## 📋 미리 정의된 시나리오

### 1. `full` - 전체 수집

- **연도**: 2018-2024 (7년)
- **품목**: 모든 품목 (반도체, 원유, 구리, 플라스틱)
- **예상 시간**: 약 3-4시간
- **총 요청**: 490개

### 2. `recent` - 최근 데이터

- **연도**: 2022-2024 (3년)
- **품목**: 모든 품목
- **예상 시간**: 약 1-2시간
- **총 요청**: 210개

### 3. `semiconductor_focus` - 반도체 중심

- **연도**: 2018-2024 (7년)
- **품목**: 반도체만
- **예상 시간**: 약 1시간
- **총 요청**: 140개

### 4. `energy_materials` - 에너지 및 원자재

- **연도**: 2018-2024 (7년)
- **품목**: 원유, 구리
- **예상 시간**: 약 1.5시간
- **총 요청**: 210개

### 5. `test` - 테스트 수집

- **연도**: 2023-2024 (2년)
- **품목**: 반도체만
- **예상 시간**: 약 20분
- **총 요청**: 40개

## 🎮 대화형 모드 사용법

```bash
python run_bulk_collection.py
```

실행하면 다음과 같은 메뉴가 나타납니다:

```
🚀 UN Comtrade 대량 데이터 수집기
   2018-2024년 글로벌 무역 데이터 수집

📋 사용 가능한 수집 시나리오:
--------------------------------------------------
  full              : 전체 수집 (2018-2024, 모든 품목)
                      연도: 2018-2024, 품목: semiconductor, oil, copper, plastic
                      지연: 1.5초

🎮 옵션을 선택하세요:
   1. 시나리오 선택
   2. 사용자 정의 설정
   3. 종료
```

## 📊 수집되는 데이터

### 주요 무역 관계 (10개 조합)

1. **미국 ← 중국** (USA ← China)
2. **미국 ← 일본** (USA ← Japan)
3. **미국 ← 독일** (USA ← Germany)
4. **미국 ← 한국** (USA ← Korea)
5. **독일 ← 중국** (Germany ← China)
6. **독일 ← 일본** (Germany ← Japan)
7. **일본 ← 중국** (Japan ← China)
8. **한국 ← 중국** (Korea ← China)
9. **한국 ← 일본** (Korea ← Japan)
10. **중국 ← 미국** (China ← USA)

### 출력 파일 형식

각 수집에 대해 2개 파일이 생성됩니다:

```
data/output/
├── trade_semiconductor_8541_2020_842_156.csv      # 원시 데이터
├── trade_semiconductor_8541_2020_842_156.geojson  # 지도 데이터
├── trade_semiconductor_8542_2020_842_156.csv
├── trade_semiconductor_8542_2020_842_156.geojson
├── collection_summary_20250911_134032.json        # 수집 요약
└── bulk_collection_log_20250911_134032.txt        # 상세 로그
```

## ⏱️ 예상 소요 시간

### 계산 방식

- **총 요청 수** = 연도 수 × 품목 수 × 무역 관계 수 × HS Code 수
- **소요 시간** = 총 요청 수 × 지연 시간

### 예시 계산

```
전체 수집 (full):
- 연도: 7년 (2018-2024)
- 품목: 7개 HS Code (8541, 8542, 2709, 7403, 3901, 3902, 3903)
- 무역 관계: 10개
- 총 요청: 7 × 7 × 10 = 490개
- 지연 1.5초: 490 × 1.5 = 735초 ≈ 12분 (최소)
- 실제 소요: 네트워크 지연 포함 약 30-60분
```

## 📈 진행 상황 모니터링

### 1. 실시간 로그

```
[13:40:07] === 대량 데이터 수집 시작 ===
[13:40:07] 연도 범위: 2020-2024
[13:40:07] 품목: semiconductor_8541, semiconductor_8542, oil, copper
[13:40:07] 무역 관계: 10개
[13:40:07] 총 200개 작업 예정

📅 2020년 데이터 수집 시작
  📦 semiconductor_8541 수집 중...
    [1/200] (0.5%) USA←China
      ✅ $966,112,944 (1 레코드)
    [2/200] (1.0%) USA←Japan
      ❌ No data returned
```

### 2. 최종 요약

```
🎉 대량 수집 완료!
   - 총 작업: 200
   - 성공: 156
   - 실패: 44
   - 성공률: 78.0%
```

### 3. 로그 파일

- **위치**: `data/output/bulk_collection_log_YYYYMMDD_HHMMSS.txt`
- **내용**: 모든 요청의 상세 로그
- **실패 분석**: 실패한 요청들의 패턴 분석

## ⚠️ 주의사항 및 제한사항

### 1. API 제한

- **무료 버전**: 시간당 요청 제한 있음
- **데이터 가용성**: 최신 데이터는 1-2년 지연
- **일부 조합**: 실제 무역이 없어 데이터 없음

### 2. 성공률

- **일반적**: 70-80% 성공률
- **최신 연도**: 성공률 낮음 (데이터 미제공)
- **특정 조합**: 일부 국가 간 무역 없음

### 3. 네트워크 및 시간

- **소요 시간**: 예상보다 2-3배 더 걸릴 수 있음
- **중단 가능**: Ctrl+C로 언제든 중단 가능
- **재시작**: 중단된 지점부터 재시작 불가 (전체 재실행)

## 🛠️ 문제 해결

### 1. 일반적인 오류

**"No data returned"**

- **원인**: 해당 조합에 실제 무역 데이터 없음
- **해결**: 정상적인 상황, 다른 조합 확인

**"Maximum number of commodity codes is 1"**

- **원인**: 여러 HS Code 동시 요청 불가
- **해결**: 이미 수정됨 (개별 코드로 분리)

**네트워크 오류**

- **원인**: 인터넷 연결 또는 API 서버 문제
- **해결**: 잠시 후 재시도

### 2. 성능 최적화

**수집 속도 향상**:

```bash
# 지연 시간 단축 (주의: API 제한 위험)
python bulk_data_collector.py --delay 0.3

# 특정 품목만 수집
python bulk_data_collector.py --items semiconductor

# 최근 연도만 수집
python bulk_data_collector.py --start-year 2022
```

**메모리 사용량 감소**:

- 한 번에 너무 많은 연도 수집 피하기
- 품목별로 나누어 수집

## 📊 수집 결과 활용

### 1. 데이터 분석

```python
import pandas as pd
import json

# CSV 데이터 로딩
df = pd.read_csv('data/output/trade_semiconductor_8541_2020_842_156.csv')
print(f"무역액: ${df['primaryValue'].sum():,.0f}")

# GeoJSON 데이터 로딩
with open('data/output/trade_semiconductor_8541_2020_842_156.geojson') as f:
    geojson = json.load(f)
print(f"무역 흐름: {len(geojson['features'])}개")
```

### 2. 지도 시각화

- GeoJSON 파일을 Leaflet, Mapbox 등에서 직접 사용 가능
- 무역 흐름을 선으로 표시
- 무역액에 따른 선 두께 조절

### 3. 시계열 분석

- 연도별 무역액 변화 추이
- 지정학적 사건과 무역 패턴 변화 분석
- 공급망 다변화 패턴 분석

## 🎯 다음 단계

대량 데이터 수집이 완료되면:

1. **STEP 2**: VeChain 온체인 데이터 수집
2. **STEP 3**: NestJS 백엔드 API 서버 구축
3. **STEP 4**: Next.js 프론트엔드 구현
4. **STEP 5**: 분석 및 배포

---

**🎉 축하합니다!** 이제 2018-2024년 글로벌 무역 데이터를 체계적으로 수집할 수 있는 완전한 시스템을 갖추었습니다!
