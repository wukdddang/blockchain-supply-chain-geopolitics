# Git LFS 설정 가이드

## 개요

프로젝트에서 수집한 데이터 파일들(CSV, GeoJSON)을 Git으로 관리할 때 Git LFS(Large File Storage)를 사용하면 저장소를 효율적으로 관리할 수 있습니다.

## 현재 데이터 현황

```
📊 데이터 폴더 현황:
- 총 파일 수: 896개
- 총 용량: 865KB (886,363 bytes)
- 파일 유형: CSV(448개), GeoJSON(448개)
- 수집 기간: 2018-2024년 (7년간)
- 품목: 반도체, 원유, 구리, 플라스틱
```

## 🎯 권장 방법들

### 방법 1: Git LFS 사용 (대용량 파일 관리)

```bash
# 1. Git LFS 설치 (Windows)
# https://git-lfs.github.io/ 에서 다운로드 후 설치

# 2. 프로젝트에서 Git LFS 초기화
git lfs install

# 3. 데이터 파일 유형을 LFS로 추적 설정
git lfs track "packages/scripts/data/**/*.csv"
git lfs track "packages/scripts/data/**/*.geojson"
git lfs track "packages/scripts/data/**/*.json"

# 4. .gitattributes 파일 커밋
git add .gitattributes
git commit -m "Add Git LFS tracking for data files"

# 5. 데이터 파일들 추가
git add packages/scripts/data/
git commit -m "Add collected trade data (2018-2024)"

# 6. 푸시 (LFS 파일들이 별도로 업로드됨)
git push origin main
```

### 방법 2: .gitignore 사용 (간단한 제외)

```bash
# .gitignore에 추가
echo "packages/scripts/data/" >> .gitignore

# 변경사항 커밋
git add .gitignore
git commit -m "Ignore data folder from git tracking"
```

### 방법 3: 압축 후 LFS 사용 (최적화)

```bash
# 1. 데이터 압축
cd packages/scripts
tar -czf trade_data_2018_2024.tar.gz data/

# 2. 압축 파일을 LFS로 추적
git lfs track "packages/scripts/*.tar.gz"
git add .gitattributes packages/scripts/trade_data_2018_2024.tar.gz
git commit -m "Add compressed trade data with LFS"

# 3. 원본 data 폴더는 .gitignore에 추가
echo "packages/scripts/data/" >> .gitignore
```

## 🚀 추천 방법: Git LFS (방법 1)

**장점:**

- 개별 파일 접근 가능
- 버전 관리 지원
- 선택적 다운로드 가능
- 협업에 유리

**단점:**

- Git LFS 설치 필요
- GitHub LFS 용량 제한 (무료: 1GB)

## 📋 Git LFS 설정 후 확인 방법

```bash
# LFS 추적 파일 확인
git lfs ls-files

# LFS 상태 확인
git lfs status

# 특정 파일이 LFS로 관리되는지 확인
git lfs ls-files | grep "trade_"
```

## 💡 추가 팁

### GitHub LFS 용량 관리

- 무료 계정: 1GB 저장소, 1GB 대역폭/월
- 현재 데이터(865KB)는 여유롭게 수용 가능
- 향후 데이터 증가 시 고려 필요

### 협업자를 위한 안내

```bash
# 저장소 클론 시 LFS 파일도 함께 다운로드
git clone --recurse-submodules <repository-url>

# 또는 기존 저장소에서 LFS 파일 다운로드
git lfs pull
```

### 선택적 데이터 다운로드

```bash
# 특정 패턴의 파일만 다운로드
git lfs pull --include="packages/scripts/data/output/trade_semiconductor_*"

# 특정 연도 데이터만 다운로드
git lfs pull --include="*_2024_*"
```

## 🔧 문제 해결

### LFS 파일이 제대로 업로드되지 않는 경우

```bash
# LFS 파일 강제 푸시
git lfs push --all origin main
```

### 용량 초과 시 대안

1. **선택적 연도 데이터만 포함**
2. **압축 사용 (방법 3)**
3. **외부 저장소 사용** (AWS S3, Google Drive 등)

## 📝 현재 프로젝트 권장 설정

현재 데이터 용량(865KB)과 파일 수(896개)를 고려할 때 **Git LFS 사용**을 권장합니다:

```bash
# 실행 명령어
git lfs install
git lfs track "packages/scripts/data/**/*.csv"
git lfs track "packages/scripts/data/**/*.geojson"
git lfs track "packages/scripts/data/**/*.json"
git add .gitattributes
git commit -m "Setup Git LFS for trade data files"
git add packages/scripts/data/
git commit -m "Add trade data (2018-2024): 896 files, 865KB"
git push origin main
```

이렇게 설정하면 데이터 파일들이 효율적으로 관리되고, 필요에 따라 선택적으로 다운로드할 수 있습니다.
