# CLAUDE.md — sentiment-pulse implementation notes

## Current product direction

**Korea Fear & Greed Index** — 한국 시장 심리 분석 대시보드.

미국 Fear & Greed의 7가지 개념을 한국 시장 프록시로 재구성한 자체 합성 심리지수.
제품 정체성은 “한국형 로컬 시그널 기반 분석 도구”이다.

### The 7 signals
1. KOSPI momentum vs 125DMA
2. 52-week highs vs lows (KOSPI + KOSDAQ)
3. Market breadth (KOSDAQ vs KOSPI 상대 성과)
4. Put/Call ratio (KODEX 인버스 vs KODEX 200 거래량 비율)
5. Safe haven demand (KOSPI vs 국고채 상대 성과)
6. Volatility (VKOSPI proxy — 20일 실현 변동성)
7. Credit spread (회사채 ETF vs 국채 ETF 수익률 차이)

### Data source
- Yahoo Finance v8 chart API (server-side fetch)
- ISR revalidate: **86400초 (24시간)** — Vercel Cron이 매일 16:00 KST에 갱신
- Cron endpoint: `app/api/cron/daily-update/route.ts` (CRON_SECRET으로 보호)
- AI 라벨: `lib/ai/generateCaseLabels.ts` (Claude Haiku, ANTHROPIC_API_KEY 필요)
- 모든 시그널은 `lib/api/yahoo.ts`에서 fetch → `lib/engine/normalize.ts`에서 0–100 정규화

## Product goal

단순 심리 위젯이 아닌, **narrative-driven 분석 대시보드**:
- 현재 한국 시장 regime 판단
- 과거 유사 구간에서 자산이 어떻게 반응했는지 보여줌
- 확률 기반 해석 (투자 추천 아님)

## Core UX structure (narrative flow)

대시보드는 아래 순서의 스토리 흐름을 따른다:

1. **HookSection** — ScoreGauge(점수 먼저) + 행동 가이드(해석 후)
   - 게이지가 왼쪽, 액션 가이드가 오른쪽 (`grid-cols-[200px_1fr]`)
   - 백분위 + 승률 요약 한 줄 포함
2. **PercentileContext** — 5구간 히스토리컬 백분위 바
   - “과거 10년간 현재보다 낮았던 날이 X%”
   - 유사 구간(±15점) 진입 총 N건 (전체 매칭 케이스 수)
3. **StoryCard** × 3 — 대표 사례 (전체 매칭 풀에서 가장 유사한 3건)
   - 헤더: “유사 구간 전체 N건 중 대표 사례”
4. **VerdictSection** — consensus 통계 (전체 매칭 케이스 기반)
   - WinRateBar, ReturnGrid, consensus headline
5. **FinePrintSection** — 시그널 상세 + K-FGI vs 자산가격 차트

## Data architecture

### Historical context (`lib/data/historicalCases.ts`)
- `computePercentile(score, allScores)`: 3년치 실제 rolling scores에서 백분위 계산
- `buildHistoricalContext(score)`: percentile + similarEvents (async, Yahoo 데이터 기반)

### Consensus vs Display 분리
- **표시용 (display)**: `getSimilarCaseReturns()` → 3건 (StoryCard에 표시)
- **통계용 (consensus)**: `getAllMatchingCaseReturns()` → 전체 매칭 케이스
- `getConsensusSummary(allMatchingCases)`: 승률, 평균 수익률, headline 계산
- VerdictSection과 HookSection의 winRate는 **전체 매칭 케이스** 기준

### Rolling scores (`lib/data/chartData.ts`)
- KOSPI 3년 데이터로 rolling K-FGI 점수 계산
- momentum(125DMA), volatility(20일 실현변동성), strength(52주 고점 대비) 사용
- `getKfgiPriceData()`: 자산별 × 기간별 K-FGI vs 가격 차트 데이터

## Tone and product constraints

- 직접적인 투자 조언으로 프레이밍하지 않는다.
- “역사적으로…”, “과거 유사 구간에서…”, “이 설정은 ~와 연관되었다” 등의 표현 사용
- CNN Fear & Greed 카피가 아닌 **한국 시장 네이티브 인덱스**로서의 정체성 유지

## Documentation sources of truth

- `PRD.md`, `PRD-ONE-PAGER.md`
- `BUILD-BRIEF.md`, `MVP-IA.md`
- `FEATURES-FREE-PAID.md`
- `DESIGN.md` — 디자인 시스템

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Testing
- Framework: Vitest
- Run: `npx vitest run`
- Test directory: `test/`
- 19 tests covering data functions and regime utilities
