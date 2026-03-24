# sentiment-pulse

> **MOODEX** — 미국 시장심리 7대 구성 지표를 한국어로 해석하고 활용하는 대시보드

## 프로젝트 한 줄 정의

MOODEX는 Fear & Greed 계열의 미국 시장심리 신호를 단순히 보여주는 것이 아니라,
**그 신호를 어떻게 해석하고, 역사적으로 어떤 의미가 있었고, 실제 투자 의사결정에서 어떻게 참고할 수 있는지**를 구조적으로 보여주는 제품입니다.

핵심은 점수 자체보다 아래에 있습니다.
- 7대 구성 지표 프레임워크
- 한국어 해석 레이어
- 역사적 맥락
- 자산군 함의
- 실전 활용 프레임
- 무료/유료 인사이트 구조

---

## 현재 개발 상황

### 현재 단계
- **PRD / 기획 문서 세트 정리 완료**
- **화요일 UI 단계 진행 완료(의미 있는 checkpoint 확보)**
- 다음 기본 단계: **수요일 로직 / API / 데이터 연결**

### 제품/기획 상태
아래 문서 세트를 기반으로 제품 방향이 정리되어 있습니다.
- `REFERENCE-PRD-NOTES.md`
- `PRD-ONE-PAGER.md`
- `FEATURES-FREE-PAID.md`
- `MVP-IA.md`
- `BUILD-BRIEF.md`
- `PROJECT-STATUS-2026-03-24.md`

핵심 기획 원칙:
- CNN Fear & Greed의 **7대 구성 지표 프레임워크**를 구조적 기반으로 삼음
- 단, 공식 내부 정규화가 비공개일 수 있으므로 **자체 근사(approximation)** 접근 사용
- 제품의 모트는 점수 계산이 아니라 **해석 / 역사 / 자산군 해석 / 실전 활용 프레임**
- 직접 투자 추천이 아니라 **의사결정 보조**와 **리스크 관리 관점** 제공

### UI 진행 상태
현재 확보된 의미 있는 UI checkpoint:
- `a3ab532` — `feat: scaffold MOODEX sentiment-pulse product workspace`
- `7de245d` — `feat: scaffold MOODEX UI — full dashboard + 4 pages, build green`
- `1cebe9b` — `refine: elevate dashboard hierarchy and usage framing for CEO readability`

현재 UI 기준으로 확보된 주요 표면:
- `/dashboard`
- `/history`
- `/guide`
- `/subscribe`

현재 상태 해석:
- 단순 스캐폴드 수준은 넘었음
- **리뷰 가능한 제품 표면** 확보
- 대시보드 계층과 활용 프레임 가시성까지 한 차례 refinement 완료

---

## 현재 폴더 안의 핵심 파일

### 기획/문서
- `REFERENCE-PRD-NOTES.md` — 초기 제품 철학 / PRD 참고 기준
- `PRD-ONE-PAGER.md` — 1페이지 제품 정의
- `FEATURES-FREE-PAID.md` — 무료/유료 기능 구조
- `MVP-IA.md` — 화면 IA / 스크린맵
- `BUILD-BRIEF.md` — 구현 브리프
- `PROJECT-STATUS-2026-03-24.md` — 진행 기록

### 구현/UI
- `app/` — Next.js App Router 기반 UI
- `components/` — 대시보드/지표/레이아웃 컴포넌트
- `data/` — mock 데이터, 해석 텍스트, 자산군 설명 등
- `public/` — 정적 에셋

---

## 개발 실행

개발 서버 실행:

```bash
npm install
npm run dev
```

브라우저에서 확인:

```text
http://localhost:3000
```

---

## 다음 우선순위

### 1. UI 추가 보강 (필요 시)
- 대시보드 설득력 보강
- 7개 항목 그리드 가독성 추가 개선
- history / guide / subscribe surface polish
- 모바일/데스크톱 일관성 보정

### 2. 수요일 단계 진입
- 7개 항목 계산 로직 연결
- 합성 점수 / 레짐 판별
- API 라우트 연결
- 히스토리 데이터 연결
- cron/update 파이프라인 연결
- UI에 실제 데이터 주입

---

## 메모

이 프로젝트는 단순 Next.js 샘플이 아니라,
**기획 문서 패키지 + 실제 구현 워크스페이스**를 동시에 유지하는 구조입니다.

따라서 문서 파일들은 구현 스캐폴드와 별개로 계속 보존/업데이트해야 합니다.
