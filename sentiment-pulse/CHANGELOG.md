# Changelog

All notable changes to this project will be documented in this file.

## [0.2.2.0] - 2026-04-12

### Added
- AI 이혼 법률 가이드 Phase 2: Wizard UI + Analysis Pipeline
- 위저드 입력 시스템: WizardContainer, IntroStep, DivorceReasonStep, ChildrenStep, AssetStep, MarriageDurationStep, SafetyBranch, WizardProgress
- Zustand 위저드 스토어 (`wizardStore.ts`): 다단계 입력 상태 관리
- 스트리밍 분석 결과 UI: ResultsContainer, IssueChecklist, LawyerQuestions, PrecedentSection, StatuteSection, SourceBadge
- `useAnalysisStream` 훅: `/api/analyze` SSE 스트리밍 연결 + 파싱
- `parseAnalysisStream.ts`: 스트리밍 응답 파서 (issues, statutes, precedents, questions 섹션)
- `dvDetector.ts`: 가정폭력 키워드 감지기 (SafetyBranch 분기용)
- `pipelineOrchestrator.ts`: 법제처 검색 → Claude 분석 전체 파이프라인
- `/wizard` 페이지 라우트 + 랜딩 페이지 CTA 연결
- next-intl i18n 라우팅 (`/ko/...`, `/en/...`)
- 59 new tests (총 114): wizardStore 7, parseAnalysisStream 6, dvDetector 4, pipelineOrchestrator 8, useAnalysisStream 7, WizardContainer 3, IntroStep 2, DivorceReasonStep 3, ResultsContainer 6, SourceBadge 1, StatuteSection 2, PrecedentSection 2, WizardPage 4, API route 4

### Fixed
- `useAnalysisStream`: response.body null guard 추가 (SSE 안전성)

## [0.2.1.0] - 2026-04-12

### Added
- AI 이혼 법률 가이드 플랫폼 Phase 1 Foundation
- Next.js 15 프로젝트 스캐폴딩 (src/ 디렉토리, Firebase Auth/Admin, TypeScript strict)
- 법제처 Open API 래퍼 (`koreanLawClient.ts`): 법령 검색, 판례 검색, 법령 상세 조회, rate limiting
- Claude API 클라이언트 + 규제 준수 시스템 프롬프트 (법률 자문 금지 강제)
- 컴플라이언스 필터 (`complianceFilter.ts`): 법적 결론/예측/금액 패턴 실시간 차단, 롤링 버퍼로 cross-chunk 우회 방지
- 분석 파이프라인 오케스트레이터: 법제처 검색 → Claude 스트리밍 → 컴플라이언스 필터 → 클라이언트
- `/api/analyze` Route Handler: Firebase Auth 토큰 검증, 입력 2000자 제한, 스트리밍 응답
- DV 안전 UI: QuickExitButton (history.replaceState + 리다이렉트), EmergencyContacts (1366/112), IncognitoGuidance
- 법률 면책 UI: DisclaimerBanner, LawyerCTA (법률구조공단/132 링크), PrivacyNotice
- AuthProvider (Firebase Anonymous Auth context)
- 55 tests (Vitest): API route 6, koreanLawClient 9, complianceFilter 13, claudeClient 5, pipeline 6, UI components 10
- Warm gray (#F5F3F0) + deep teal (#1B6B5A) 디자인 시스템, Pretendard 폰트

### Fixed
- 보안 수정 6건: rolling buffer filter, Firebase auth 검증, 입력 길이 제한, 에러 메시지 일반화, html lang="ko"

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
