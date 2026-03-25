# BUILD BRIEF — Korea Fear & Greed Index v1

**대상**: 코딩 에이전트 / 개발자 핸드오프  
**작성일**: 2026-03-25  
**목표 완료**: 한국형 7-factor 지수 기반 분석형 MVP

---

## 1. 제품 정의

이 프로젝트는 미국 시장의 Fear & Greed 개념을 그대로 보여주는 앱이 아니다.  
목표는 **한국 시장용 자체 합성 심리지수(Korea Fear & Greed Index, K-FGI)** 를 만들고,
그 지수가 극단 구간에 들어갔을 때 **과거 유사 사례 이후 자산 가격이 어떻게 반응했는지**를 보여주는 것이다.

핵심 제품 가치는 다음 3가지다:
1. 오늘 한국 시장 심리가 어디에 있는가
2. 7개 로컬 시그널 중 어떤 요인이 공포/탐욕을 만들고 있는가
3. 비슷한 과거 구간 이후 주식/원자재/코인 등이 어떻게 움직였는가

---

## 2. 기술 스택

| 레이어 | 선택 | 이유 |
|--------|------|------|
| 프레임워크 | Next.js 16 (App Router) | 현재 프로젝트 스택 기준 |
| 언어 | TypeScript strict | 계산/도메인 모델 안정성 |
| 스타일 | Tailwind CSS v4 | 빠른 UI 반복 |
| 차트 | Recharts | heatmap / event study / line chart 구현 용이 |
| 상태관리 | Zustand v5 | 지수/필터/threshold 상태 |
| DB | 우선 없음 또는 lightweight cache | 초기에는 정적/로컬 데이터 또는 서버 캐시 우선 |
| 배포 | Vercel 또는 동등 환경 | 기존 흐름 유지 |
| Cron | 추후 도입 가능 | 일별 지수 계산/갱신 자동화 |

---

## 3. K-FGI 7개 구성 요소

미국 Fear & Greed 7개 개념을 한국 시장 프록시로 치환한다.

### 1) Price Momentum
- 지표: **KOSPI vs 125일 이동평균 괴리율**
- 의미: 장기 추세 대비 과열/과매도 판단

### 2) Stock Price Strength
- 지표: **KOSPI+KOSDAQ 52주 신고가 수 vs 신저가 수**
- 의미: 시장 내부 강도

### 3) Stock Price Breadth
- 지표: **상승 종목 수 vs 하락 종목 수** 또는 상승/하락 거래대금 비율
- 의미: 시장 폭

### 4) Put/Call Options
- 지표: **KOSPI200 옵션 Put/Call Ratio**
- 의미: 헤지 수요와 옵션 심리
- 비고: 데이터 수급이 어렵다면 v1에서는 placeholder 또는 phase 1.1 처리 가능

### 5) Safe Haven Demand
- 지표: **KOSPI 상대 국채 성과**
- 예: KOSPI 수익률 - 국채 ETF 수익률
- 의미: 위험자산 vs 안전자산 선호

### 6) Market Volatility
- 지표: **VKOSPI**
- 의미: 한국 시장 변동성 기반 공포/안도

### 7) Credit Risk Demand
- 지표: **회사채 - 국고채 스프레드**
- 예: 회사채 AA- 3년 vs 국고채 3년
- 의미: 신용 리스크 선호/회피

---

## 4. 데이터 모델 개요

초기 구현은 아래 구조를 기본으로 한다.

```typescript
type SignalKey =
  | 'momentum'
  | 'strength'
  | 'breadth'
  | 'putCall'
  | 'safeHaven'
  | 'volatility'
  | 'credit';

type SignalReading = {
  key: SignalKey;
  label: string;
  rawValue: number | null;
  normalizedScore: number; // 0~100, 높을수록 greed
  regime: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  summary: string;
};

type DailyIndexSnapshot = {
  date: string;
  score: number; // K-FGI composite 0~100
  regime: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  signals: SignalReading[];
};
```

---

## 5. 점수 계산 원칙

### 정규화 원칙
- 각 지표를 0~100 범위로 정규화
- 0 = extreme fear 쪽, 100 = extreme greed 쪽
- 동일 가중 평균을 기본값으로 사용
- 이후 필요시 가중치 조정 가능하지만 v1은 **equal weight** 우선

### 합성 점수
```typescript
function calcKfgiScore(signals: SignalReading[]): number {
  const validSignals = signals.filter((s) => Number.isFinite(s.normalizedScore));
  if (validSignals.length === 0) return 50;
  const avg = validSignals.reduce((sum, s) => sum + s.normalizedScore, 0) / validSignals.length;
  return Math.round(avg);
}
```

### 레짐 구간
- 0–24: Extreme Fear
- 25–44: Fear
- 45–55: Neutral
- 56–74: Greed
- 75–100: Extreme Greed

---

## 6. 핵심 UI 표면

### `/dashboard`
핵심 목표:
- 현재 K-FGI 점수
- 현재 레짐
- 7개 시그널 기여도
- 현재와 유사한 과거 구간의 forward returns 요약

주요 섹션:
1. Hero Summary
2. 7 Signals Today
3. Buy Timing Analysis
4. Sell Timing Analysis
5. Cross-Asset Heatmap
6. Historical Analog Cases
7. Methodology / Disclaimer

### `/history`
- K-FGI 시계열 추이
- 과거 extreme fear / extreme greed 이벤트 강조
- 향후 event study 확장 고려

### `/guide`
- K-FGI 각 레짐에 대한 해석
- 직접 투자 추천이 아니라 해석형 문구

### `/subscribe`
- 필요 시 나중에 유지하되, 현재 핵심 제품 메시지를 방해하지 않도록 단순화

---

## 7. 자산 분석 범위

초기 자산군 후보:
- KOSPI
- KOSDAQ
- S&P 500 (비교용)
- Bitcoin
- Ethereum
- Gold
- Oil
- Optional: USD/KRW 또는 DXY

forward return horizon:
- 7D
- 30D
- 90D
- 180D

표시 메트릭:
- 평균 수익률
- 중앙값
- 승률
- 최대 낙폭 / 최대 추가 하락

---

## 8. 핵심 컴포넌트

### `IndexHero`
- 현재 K-FGI score
- regime label
- contrarian summary
- 유사 사례 수

### `SignalBreakdownGrid`
- 7개 시그널 카드
- raw value + normalized state + short explanation

### `ContrarianAnalysisPanel`
- buy threshold / sell threshold
- historical case count
- forward returns table/cards

### `CrossAssetHeatmap`
- 행: 자산
- 열: 7D / 30D / 90D / 180D
- 메트릭 토글: avg / median / win rate

### `HistoricalAnalogs`
- top 3 유사 과거 사례
- 날짜 / 점수 / 이후 성과 / 유사도

### `MethodologySection`
- 7개 지표 정의
- 정규화 방식
- 표본 수
- 면책 문구

---

## 9. 구현 우선순위

### Phase A — 문서/도메인 전환
- 기존 MOODEX / 미국 데이터 중심 설명 제거
- K-FGI / 한국형 7-factor 설명으로 전환

### Phase B — UI 구조 전환
- dashboard를 현재 점수 위젯형에서 분석형 구조로 재편
- 7 signals / buy vs sell / heatmap / analogs 중심으로 재배치

### Phase C — 데이터 연결
- 각 시그널 raw data source 정리
- normalized score 계산 함수 구현
- composite score 계산
- 과거 사례 분류 및 forward return 계산

### Phase D — 자동화
- 일별 스냅샷 저장
- 히스토리 갱신
- 필요 시 cron 도입

---

## 10. 주의사항

- 제품은 **투자 조언 앱처럼 보이면 안 된다**
- 문구는 반드시 해석형/확률형으로 유지
- 한국 시장용 지수라는 정체성을 UI와 문서에 일관되게 반영
- 미국 Fear & Greed clone처럼 보이는 카피는 제거
- KOSPI/KOSDAQ/VKOSPI/신용스프레드 등 로컬 신호의 설명력을 강조

---

## 11. Acceptance Criteria

- [ ] 문서 전반이 K-FGI 기준으로 정렬되어 있다
- [ ] dashboard가 한국형 7-factor 분석 대시보드 구조를 따른다
- [ ] 7개 시그널 카드가 존재한다
- [ ] buy/sell contrarian analysis UI가 존재한다
- [ ] cross-asset heatmap 또는 동등 비교 UI가 존재한다
- [ ] historical analog cases 섹션이 존재한다
- [ ] methodology에 7개 시그널 정의와 disclaimer가 표시된다
- [ ] 미국 데이터 설명 중심 표현이 핵심 문서에서 제거되었다
