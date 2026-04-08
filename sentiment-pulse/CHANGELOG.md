# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0.0] - 2026-03-28

### Changed
- Dashboard layout: ScoreGauge를 왼쪽(먼저), 행동 가이드를 오른쪽으로 배치 변경
- 백분위 표현 개선: "10년 중 하위 X%" → "과거 10년간 현재보다 낮았던 날이 X%"
- Consensus 통계를 전체 매칭 케이스 풀 기반으로 변경 (기존 표시용 3건 → 전체 매칭)
- 대표 사례 헤더: "가장 유사한 사례 N건" → "유사 구간 전체 N건 중 대표 사례"
- ScoreGauge 비주얼 개선: 바늘-숫자 간격 확대, 게이지 크기 조정, 슬림한 아크
- ISR revalidate 간격: 24시간(86400s), Vercel Cron이 매일 16:00 KST에 갱신

### Added
- `findAllMatchingCases()`: ±15점 범위 전체 매칭 케이스 반환 함수
- `getAllMatchingCaseReturns()`: 전체 매칭 케이스 기반 데이터 fetch 함수
- Display(3건) vs Consensus(전체) 데이터 분리 아키텍처

## [0.2.0.0] - 2026-03-28

### Added
- Narrative-driven dashboard UX: Hook → Context → Stories → Verdict → Fine Print
- HookSection with ScoreGauge, regime badge, percentile + win rate summary
- PercentileContext with 5-zone historical percentile bar
- StoryCard for similar historical case visualization with sparkline charts
- VerdictSection with WinRateBar, ReturnGrid, and consensus headline
- FinePrintSection with collapsible signal details and K-FGI vs asset price chart
- Shared regime constants (colors, labels, score-to-regime mapping)
- TypeScript types for narrative data: SimilarCaseWithReturns, ConsensusSummary, CaseReturn
- Mock narrative data: 3 historical analog cases with per-asset forward returns
- getConsensusSummary() computing win rate, average returns, and headline from cases
- Vitest test framework with 19 tests covering data functions and regime utilities
- DESIGN.md design system specification

### Changed
- Dashboard page rewritten from component grid to story-based narrative flow
- ScoreGauge refactored to use shared regime constants (DRY)
- CSS custom properties updated for dark navy theme per DESIGN.md

### Removed
- BuyTimingAnalysis, SellTimingAnalysis (replaced by unified TimingAnalysis)
- EmailCTA, InterpretationCard, ProPreview (removed unused components)
