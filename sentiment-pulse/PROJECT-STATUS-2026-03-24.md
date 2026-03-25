# sentiment-pulse 진행 기록 — 2026-03-25 업데이트

## 개요

프로젝트명: **sentiment-pulse**  
현재 제품 정의: **Korea Fear & Greed Index (K-FGI)**

한 줄 정의:
미국 Fear & Greed의 7가지 개념을 한국 시장 데이터로 재구성하고,
극단적 공포/탐욕 구간에서 과거 유사 사례 이후 자산 반응을 비교해 보여주는 분석형 대시보드.

---

## 이번 업데이트의 핵심 변화

### 1. 제품 정의 전환
기존에는 MOODEX / 미국 시장심리 해석 앱에 가까운 방향이었지만,
이번 업데이트에서 제품 정의를 아래처럼 명확히 전환했다.

- 미국 지표를 해석하는 앱이 아니라
- **한국 시장용 자체 합성 심리지수(K-FGI)** 를 만드는 제품
- 미국 Fear & Greed의 7개 개념은 참고 프레임일 뿐,
  실제 데이터는 한국 시장 프록시로 재구성

즉, 제품의 정체성이 더 선명해졌다:
- KOSPI
- KOSDAQ
- VKOSPI
- Put/Call
- 국채/안전자산 선호
- 신용스프레드
같은 로컬 시그널이 중심이 된다.

---

### 2. PRD 개편
다음 문서가 새 방향으로 정리되었다.

- `PRD-ONE-PAGER.md`
- `PRD.md`

핵심 반영 내용:
- Fear & Greed를 단순 심리 지표가 아니라
  **역발상 매수/매도 분석 도구**로 정의
- 현재 점수 + 과거 유사 사례 + 자산별 후속 성과를 함께 보여주는 제품으로 개편
- buy timing / sell timing / heatmap / historical analogs / methodology 중심 구조 반영
- 이후 추가로 한국형 7-factor 지수 방향까지 반영 시작

---

### 3. 관련 문서 정렬
아래 문서들을 K-FGI 방향에 맞게 재정렬했다.

- `README.md`
- `BUILD-BRIEF.md`
- `MVP-IA.md`
- `FEATURES-FREE-PAID.md`

정렬 방향:
- MOODEX / 미국 데이터 중심 설명 축소
- K-FGI / 한국형 7개 시그널 중심 구조 강화
- 제품을 clone이 아니라 **한국형 지수 + 분석 대시보드**로 설명

---

## 현재 제품 철학

### 핵심 원칙
1. **Signal over sentiment**
   - 숫자만 보여주지 말고 해석 가능한 신호를 제공한다.

2. **Historical context matters**
   - 현재 점수보다 과거 유사 사례 이후 결과가 중요하다.

3. **Probabilistic, not absolute**
   - 투자 추천이 아니라 과거 패턴 기반 해석을 제공한다.

4. **Cross-asset insight**
   - 주식, 원자재, 코인 반응 차이를 함께 본다.

5. **Korean market first**
   - 제품 정체성은 한국형 로컬 시그널에 있다.

---

## 현재 해야 할 다음 단계

### 1. UI 리디자인 반영
현재 UI는 이전 방향의 흔적이 남아 있을 수 있으므로,
아래 구조로 점진 전환이 필요하다.

- K-FGI hero
- 7 signals today
- buy timing analysis
- sell timing analysis
- cross-asset heatmap
- historical analog cases
- methodology / disclaimer

### 2. 데이터 정의
- 7개 시그널 raw data source 확정
- 정규화 방식 정의
- composite score 계산 함수 작성
- regime 판별 로직 구현

### 3. 과거 사례 분석
- extreme fear / greed threshold 정의
- 과거 사례 추출
- 이후 7D / 30D / 90D / 180D 성과 계산
- 자산별 avg / median / win rate / drawdown 정리

---

## 현재 한 줄 상태

**제품은 미국 심리지표 해석 앱에서 한국형 7-factor Fear & Greed Index 분석 대시보드로 재정의되었고, 관련 핵심 문서들도 그 방향으로 반영되었다.**
