# 데이터 수집 완료 가이드

## 🎉 성공적으로 완료된 작업

GUIDE.md를 따라 Python으로 데이터 취득 부분을 성공적으로 완료했습니다!

## 📁 생성된 파일들

### 1. Python 스크립트

- `packages/scripts/working_data_collector.py` - **메인 데이터 수집기**
- `packages/scripts/process_trade_data.py` - 원래 계획된 스크립트
- `packages/scripts/requirements.txt` - Python 의존성 관리

### 2. 문서

- `docs/UN_COMTRADE_API_GUIDE.md` - UN Comtrade API 사용 가이드
- `docs/DATA_COLLECTION_GUIDE.md` - 이 문서

### 3. 수집된 데이터 예시

- `packages/scripts/data/output/trade_semiconductor_2019_842_156.csv`
- `packages/scripts/data/output/trade_semiconductor_2019_842_156.geojson`
- `packages/scripts/data/output/trade_semiconductor_2020_842_392.csv`
- `packages/scripts/data/output/trade_semiconductor_2020_842_392.geojson`

## 🚀 사용법

### 기본 실행

```bash
cd packages/scripts

# 가상환경 활성화 (Windows)
.\venv\Scripts\activate

# 데이터 수집 실행
python working_data_collector.py --year 2019 --item semiconductor --reporter 842 --partner 156
```

### 사용 가능한 옵션

**품목 (--item):**

- `semiconductor`: 반도체 (HS Code: 8541)
- `oil`: 원유 (HS Code: 2709)
- `copper`: 구리 (HS Code: 7403)
- `plastic`: 플라스틱 (HS Code: 3901)

**주요 국가 코드:**

- `842`: 미국
- `156`: 중국
- `392`: 일본
- `276`: 독일
- `410`: 한국

### 실행 예시

```bash
# 2019년 미국의 중국으로부터 반도체 수입
python working_data_collector.py --year 2019 --item semiconductor --reporter 842 --partner 156

# 2020년 미국의 일본으로부터 반도체 수입
python working_data_collector.py --year 2020 --item semiconductor --reporter 842 --partner 392

# 2021년 독일의 중국으로부터 구리 수입
python working_data_collector.py --year 2021 --item copper --reporter 276 --partner 156
```

## 📊 출력 데이터

### CSV 파일

원시 UN Comtrade 데이터를 포함하는 상세한 무역 통계:

- 무역액 (`primaryValue`)
- 순중량 (`netWgt`)
- 수량 (`qty`)
- 국가명 및 코드
- 상품 설명 등

### GeoJSON 파일

지도 시각화를 위한 지리적 데이터:

- 무역 흐름을 나타내는 LineString 좌표
- 수출국 → 수입국 방향
- 무역액, 중량 등 속성 정보
- 메타데이터 (생성 시간, 레코드 수 등)

## 🔧 기술적 세부사항

### 사용된 패키지

- `comtradeapicall`: UN Comtrade API 공식 Python 패키지
- `pandas`: 데이터 처리
- `geopandas`: 지리적 데이터 처리
- `shapely`: 기하학적 객체 생성

### 데이터 처리 과정

1. **API 호출**: `comtradeapicall.getFinalData()`로 무역 데이터 수집
2. **지리 매핑**: 국가명을 지리적 좌표로 변환
3. **GeoJSON 생성**: 무역 흐름을 LineString으로 표현
4. **파일 저장**: CSV와 GeoJSON 형식으로 저장

### 좌표 시스템

- **소스**: Natural Earth 저해상도 국가 경계 데이터
- **좌표**: WGS84 (EPSG:4326)
- **중심점**: 각 국가의 지리적 중심점 사용

## 🎯 성공 사례

### 테스트된 데이터 조합

1. **미국 ← 중국 반도체 (2019)**

   - 무역액: $966,112,944
   - 순중량: 7,198,609 kg
   - ✅ 성공

2. **미국 ← 일본 반도체 (2020)**
   - 무역액: $891,133,789
   - ✅ 성공

### 실패 사례 및 해결책

1. **미국 ← 중국 원유 (2020)**: 데이터 없음

   - **원인**: 실제 무역 관계가 없거나 미미함
   - **해결**: 다른 국가 조합 시도

2. **전체 국가 조합 (all)**: 매개변수 오류
   - **원인**: API가 "all" 값을 지원하지 않음
   - **해결**: 특정 국가 코드 사용

## 🔄 다음 단계

이제 GUIDE.md의 다음 단계들을 진행할 수 있습니다:

1. **STEP 2**: VeChain 온체인 데이터 수집
2. **STEP 3**: NestJS 백엔드 API 서버 구축
3. **STEP 4**: Next.js 프론트엔드 구현
4. **STEP 5**: 분석 및 배포

## 📝 주의사항

### API 제한사항

- 무료 버전은 요청 제한이 있을 수 있음
- 모든 국가 조합에 데이터가 있는 것은 아님
- 최신 데이터는 보고 지연으로 인해 1-2년 뒤에 제공됨

### 데이터 품질

- 각 국가가 자체 보고하는 데이터로 일관성 차이 있음
- 일부 민감한 품목은 데이터가 제한될 수 있음
- 수출국과 수입국 데이터가 일치하지 않을 수 있음

## 🆘 문제 해결

### 일반적인 오류

1. **"수집된 데이터가 없습니다"**

   - 해당 연도/품목/국가 조합에 실제 무역이 없음
   - 다른 조합으로 시도

2. **"Invalid parameter value"**

   - 국가 코드나 품목 코드가 잘못됨
   - 문서의 유효한 코드 확인

3. **가상환경 오류**
   - `.\venv\Scripts\activate`로 가상환경 활성화 확인
   - `pip install -r requirements.txt`로 패키지 재설치

### 성공적인 조합 예시

- 미국(842) ← 중국(156): 반도체, 플라스틱
- 미국(842) ← 일본(392): 반도체
- 독일(276) ← 중국(156): 구리, 플라스틱
- 한국(410) ← 일본(392): 반도체

---

**축하합니다!** 🎉 Python 데이터 수집 부분이 성공적으로 완료되었습니다. 이제 수집된 데이터를 활용하여 프로젝트의 다음 단계를 진행할 수 있습니다.
