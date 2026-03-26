# K-FGI Calculation Specification

## 7 Signals — 정규화 규칙

각 시그널은 raw value를 0~100 범위로 정규화한다.
0 = extreme fear, 100 = extreme greed.

### 1. momentum — KOSPI 모멘텀
- **Raw value**: `(KOSPI종가 / KOSPI 125일SMA - 1) × 100` (%)
- **Range**: [-8, +8]
- **Inverted**: No
- **해석**: 양수 = 장기 추세 위 (greed), 음수 = 장기 추세 아래 (fear)

### 2. strength — 주가 강도
- **Raw value**: `52주신고가수 / (52주신고가수 + 52주신저가수)` (KOSPI+KOSDAQ)
- **Range**: [0.1, 0.9]
- **Inverted**: No
- **해석**: 신고가 비율 높음 = 시장 강도 높음 (greed)

### 3. breadth — 시장 폭
- **Raw value**: `상승종목수 / (상승종목수 + 하락종목수)`
- **Range**: [0.3, 0.7]
- **Inverted**: No
- **해석**: 상승 종목 우세 = 광범위한 참여 (greed)

### 4. putCall — 풋/콜 비율
- **Raw value**: `KOSPI200 Put거래량 / Call거래량`
- **Range**: [0.6, 1.4]
- **Inverted**: **Yes** (높을수록 fear)
- **해석**: 풋 비중 높음 = 헤지 수요 증가 (fear)

### 5. safeHaven — 안전자산 수요
- **Raw value**: `KOSPI 20일수익률 - 국채ETF 20일수익률` (pp)
- **Range**: [-10, +10]
- **Inverted**: No
- **해석**: KOSPI 우위 = 위험자산 선호 (greed), 국채 우위 = 안전자산 선호 (fear)

### 6. volatility — 시장 변동성 (VKOSPI)
- **Raw value**: VKOSPI 지수
- **Range**: [12, 35]
- **Inverted**: **Yes** (높을수록 fear)
- **해석**: VKOSPI 높음 = 변동성 공포 (fear)

### 7. credit — 신용 스프레드
- **Raw value**: `회사채 AA- 3년 금리 - 국고채 3년 금리` (bps)
- **Range**: [40, 150]
- **Inverted**: **Yes** (넓을수록 fear)
- **해석**: 스프레드 확대 = 신용 위험 회피 (fear)

---

## 정규화 공식

```
ratio = (rawValue - rangeMin) / (rangeMax - rangeMin)
ratio = clamp(ratio, 0, 1)
if inverted: ratio = 1 - ratio
normalizedScore = round(ratio × 100)
```

---

## Composite Score

- 유효한 시그널(rawValue ≠ null)만 포함
- **Equal-weight average**: `sum(normalizedScores) / count`
- 유효 시그널 0개 → 50 반환
- 결과는 정수 반올림

---

## Regime 분류

| 범위 | Regime |
|------|--------|
| 0–24 | extreme_fear |
| 25–44 | fear |
| 45–55 | neutral |
| 56–74 | greed |
| 75–100 | extreme_greed |

---

## Missing Data 처리

- `rawValue: null` → `normalizedScore: NaN`
- composite 계산에서 제외
- UI에서 해당 시그널 카드는 "데이터 없음" 상태로 표시
- 전체 시그널이 null이면 composite = 50 (neutral fallback)

---

## 데이터 소스 (v1 계획)

| Signal | 후보 소스 | 비고 |
|--------|-----------|------|
| momentum | KRX / 네이버금융 | KOSPI 종가 + 125일 SMA |
| strength | KRX | 52주 신고가/신저가 종목 수 |
| breadth | KRX | 상승/하락 종목 수 |
| putCall | KRX 파생상품 | KOSPI200 옵션 거래량. 데이터 수급 어려울 시 placeholder |
| safeHaven | KRX + 채권시장 | KOSPI vs 국채 ETF (KOSEF 국고채10년) |
| volatility | KRX | VKOSPI |
| credit | 금융투자협회 | AA- 3년 회사채 vs 국고채 3년 |
