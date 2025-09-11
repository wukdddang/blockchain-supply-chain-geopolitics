# UN Comtrade API 사용 가이드

## 개요

UN Comtrade는 유엔이 운영하는 세계 최대의 국제무역 통계 데이터베이스입니다. 이 가이드는 UN Comtrade API를 사용하여 무역 데이터를 수집하는 방법을 설명합니다.

## ✅ 권장 방법: comtradeapicall 패키지 사용

**가장 안정적이고 효율적인 방법**은 Python의 `comtradeapicall` 패키지를 사용하는 것입니다:

### 설치 및 기본 사용법

```bash
pip install comtradeapicall
```

```python
import comtradeapicall

# 데이터 수집 예시: 미국의 중국으로부터 반도체 수입 (2019년)
data = comtradeapicall.getFinalData(
    subscription_key=None,    # 무료 버전
    typeCode='C',             # 상품
    freqCode='A',             # 연간
    clCode='HS',              # HS 분류
    period='2019',            # 연도
    reporterCode='842',       # 미국
    cmdCode='8541',           # 반도체 (HS Code)
    flowCode='M',             # 수입
    partnerCode='156',        # 중국
    partner2Code='0',         # 2차 파트너 없음
    customsCode='C00',        # 기본 관세 코드
    motCode='0',              # 운송 모드 없음
    maxRecords=1000,          # 최대 레코드 수
    format_output='JSON'
)
```

## API 접근 방식

### 1. comtradeapicall 패키지 (권장)

- **안정성**: 공식 패키지로 API 변경사항에 자동 대응
- **편의성**: 복잡한 매개변수 처리 자동화
- **무료 사용**: 등록 없이 사용 가능 (제한적)
- **데이터 형식**: pandas DataFrame 또는 JSON 자동 변환

### 2. 직접 API 호출 (비추천)

- **복잡성**: 매개변수 검증과 오류 처리 필요
- **불안정성**: API 엔드포인트 변경에 취약
- **제한사항**: 수동으로 데이터 형식 변환 필요

## API 사용법

### 기본 요청 구조

```
GET https://comtradeapi.un.org/public/v1/get?r=all&p=all&freq=A&ps=2023&px=HS&cc=8541&rg=1&type=C&fmt=json&max=100000
```

### 주요 매개변수

| 매개변수 | 설명        | 예시 값                                       |
| -------- | ----------- | --------------------------------------------- |
| `r`      | 보고 국가   | `all` (모든 국가), `842` (미국)               |
| `p`      | 파트너 국가 | `all` (모든 국가), `156` (중국)               |
| `freq`   | 빈도        | `A` (연간), `M` (월간)                        |
| `ps`     | 기간        | `2023` (2023년), `2020,2021,2022` (여러 연도) |
| `px`     | 분류 체계   | `HS` (HS Code), `SITC` (SITC Code)            |
| `cc`     | 상품 코드   | `8541` (반도체), `2709` (원유)                |
| `rg`     | 무역 흐름   | `1` (수입), `2` (수출), `all` (모두)          |
| `type`   | 데이터 타입 | `C` (상품), `S` (서비스)                      |
| `fmt`    | 출력 형식   | `json`, `csv`                                 |
| `max`    | 최대 레코드 | `100000`                                      |

### 국가 코드

주요 국가들의 ISO 3자리 숫자 코드:

- 미국: 842
- 중국: 156
- 일본: 392
- 독일: 276
- 한국: 410

### HS Code (품목 분류)

이 프로젝트에서 사용하는 주요 품목들:

| 품목     | HS Code          | 설명                           |
| -------- | ---------------- | ------------------------------ |
| 반도체   | 8541, 8542       | 다이오드, 트랜지스터, 집적회로 |
| 원유     | 2709             | 석유 및 역청유 (원유)          |
| 구리     | 7403             | 정제된 구리 및 구리 합금       |
| 플라스틱 | 3901, 3902, 3903 | 기초 플라스틱 폴리머           |

## 환경 설정

### 1. Python 환경 준비

```bash
# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate

# 필요한 패키지 설치
pip install pandas requests geopandas "shapely<2.0"
```

### 2. 프로젝트 구조

```
packages/scripts/
├── process_trade_data.py    # 메인 처리 스크립트
├── requirements.txt         # Python 의존성
├── data/
│   └── output/             # 생성된 GeoJSON 파일들
└── venv/                   # Python 가상환경
```

## 사용법

### 1. 기본 사용

```bash
# 가상환경 활성화
cd packages/scripts
source venv/bin/activate  # Windows: .\venv\Scripts\activate

# 데이터 수집 실행
python process_trade_data.py --year 2023 --item semiconductor
python process_trade_data.py --year 2019 --item oil
python process_trade_data.py --year 2022 --item copper
python process_trade_data.py --year 2021 --item plastic
```

### 2. 사용 가능한 품목

- `semiconductor`: 반도체
- `oil`: 원유
- `copper`: 구리
- `plastic`: 플라스틱

### 3. 출력 파일

생성되는 GeoJSON 파일:

- `trade_flow_semiconductor_2023.geojson`
- `trade_flow_oil_2019.geojson`
- 등...

## API 제한사항 및 해결책

### 1. 요청 제한 (시간당 100회)

**문제**: Public API는 시간당 100회 요청으로 제한됩니다.

**해결책**:

- 필요한 데이터만 선별적으로 요청
- 요청 간 지연 시간 추가
- 여러 세션에 걸쳐 데이터 수집

### 2. 데이터 크기 제한 (100,000 레코드)

**문제**: 한 번의 요청으로 최대 100,000 레코드만 받을 수 있습니다.

**해결책**:

- 연도별로 분할 요청
- 국가별로 분할 요청
- 품목별로 분할 요청

### 3. 네트워크 오류

**문제**: API 서버가 일시적으로 응답하지 않을 수 있습니다.

**해결책**:

- 재시도 로직 구현
- 타임아웃 설정
- 오류 로깅

## 데이터 품질 주의사항

### 1. 누락 데이터

- 일부 국가는 특정 연도의 데이터를 보고하지 않을 수 있습니다.
- 민감한 품목의 경우 데이터가 제한될 수 있습니다.

### 2. 국가 코드 매칭

- UN Comtrade의 국가 코드와 GeoPandas의 ISO 코드가 다를 수 있습니다.
- 스크립트에서 자동 매칭을 시도하지만, 일부 국가는 수동 확인이 필요할 수 있습니다.

### 3. 데이터 신뢰성

- 각 국가가 자체적으로 보고하는 데이터이므로 일관성에 차이가 있을 수 있습니다.
- 수출국과 수입국의 데이터가 일치하지 않을 수 있습니다.

## 문제 해결

### 일반적인 오류

1. **"API 요청 실패"**

   - 인터넷 연결 확인
   - API 서버 상태 확인
   - 요청 매개변수 검증

2. **"데이터가 없습니다"**

   - 해당 연도/품목 조합에 대한 데이터 부족
   - 다른 연도나 품목으로 시도

3. **"국가 데이터를 로딩할 수 없습니다"**
   - GeoPandas 설치 확인
   - 인터넷 연결 확인 (naturalearth 데이터 다운로드)

### 디버깅 팁

1. **상세 로그 확인**: 스크립트 실행 시 출력되는 메시지를 주의깊게 확인하세요.

2. **단계별 확인**: 각 처리 단계가 성공적으로 완료되는지 확인하세요.

3. **작은 데이터셋으로 테스트**: 처음에는 작은 데이터셋으로 테스트해보세요.

## 추가 리소스

- [UN Comtrade 공식 웹사이트](https://comtradeplus.un.org/)
- [UN Comtrade API 문서](https://comtradeapi.un.org/)
- [HS Code 검색](https://www.foreign-trade.com/reference/hscode.htm)
- [국가 코드 목록](https://unstats.un.org/unsd/tradekb/knowledgebase/country-code)

## 라이선스 및 이용약관

UN Comtrade 데이터는 유엔의 이용약관에 따라 사용해야 합니다. 상업적 사용 시에는 별도의 라이선스가 필요할 수 있습니다.

---

**참고**: 이 가이드는 2024년 기준으로 작성되었습니다. UN Comtrade API는 지속적으로 업데이트되므로 최신 정보는 공식 문서를 참조하시기 바랍니다.
