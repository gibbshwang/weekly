# Changelog

All notable changes to this project will be documented in this file.

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
