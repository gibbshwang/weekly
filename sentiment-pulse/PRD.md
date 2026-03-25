# PRD — Fear & Greed Contrarian Opportunity Dashboard

## 1. Product Overview

### Product Name
Fear & Greed Contrarian Opportunity Dashboard

### Product Vision
Fear & Greed 지수를 단순 시황 지표로 보여주는 것을 넘어서,  
**극단적 공포/탐욕 구간에서 과거 유사 사례 이후 자산별 가격이 어떻게 움직였는지 분석해 보여주는 의사결정 보조형 시장 인사이트 제품**을 만든다.

### Core Value
사용자는 현재 Fear & Greed 수치만 보는 것이 아니라:
- 지금 시장이 **역발상 매수 후보 구간인지**
- 혹은 **역발상 매도 후보 구간인지**
- 과거 유사 시기 이후에 주식, 원자재, 코인 등 주요 자산이 어떻게 반응했는지

를 한 화면에서 파악할 수 있다.

---

## 2. Problem

### Current Problem
기존 Fear & Greed UI는 보통 아래 수준에 머문다:
- 현재 지수 표시
- 공포/탐욕 라벨 표시
- 간단한 시장 분위기 설명

하지만 사용자는 실제로 더 궁금하다:
- 그래서 지금 들어가도 되는 구간인가?
- 비슷한 과거 사례에서는 이후 얼마나 반등했나?
- 극단 탐욕일 때 이후 실제로 얼마나 조정이 왔나?
- 주식과 비트코인, 원자재 반응이 서로 달랐나?

즉, 현재 상태보다 **그 이후 결과**가 더 중요하다.

### User Pain Points
- 숫자 하나만 봐서는 행동 판단이 어렵다.
- 공포/탐욕이 실제로 얼마나 유의미한 시그널인지 검증하기 어렵다.
- 자산군별 반응 차이를 한눈에 보기 어렵다.
- 매수/매도 타이밍 아이디어를 데이터 기반으로 보기 어렵다.

---

## 3. Goal

### Primary Goal
Fear & Greed 극단 구간을 기준으로 한 **과거 유사 사례 기반 자산 반응 분석 UI**를 제공한다.

### Secondary Goals
- “현재 상태”를 “행동 가능한 인사이트”로 변환
- 단일 지표를 **확률적/역사적 해석 도구**로 업그레이드
- 투자 판단을 단정하지 않고, **과거 패턴 기반 보조 지표**로 제시
- 자산군별 반응 차이를 시각적으로 비교 가능하게 함

---

## 4. Target Users

### Primary Users
- 미국 증시/코인/원자재 시장을 보는 개인 투자자
- 단기 과열/과매도 신호에 관심 있는 사용자
- 시장 심리를 역발상 관점으로 해석하려는 사용자

### Secondary Users
- 매크로/시장 데이터 콘텐츠 소비자
- 뉴스형 대시보드보다 더 깊은 해석을 원하는 사용자
- 시장 사이클 시각화 도구를 찾는 사용자

---

## 5. Product Principles

1. **Signal over sentiment**  
   단순 분위기 표시보다, 과거 결과를 함께 보여준다.

2. **Probabilistic, not absolute**  
   “지금 사라/팔아라”가 아니라 “과거 유사 구간에서는 이런 경향이 있었다”로 표현한다.

3. **Cross-asset insight**  
   주식, 원자재, 코인 등 자산별 반응 차이를 함께 보여준다.

4. **Historical context matters**  
   현재 지표만이 아니라 과거 유사 사례와 이후 경로를 보여준다.

5. **Trust through transparency**  
   표본 수, 기간, 계산 기준, 제한사항을 명시한다.

---

## 6. Core User Stories

### User Story 1
사용자로서, 현재 Fear & Greed 지수가 어떤 상태인지 보고 싶다.  
그래서 지금 시장이 공포인지 탐욕인지 즉시 이해하고 싶다.

### User Story 2
사용자로서, 현재 수치와 유사한 과거 사례가 몇 번 있었는지 알고 싶다.  
그래서 지금 상황이 드문지 흔한지 판단하고 싶다.

### User Story 3
사용자로서, 극단 공포 구간 이후 자산별 반등 패턴을 보고 싶다.  
그래서 역발상 매수 타이밍의 히스토리컬 근거를 확인하고 싶다.

### User Story 4
사용자로서, 극단 탐욕 구간 이후 자산별 조정 패턴을 보고 싶다.  
그래서 역발상 매도 타이밍의 히스토리컬 근거를 확인하고 싶다.

### User Story 5
사용자로서, 주식/원자재/코인의 반응 차이를 함께 보고 싶다.  
그래서 어떤 자산이 특정 심리 구간에 더 민감한지 알고 싶다.

### User Story 6
사용자로서, 과거 유사 사례 개별 이벤트를 보고 싶다.  
그래서 평균값만이 아니라 실제 사례 흐름을 이해하고 싶다.

---

## 7. MVP Scope

### 7.1 Top Summary Section
상단에는 현재 시장 상태와 즉시 해석 가능한 요약을 배치한다.

#### Required Elements
- Current Fear & Greed score
- State label
  - Extreme Fear
  - Fear
  - Neutral
  - Greed
  - Extreme Greed
- Contrarian insight summary
- Sample count for similar historical cases
- Key forward-return summary for selected assets

### 7.2 Contrarian Analysis Section
공포 구간과 탐욕 구간을 각각 분석하는 핵심 영역.

#### Block A — Buy Timing Analysis
조건:
- Fear & Greed score <= configurable threshold
- 기본값 예: 25

표시 항목:
- Number of historical cases
- Forward returns by asset: 7D / 30D / 90D / 180D
- Win rate
- Median return
- Maximum adverse move / drawdown after signal

#### Block B — Sell Timing Analysis
조건:
- Fear & Greed score >= configurable threshold
- 기본값 예: 75

표시 항목:
- Number of historical cases
- Forward returns by asset: 7D / 30D / 90D / 180D
- Probability of negative forward return
- Median return
- Maximum pullback after signal

### 7.3 Cross-Asset Comparison Heatmap
#### Assets
- S&P 500
- Nasdaq
- Bitcoin
- Ethereum
- Gold
- Oil
- Optional: DXY

#### Time Horizons
- 7D
- 30D
- 90D
- 180D

#### Metrics
- Average return
- Median return
- Win rate

### 7.4 Historical Analog Cases
#### Required Elements
- Top 3 similar historical cases
- Date of event
- Fear & Greed score at the time
- Short context label (optional/manual)
- Forward return summary after event
- Similarity indicator

### 7.5 Event Study Chart
#### Visualization
- x-axis: days after signal
- y-axis: cumulative return %
- thin lines: individual historical cases
- bold line: average path
- shaded band: dispersion/range/confidence band

### 7.6 Methodology / Transparency Section
#### Must Include
- Fear & Greed threshold definition
- Similarity logic
- Asset universe used
- Data range covered
- Forward return calculation logic
- Sample size explanation
- Limitations
- Disclaimer:
  - This is not investment advice
  - Past performance does not guarantee future results

---

## 8. Functional Requirements

1. 시스템은 현재 Fear & Greed score와 regime label을 표시해야 한다.
2. 사용자는 Buy/Sell 기준 threshold를 조정할 수 있어야 한다.
3. 시스템은 선택된 threshold에 맞는 과거 사례를 필터링해야 한다.
4. 시스템은 7D / 30D / 90D / 180D forward returns를 계산해야 한다.
5. 시스템은 자산별 수익률/승률/중앙값을 비교할 수 있어야 한다.
6. 시스템은 과거 각 사례의 이후 가격 경로와 평균 경로를 표시해야 한다.
7. 시스템은 현재와 가장 유사한 과거 사례를 최소 3개 제공해야 한다.
8. 시스템은 데이터 해석 한계와 투자 면책 문구를 표시해야 한다.

---

## 9. Non-Functional Requirements

### Performance
- 주요 요약 카드가 빠르게 표시되어야 한다.
- 시각화 렌더링은 사용자 체감상 지연이 적어야 한다.

### Clarity
- 숫자 과밀도를 피하고 핵심 요약 → 상세 분석 순으로 정보 계층화해야 한다.

### Trust
- 표본 수와 기준값을 항상 노출해야 한다.
- 평균만이 아닌 median / win rate도 제공해야 한다.

### Responsiveness
- 데스크톱 우선으로 설계하되 모바일에서도 핵심 요약과 자산 비교가 읽혀야 한다.

---

## 10. UX / Information Architecture

### Section Order
1. Hero Summary
2. Current Regime Snapshot
3. Buy Timing vs Sell Timing
4. Cross-Asset Heatmap
5. Event Study Chart
6. Historical Analog Cases
7. Methodology & Disclaimer

### UX Tone
- 확신을 강요하는 투자 추천형 문구 지양
- 분석형 / 해석형 톤 유지
- 예:
  - “Historically, similar setups were followed by…”
  - “In past extreme fear regimes…”
  - “This signal has historically been associated with…”

---

## 11. Success Metrics

### Product Metrics
- 사용자가 현재 지수와 과거 반응을 함께 조회하는 비율
- heatmap / event study interaction rate
- analog case section scroll/view rate

### UX Metrics
- 사용자가 threshold 조정을 실제로 사용하는지
- buy vs sell 양쪽 시나리오를 비교하는지
- methodology section 접근률

### Qualitative Success
- 사용자가 “현재 심리 상태”가 아니라 “과거 유사 사례 이후의 결과”를 이해하게 되는가
- 앱이 단순 뉴스형 위젯이 아니라 “시장 사이클 분석 도구”로 인식되는가

---

## 12. Risks & Caveats

1. **Overclaim risk**  
   사용자가 제품을 투자 조언으로 오해할 수 있음

2. **Small sample size**  
   극단 구간은 표본 수가 적을 수 있음

3. **Average distortion**  
   일부 급격한 반등/폭락 사례가 평균을 왜곡할 수 있음

4. **Cross-asset comparability**  
   자산별 변동성 차이로 단순 비교가 오해를 부를 수 있음

5. **Narrative bias**  
   유사 사례 선정 로직이 지나치게 임의적이면 신뢰를 잃을 수 있음

---

## 13. Recommended MVP Cut

### Include
- Current Fear & Greed summary
- Buy timing analysis
- Sell timing analysis
- Cross-asset comparison
- Top 3 historical analog cases
- Methodology / disclaimer

### Defer if needed
- Advanced similarity scoring
- Full event study with many overlays
- Manual macro annotations per historical case
- Highly customizable filters

---

## 14. Final Product Statement

이 제품은 Fear & Greed 지표를 단순 감정 표시 도구에서 벗어나,  
**극단 심리 구간에서 과거 시장이 어떻게 반응했는지를 자산별로 비교해 보여주는 역발상 투자 인사이트 대시보드**로 재정의한다.

핵심 차별점은 다음이다:
- 현재 상태 표시
- 과거 유사 사례 기반 분석
- 매수/매도 양방향 시나리오 비교
- 자산군별 반응 차이 시각화
- 데이터 기반 해석과 투명한 방법론 제시
