# 🌍 Blockchain Supply Chain Geopolitics

**지정학적 변화에 따른 글로벌 공급망 재편과 블록체인의 역할** 분석 프로젝트

## 🎯 프로젝트 목표

UN 무역 데이터와 VeChain 네트워크 활동량을 통해 지정학적 변화가 글로벌 공급망에 미치는 영향을 분석하고, 블록체인 기술의 역할을 시각화하는 인터랙티브 웹 애플리케이션을 구축합니다.

## 📊 분석 대상

### 1차 근거 (핵심 데이터)

- **UN Comtrade 무역 데이터** (2018-2024)
- **품목**: 반도체, 원유, 구리, 플라스틱
- **주요 무역 관계**: 미국↔중국, 미국↔일본, 독일↔중국 등

### 보조 지표 (방증 데이터)

- **VeChain 네트워크 활동량** (VTHO 소모량)
- **블록체인 기반 공급망 투명성** 지표

## 🏗️ 프로젝트 구조

```
blockchain-supply-chain-geopolitics/
├── docs/                           # 📚 문서
│   ├── GUIDE.md                   # 전체 프로젝트 가이드
│   ├── UN_COMTRADE_API_GUIDE.md   # API 사용 가이드
│   ├── DATA_COLLECTION_GUIDE.md   # 데이터 수집 완료 가이드
│   └── BULK_DATA_COLLECTION_GUIDE.md # 대량 수집 가이드
├── packages/
│   ├── api/                       # 🔧 NestJS 백엔드 (예정)
│   ├── client/                    # 🖥️ Next.js 프론트엔드 (예정)
│   └── scripts/                   # 🐍 Python 데이터 수집
│       ├── bulk_data_collector.py      # 대량 데이터 수집기
│       ├── run_bulk_collection.py      # 배치 실행기
│       ├── working_data_collector.py   # 단일 데이터 수집기
│       ├── requirements.txt            # Python 의존성
│       ├── venv/                      # Python 가상환경
│       └── data/output/               # 수집된 데이터
└── README.md                      # 이 파일
```

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 저장소 클론
git clone <repository-url>
cd blockchain-supply-chain-geopolitics

# Python 가상환경 활성화 (Windows)
cd packages/scripts
.\venv\Scripts\activate

# 패키지 설치 확인
pip install -r requirements.txt
```

### 2. 데이터 수집

#### 방법 A: 대화형 모드 (권장)

```bash
python run_bulk_collection.py
```

#### 방법 B: 직접 실행

```bash
# 전체 수집 (2018-2024, 모든 품목)
python bulk_data_collector.py --start-year 2018 --end-year 2024

# 테스트 수집 (2023-2024, 반도체만)
python bulk_data_collector.py --start-year 2023 --end-year 2024 --items semiconductor
```

#### 방법 C: 단일 데이터 수집

```bash
# 특정 무역 관계 데이터
python working_data_collector.py --year 2020 --item semiconductor --reporter 842 --partner 156
```

## 📋 수집 시나리오

| 시나리오              | 연도      | 품목      | 예상 시간 | 설명             |
| --------------------- | --------- | --------- | --------- | ---------------- |
| `full`                | 2018-2024 | 모든 품목 | 3-4시간   | 전체 데이터 수집 |
| `recent`              | 2022-2024 | 모든 품목 | 1-2시간   | 최근 데이터만    |
| `semiconductor_focus` | 2018-2024 | 반도체만  | 1시간     | 반도체 중심 분석 |
| `test`                | 2023-2024 | 반도체만  | 20분      | 테스트용         |

## 📊 수집되는 데이터

### 품목별 HS Code

- **반도체**: 8541 (다이오드, 트랜지스터), 8542 (집적회로)
- **원유**: 2709 (석유 및 역청유)
- **구리**: 7403 (정제된 구리 및 구리 합금)
- **플라스틱**: 3901 (에틸렌), 3902 (프로필렌), 3903 (스티렌)

### 주요 무역 관계

1. 미국 ← 중국/일본/독일/한국
2. 독일 ← 중국/일본
3. 일본 ← 중국
4. 한국 ← 중국/일본
5. 중국 ← 미국

### 출력 형식

- **CSV**: 원시 무역 통계 데이터
- **GeoJSON**: 지도 시각화용 지리 데이터
- **JSON**: 수집 요약 및 메타데이터

## 🎯 현재 진행 상황

### ✅ 완료된 작업

- [x] **Python 데이터 수집 환경 구축**
- [x] **UN Comtrade API 연동**
- [x] **단일 데이터 수집기 구현**
- [x] **대량 데이터 수집기 구현**
- [x] **배치 실행 시스템 구현**
- [x] **GeoJSON 변환 및 지도 데이터 생성**
- [x] **상세 문서화**

### 🔄 진행 예정

- [ ] **VeChain 온체인 데이터 수집** (STEP 2)
- [ ] **NestJS 백엔드 API 서버** (STEP 3)
- [ ] **Next.js 프론트엔드 구현** (STEP 4)
- [ ] **분석 및 배포** (STEP 5)

## 📚 문서

- **[전체 가이드](docs/GUIDE.md)**: 프로젝트 전체 로드맵
- **[API 가이드](docs/UN_COMTRADE_API_GUIDE.md)**: UN Comtrade API 사용법
- **[데이터 수집 가이드](docs/DATA_COLLECTION_GUIDE.md)**: 기본 데이터 수집
- **[대량 수집 가이드](docs/BULK_DATA_COLLECTION_GUIDE.md)**: 2018-2024 대량 수집

## 🛠️ 기술 스택

### 데이터 수집 (현재)

- **Python 3.9+**
- **comtradeapicall**: UN Comtrade API 공식 패키지
- **pandas**: 데이터 처리
- **geopandas**: 지리 데이터 처리
- **shapely**: 기하학적 객체 생성

### 백엔드 (예정)

- **NestJS**: Node.js 백엔드 프레임워크
- **TypeScript**: 타입 안전성

### 프론트엔드 (예정)

- **Next.js**: React 기반 프론트엔드
- **Leaflet**: 지도 시각화
- **Recharts**: 차트 라이브러리

## 📈 예상 결과물

### 1. 인터랙티브 지도

- 글로벌 무역 흐름 시각화
- 연도별/품목별 필터링
- 무역액에 따른 시각적 표현

### 2. 시계열 분석

- 지정학적 사건과 무역 패턴 변화
- 공급망 다변화 추이
- 블록체인 도입과의 상관관계

### 3. 인사이트 리포트

- 미-중 무역분쟁 영향 분석
- 반도체 공급망 재편 패턴
- 블록체인 기술의 공급망 투명성 기여도

## 🤝 기여하기

1. 이슈 리포트: 버그나 개선사항 제안
2. 데이터 검증: 수집된 데이터의 정확성 검토
3. 분석 아이디어: 새로운 분석 관점 제안
4. 문서 개선: 가이드 문서 보완

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🔗 관련 링크

- [UN Comtrade Plus](https://comtradeplus.un.org/)
- [VeChain Stats](https://vechainstats.com/)
- [Natural Earth Data](https://www.naturalearthdata.com/)

---

**📧 문의사항이나 제안사항이 있으시면 언제든 연락주세요!**
