# MVP IA / 스크린맵 — Korea Fear & Greed Index v1

**작성일**: 2026-03-25  
**스코프**: 한국형 7-factor 분석형 MVP

---

## 라우트 구조

```
/                       → 홈 또는 /dashboard 리다이렉트
/dashboard              → 메인 대시보드 (핵심 화면)
/history                → K-FGI 히스토리 / 이벤트 스터디
/guide                  → 지수 해석 / 방법론 / 활용 가이드
/subscribe              → 선택적 구독/알림 페이지
/api/index              → 오늘의 K-FGI snapshot
/api/history            → 시계열 및 과거 사례 데이터
/api/analysis           → buy/sell threshold 기반 forward return 분석
```

---

## 화면별 상세 IA

### S-01: 대시보드 `/dashboard` ★ 핵심

**레이아웃**: 단일 스크롤 페이지, 데스크톱 우선 + 모바일 대응

```
┌───────────────────────────────────────────────┐
│ [K-FGI 로고]                  [Methodology]  │
├───────────────────────────────────────────────┤
│  Korea Fear & Greed Index                    │
│  Today: 23  | Extreme Fear                   │
│  "Historically, similar fear regimes were   │
│   followed by stronger 30D rebounds in       │
│   equities and crypto."                     │
│  Similar past cases: 14                      │
├───────────────────────────────────────────────┤
│  7 Signals Today                             │
│  [Momentum] [Strength] [Breadth]             │
│  [Put/Call] [Safe Haven] [Volatility]        │
│  [Credit]                                    │
├───────────────────────────────────────────────┤
│  Buy Timing Analysis   |  Sell Timing Analysis│
│  Fear <= 25            |  Greed >= 75        │
│  cases / avg / median  |  cases / avg / win  │
│  by asset + horizon    |  by asset + horizon │
├───────────────────────────────────────────────┤
│  Cross-Asset Heatmap                         │
│  Assets × (7D / 30D / 90D / 180D)            │
├───────────────────────────────────────────────┤
│  Historical Analog Cases                     │
│  Top 3 similar past dates + outcomes         │
├───────────────────────────────────────────────┤
│  Methodology / Disclaimer                    │
└───────────────────────────────────────────────┘
```

#### 핵심 포인트
- 첫 화면에서 현재 점수 + 해석 + 과거 유사 사례 성과를 함께 본다
- 단순 위젯형이 아니라 **분석형 dashboard**여야 한다
- 7개 시그널은 반드시 독립 카드로 설명 가능해야 한다

---

### S-02: 히스토리 `/history`

핵심 목적:
- K-FGI 시계열
- extreme fear / extreme greed 이벤트 마킹
- event study 또는 기간별 forward-return drill-down

구성:
1. K-FGI time series
2. regime band coloring
3. selected threshold event list
4. asset path after signal chart

---

### S-03: 가이드 `/guide`

핵심 목적:
- K-FGI가 무엇인지 설명
- 7개 항목 정의
- 왜 한국형 프록시를 쓰는지 설명
- 해석 원칙 / 면책 문구 제공

구성:
1. What is K-FGI?
2. The 7 local signals
3. How scoring works
4. How to read fear vs greed historically
5. Limitations / disclaimer

---

### S-04: 구독 `/subscribe`

현재 단계에서는 핵심이 아님. 필요 시 유지.

가능 역할:
- 일별 리포트 구독
- threshold alert
- 주간 요약 구독

단, MVP 중심 메시지는 **구독 유도보다 지수/분석 설명**이어야 한다.

---

## 섹션별 UX 세부 요구

### 1. Hero Summary
반드시 포함:
- 현재 점수
- 현재 레짐
- short contrarian summary
- 유사 사례 수
- 대표 자산 forward return 요약

### 2. 7 Signals Today
각 카드 포함:
- 시그널명
- 현재 raw value
- normalized 상태
- short explanation
- fear ↔ greed 방향성

### 3. Buy vs Sell Analysis
포함:
- threshold control
- 사례 수
- 자산별 7/30/90/180일 성과
- avg / median / win rate
- 가능하면 drawdown

### 4. Cross-Asset Heatmap
행:
- KOSPI
- KOSDAQ
- BTC
- ETH
- Gold
- Oil
- Optional: S&P500 / USDKRW

열:
- 7D
- 30D
- 90D
- 180D

### 5. Historical Analog Cases
각 카드:
- 날짜
- 당시 점수
- 간단한 설명
- 이후 자산 성과 요약
- similarity badge

### 6. Methodology
반드시 표시:
- 7개 시그널 정의
- 점수 정규화 방식
- 표본 수 주의
- 과거 성과는 미래 보장 아님

---

## 컴포넌트 트리 (권장)

```
app/
├── dashboard/page.tsx
│   ├── IndexHero
│   ├── SignalBreakdownGrid
│   ├── ContrarianAnalysisPanel
│   ├── CrossAssetHeatmap
│   ├── HistoricalAnalogs
│   └── MethodologySection
│
├── history/page.tsx
│   ├── IndexHistoryChart
│   ├── ThresholdEventList
│   └── EventStudyChart
│
├── guide/page.tsx
│   ├── GuideHero
│   ├── SignalMethodCards
│   └── InterpretationGuide
│
└── subscribe/page.tsx
    └── AlertSignupForm
```

---

## 모바일 반응형 원칙

- 7 signal 카드는 모바일 1열 또는 2열
- heatmap은 모바일에서 가로 스크롤 허용 가능
- buy/sell 패널은 모바일에서 세로 스택
- hero summary의 핵심 숫자/레짐/한줄 해석은 최상단에서 바로 보여야 함

---

## 정보 구조 원칙

1. **현재 상태 → 과거 유사 사례 → 자산별 결과** 순서 유지
2. 점수만 보여주지 말고, 행동 판단에 필요한 맥락을 함께 제시
3. 미국 Fear & Greed clone 느낌이 아니라 **한국 시장용 자체 지수**라는 인상을 줘야 함
4. 시각적으로도 `7 local signals`가 제품의 정체성으로 읽혀야 함
