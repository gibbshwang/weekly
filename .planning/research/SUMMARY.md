# Project Research Summary

**Project:** AI 이혼 법률 가이드 플랫폼
**Domain:** AI legal information - Korean divorce law consultation preparation workspace
**Researched:** 2026-04-12
**Confidence:** HIGH

## Executive Summary

This is an AI-powered divorce law information platform targeting Korean users who need structured help preparing for attorney consultations. The core product insight - confirmed by competitive landscape analysis - is that no existing service fills the 상담 준비 워크스페이스 niche: current offerings are either shallow free-form chatbots (Law&Bot) or lawyer-only research tools (빅케이스, 슈퍼로이어). The recommended architecture is a three-layer BFF pattern: a multi-step wizard client (React 19 / Next.js 15) submits structured situation data to a Next.js Route Handler, which orchestrates law API lookups and Claude streaming in sequence, returning a structured report. The entire stack mirrors the sibling project (mbti-ai-live-chat), lowering implementation risk significantly.

The non-negotiable regulatory constraint is 변호사법 109조: generating legal conclusions (outcome predictions, settlement amounts, fault determinations) carries up to 7 years imprisonment. The 대법원 로폼 판결 (2025.2) made explicit that AI services receiving individual case inputs and producing legal evaluations constitute 법률사무 취급. Every design decision flows from this constraint - the product must remain a 쟁점 체크리스트 + 변호사 질문 목록 generator, not an advisor. The recommended mitigation is architectural: the law API is the source of truth for citations, and Claude is a language-conversion layer only - never a reasoning layer.

The two other critical risks are DV user safety and PIPA compliance. Users in domestic violence situations will access this service and the emergency exit UX must actually protect them (history replacement, sessionStorage clear, zero auto-save) - not just visually. All wizard data must remain in memory only until explicit user consent to save, because divorce/DV details qualify as PIPA 민감정보. These are safety and legal requirements, not enhancements, and must ship in Phase 1.

---

## Key Findings

### Recommended Stack

The stack is a direct extension of the sibling project (mbti-ai-live-chat) with one new integration layer: the 법제처 Open API. Next.js 15 App Router with React 19 and TypeScript strict mode is the foundation. The streaming route handler must use runtime = nodejs - NOT edge - because the Anthropic SDK requires Node.js APIs. A fast-xml-parser layer normalizes the 법제처 XML responses to typed JS objects at the API boundary.

**Core technologies:**
- **Next.js 15 + React 19**: App Router SSR, Route Handlers, streaming - project constraint, battle-tested in sibling
- **@anthropic-ai/sdk + Vercel AI SDK**: Claude streaming with timeout-safe SSE - both required, not interchangeable
- **claude-sonnet-4-6**: Model constraint - do not downgrade to Haiku for legal content (accuracy risk)
- **Firebase (anonymous auth + Admin SDK)**: PIPA-compliant auth, lazy Proxy init pattern from sibling prevents Vercel build failures
- **법제처 Open API + fast-xml-parser**: Direct HTTP, XML normalized at boundary, OC key oneday24n1 in server-only env
- **Zustand 5 + react-hook-form 7 + Zod 3**: Wizard state machine - curried create<T>() form, Zod 4 deferred
- **Tailwind 4 + shadcn/ui**: CSS-first styling; use shadcn for Dialog/Accordion/RadioGroup; build custom wizard stepper
- **Vitest 4 + testing-library**: TDD-first, same versions as sibling
- **next-intl 4**: Ko/En i18n, Korean default locale, path-based routing

### Expected Features

**Must have (table stakes) - Phase 1-2:**
- 상황 입력 위저드 (결혼기간, 자녀, 재산, 이혼 사유) - the product entry point
- AI 쟁점 분석 (협의/재판이혼 판단 + 쟁점 목록) - core value delivery
- 관련 법령 + 유사 판례 표시 (법제처 API) - trust foundation and legal defensibility
- 변호사 질문 목록 생성 - primary differentiator, legally safe
- 면책 고지 (all pages, persistent) - regulatory requirement
- 변호사 상담 CTA - expected by users, required for positioning
- 모바일 반응형 (375px, 48px touch targets) - majority of users on mobile
- 익명 사용 (Firebase anonymous auth) + 즉시 전체삭제 - PIPA and trust
- DV 안전 UX (긴급 탈출 버튼 + abuse 감지 브랜치) - user safety, no competitive equivalent

**Should have (differentiators) - Phase 2-3:**
- AI 쉬운 말 변환 (법령/판례 원문 + 요약 병렬 제공)
- 쟁점 우선순위 정렬 (중요도 순)
- 출체 명시 (법령 조문 번호 + 판례 번호 직접 링크)

**Defer (v1.1+):**
- 세션 저장 + 재방문 (Google 로그인, Firestore)
- PDF 다운로드 (PIPA 부담 증가, 브라우저 인쇄로 대체)
- 이혼 외 법률 영역 확장

**Anti-features (never build):**
- 재산분할/위자료 금액 예측 - 변호사법 109조 위반
- 이혼 가능성 % - 법적 추론 생성
- AI 소장 자동 작성 - 직접 법률사무
- 챗봇 자유 질문 - 포지셔닝 후손

### Architecture Approach

Three-layer BFF architecture: client UI layer (wizard intake + streaming output) calls a Next.js API layer (Route Handlers that orchestrate law API lookups + Claude streaming), which calls external services (법제처 API, Claude API, Firebase). The pipeline: wizard submit => POST /api/analyze => sequential law API queries => Claude stream assembled from law results => SSE stream returned to client incrementally. All law API calls are server-side only (OC key never reaches browser). Firebase writes happen only after explicit user consent.

**Major components:**
1. **WizardForm** - multi-step situation intake, local React state only (never auto-saves)
2. **pipelineOrchestrator.ts** - core business logic: situation => law queries => Claude prompt => stream
3. **lawApiClient.ts** - HTTP wrapper for 법제처 API, XML normalization, 500ms rate-limit guard, synonym map, HTML strip
4. **claudeClient.ts** - Anthropic SDK wrapper, prompt builder with hard regulatory guardrails
5. **DVSafetyOverlay + dvDetector.ts** - client-side DV signal detection, emergency exit (history replace + storage clear)
6. **AnalysisStream + ReportView** - SSE consumer for incremental render, structured output display
7. **firestoreAdmin.ts** - lazy Proxy init, typed helpers, save-gate controlled writes only

### Critical Pitfalls

1. **변호사법 109조 위반 (C-1)** - Claude must never produce individualized legal conclusions. Enforce via: hard system prompt guardrails, output structured as 일반적으로 검토되는 쟁점 never 귀하의 경우, post-processing filter on individualizing language, red-team testing before any public launch.

2. **판례 법령 환각 (C-2)** - Claude must not generate citation numbers. Architecture rule: 법제처 API is the only source of law/precedent data. Claude receives raw API results and performs language conversion only. UI must clearly label 법제처 API 검색 결과 vs Claude-generated text.

3. **DV 탈출 버튼 불완전 (C-3)** - Quick exit must go beyond navigation: window.history.replaceState(), sessionStorage.clear(), all wizard state in memory only (no localStorage), analytics cookies minimized. Backed by ACM study of 323 DV sites.

4. **PIPA 민감정보 미인식 (C-4)** - Divorce situation data (이혼 사유, DV 여부, 혼인관계) is 민감정보 under PIPA Article 23. Default architecture: zero Firestore writes until explicit consent. Anonymous analysis is the primary flow.

5. **법제처 API 단일 실패점 (M-1)** - Public API with no SLA. Mitigate with: 24-hour cache for statute/precedent results, 3s timeout with graceful degradation, HTML tag stripping at parse layer, synonym map (양육권 => 친권 => 면접교섭권).

---

## Implications for Roadmap

Based on dependencies and regulatory risk profile, a 4-phase structure is recommended:

### Phase 1: Foundation + Safety + Core Pipeline
**Rationale:** The entire product depends on (a) the law API integration being verified and (b) the regulatory guardrails being correct before any UI is shown to users. DV safety UX is a Phase 1 requirement - retrofitting it is dangerous. This phase validates the full pipeline end-to-end with real API calls before building UI around it.
**Delivers:** Working POST /api/analyze route (wizard data => 법제처 API => Claude stream); DVSafetyOverlay with correct exit behavior; Firebase anonymous auth; DisclaimerBanner; law API wrapper with caching and HTML normalization.
**Addresses:** 관련 법령/판례 table stake, DV UX, PIPA anonymous flow, disclaimer
**Avoids:** C-1 (guardrails from day 1), C-2 (law API as source of truth), C-3 (DV exit correct from start), C-4 (memory-only default)

### Phase 2: Wizard UI + Analysis Output
**Rationale:** Now that the pipeline is validated end-to-end, build the user-facing intake and output UI against the known API response shape. Building UI before the pipeline is validated causes rework when Claude output structure changes.
**Delivers:** Full WizardForm (5-7 steps), DV abuse-detection branch in wizard, AnalysisStream (SSE consumer), ReportView (issues checklist + law citations + precedents + lawyer questions)
**Uses:** react-hook-form, Zustand wizard store, dvDetector.ts
**Implements:** Full user flow from wizard entry to structured report
**Avoids:** M-4 (output titled as general information, not personal diagnosis; lawyer CTA prominent)

### Phase 3: Polish, Compliance, and Differentiators
**Rationale:** With core UX functional, focus on legal compliance completeness and differentiating features.
**Delivers:** AI 쉬운 말 변환, 쟁점 우선순위 정렬, 출체 직접 링크, print layout, mobile 375px pass, WCAG AA, PIPA compliance audit, AI기본법 transparency UI, full disclaimer audit
**Avoids:** M-2 (disclaimer visibility), M-3 (AI기본법 transparency), N-3 (mobile exit button fixed position)

### Phase 4: Persistence + Save Flow (Post-MVP)
**Rationale:** Anonymous analysis is the MVP. Session saving with Google login adds auth complexity and PIPA surface area - defer until core product is validated in production.
**Delivers:** SaveGate component (consent modal + PIPA Article 23 language), POST /api/session + DELETE /api/session, Google login upgrade flow (linkWithCredential), full firestoreAdmin.ts writes
**Avoids:** C-4 (explicit consent gate before any write)

### Phase Ordering Rationale

- **Pipeline before UI:** Law API integration surfaces issues (XML format, rate limits, HTML tags) before UI is built around it. Build order from ARCHITECTURE.md Wave 1-6 validated by hard dependency analysis.
- **Safety is not polish:** DV UX and regulatory guardrails are Phase 1, not Phase 3. The 변호사법 and PIPA exposure is existential.
- **Persistence last:** Anonymity-first design reduces PIPA surface area during validation. Save flow complexity must not block core value delivery.
- **Differentiators in Phase 3:** Features like AI plain-language summaries depend on knowing the exact structure of Claude output from Phase 1-2. Building before pipeline is stable causes rework.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 - AI guardrail design:** The exact prompt engineering + post-processing filter combination for 변호사법 compliance is high-stakes. Recommend /gsd-research-phase for prompt structure before implementation.
- **Phase 1 - 법제처 API edge cases:** XML response shape variations, rate limit behavior, HTML tag patterns in precedent text need hands-on verification. GATE confirmed API works but exact response shapes require Phase 1 implementation.
- **Phase 3 - AI기본법 고영향 분류:** Regulatory guidance is unsettled (계도 기간 2026-2027). Legal counsel consultation flagged before Phase 3 public launch.

Phases with standard patterns (skip research-phase):
- **Phase 2 - Wizard UI:** React Hook Form multi-step wizard is well-documented. shadcn/ui components are standard. SSE streaming consumer pattern proven in sibling project.
- **Phase 4 - Save flow:** Firebase anonymous-to-Google linkWithCredential is documented. Pattern is identical to sibling project.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack mirrors sibling project (mbti-ai-live-chat) package.json. All versions verified. Only new element is fast-xml-parser + 법제처 API, confirmed working via GATE. |
| Features | HIGH | Competitive landscape directly verified (빅케이스, NexusAI official sites). 변호사법 boundary sourced from court ruling and bar association publications. |
| Architecture | HIGH | BFF streaming pattern verified against Vercel docs. Firebase lazy Proxy pattern proven in sibling. Build order derived from hard dependency analysis. |
| Pitfalls | HIGH | Critical pitfalls sourced from actual court cases (대법원 로폼 2025.2, Claude hallucination Latham & Watkins 2025) and ACM academic audit - not speculation. |

**Overall confidence:** HIGH

### Gaps to Address

- **법제처 API exact XML response shapes**: Field names and nesting in actual responses should be verified in Phase 1 by building the wrapper and running real queries before building the pipeline on top.
- **Claude prompt structure for 변호사법 compliance**: The guardrail direction is clear but the exact prompt producing well-structured output (issues, law citations, lawyer questions as separate sections) requires iteration. Plan for 2-3 prompt refinement cycles.
- **AI기본법 고영향 분류 determination**: Law is in effect (2026.1.22) but enforcement guidelines for the legal domain are unsettled through 계도 기간 (2026-2027). Flag for legal counsel before any public launch.
- **Zod 4 upgrade timing**: Currently locked to Zod 3 because @hookform/resolvers does not support Zod 4 yet. Monitor releases during development.

---

## Sources

### Primary (HIGH confidence)
- Sibling project mbti-ai-live-chat/package.json - confirmed versions for all shared dependencies
- https://www.npmjs.com/package/@anthropic-ai/sdk - v0.88.0 current
- https://ai-sdk.dev/docs/introduction - streamText, Anthropic provider
- https://tailwindcss.com/blog/tailwindcss-v4 - CSS-first config confirmed
- https://ui.shadcn.com/docs/tailwind-v4 - Tailwind v4 + React 19 compatibility confirmed
- https://www.lawtimes.co.kr/news/articleView.html?idxno=218004 - 대법원 로폼 판결 2025.2
- https://fortune.com/2025/05/18/anthropic-claude-lawyer-mistake-citation-legal-filing-large-language-model-llm-latham-watkins/ - C-2 hallucination evidence
- https://dl.acm.org/doi/fullHtml/10.1145/3544548.3581078 - C-3 DV safety audit evidence
- https://bigcase.ai/ + https://ailawbot.kr/ - competitive landscape direct verification
- .planning/GATE-VERIFICATION.md - 법제처 API confirmed working

### Secondary (MEDIUM confidence)
- https://open.law.go.kr/LSO/openApi/guideList.do - endpoint reference
- https://github.com/chrisryugj/korean-law-mcp - API wrapper patterns
- https://peekaboolabs.ai/blog/ai-basic-law-guide - 고영향 AI classifications
- https://crossborderadvisorysolutions.com/personal-information-protection-act-pipa-updates-2025/ - PIPA 2025 updates
- https://www.infoq.com/news/2025/08/zod-v4-available/ - Zod v4 subpath export status

### Tertiary (LOW confidence)
- AI기본법 고영향 분류 for legal domain - no definitive PIPC guidance yet; inferred from law text and commentary

---
*Research completed: 2026-04-12*
*Ready for roadmap: yes*