# FEATURES — 무료 vs 유료 스펙 (K-FGI 버전)

**제품**: Korea Fear & Greed Index Dashboard  
**모델**: Freemium 가능, 하지만 핵심 가치는 먼저 분석 경험에 둔다

---

## 무료 / 유료 기능 테이블

| # | 기능 | 무료 | 유료 (Pro) | 비고 |
|---|------|:----:|:----------:|------|
| 1 | 오늘의 K-FGI 점수 + 레짐 | ✅ | ✅ | 핵심 가치 |
| 2 | 7개 로컬 시그널 요약 | ✅ | ✅ | momentum / breadth / VKOSPI 등 |
| 3 | 현재와 유사한 과거 사례 수 | ✅ | ✅ | |
| 4 | Buy Timing Analysis 기본 보기 | ✅ | ✅ | threshold 기본값 제공 |
| 5 | Sell Timing Analysis 기본 보기 | ✅ | ✅ | |
| 6 | Cross-asset heatmap 기본 보기 | ✅ | ✅ | 자산/기간 축 기본 제공 |
| 7 | Historical analog cases Top 3 | ✅ | ✅ | |
| 8 | Methodology / disclaimer | ✅ | ✅ | 신뢰 핵심 |
| 9 | threshold 커스터마이징 | △ | ✅ | 무료는 preset, Pro는 자유 조정 가능 |
| 10 | 고급 event study chart | ❌ | ✅ | 개별 사례 오버레이 포함 |
| 11 | extended history / longer horizons | ❌ | ✅ | 예: 1Y+, 다중 시계열 |
| 12 | 알림/리포트 구독 | ❌ | ✅ | extreme fear / greed 진입 알림 |
| 13 | 데이터 다운로드 / API | ❌ | ✅ | phase 2 고려 |

---

## 제품 원칙

중요한 건 “무엇을 잠그느냐”보다 **핵심 제품 경험이 무료에서도 성립해야 한다**는 점이다.

무료 버전에서도 사용자는 반드시 아래를 얻어야 한다:
- 한국 시장 현재 심리 상태
- 7개 구성 시그널 요약
- 과거 유사 구간 이후 자산 반응의 기본 그림

즉, 무료 버전은 맛보기 수준이 아니라 **제품 정체성을 이해할 수 있는 버전**이어야 한다.

---

## 유료화가 자연스러운 지점

유료는 아래처럼 “깊이”를 파는 구조가 적합하다:
- 더 긴 히스토리
- 더 많은 유사 사례 비교
- threshold/custom analysis
- event study 세부 차트
- alert/reporting
- export/API

즉, **기본 인사이트는 무료, 반복 활용과 깊이는 유료**가 적절하다.

---

## 당장 문서/구현에서 피할 것

- 미국 데이터 기반 해석을 유료 가치처럼 포장하지 말 것
- 단순 점수 숫자만 무료로 두고 핵심 해석을 모두 잠그지 말 것
- 제품이 “Fear & Greed 복제앱 + 결제벽”처럼 보이게 하지 말 것

---

## 추천 MVP 해석

현재 단계에서는 유료보다 먼저 다음이 더 중요하다:
1. K-FGI 정의가 명확한가
2. 7개 시그널이 설득력 있는가
3. buy/sell contrarian analysis가 유용한가
4. 한국 시장용 지수라는 차별점이 분명한가

즉, v1에서는 유료 전략보다 **제품 신뢰도와 분석 경험 완성도**가 우선이다.
