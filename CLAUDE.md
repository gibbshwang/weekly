# OpenClaw Workspace

## Billing Module (Toss Payments 구독 결제)

빌링/결제 관련 작업 시 아래 문서를 반드시 참조할 것:

- **디자인 문서 (아키텍처 + 구현 결과 + 적용 체크리스트):**
  `docs/superpowers/specs/2026-04-12-toss-billing-template-design.md`

- **구현 플랜 (태스크 분해 + 파일별 상세 스펙):**
  `docs/superpowers/plans/2026-04-12-toss-billing-template.md`

- **독립 템플릿 레포:**
  https://github.com/gibbshwang/nextjs-toss-billing-template
  로컬: `C:\Users\hhc20\projects\nextjs-toss-billing-template`

- **원본 구현 (Chat MBTI):**
  `mbti-ai-live-chat/` 디렉토리 내 Toss 관련 파일들

새 프로젝트에 결제 기능 추가 시: 디자인 문서의 "다른 프로젝트에서 사용할 때 체크리스트" 섹션과 템플릿 레포의 SETUP.md를 따를 것.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**AI 이혼 법률 가이드 플랫폼**

이혼을 고려하는 일반인이 변호사 상담(20만원+) 전에 자신의 법적 상황을 파악할 수 있는 "상담 준비 워크스페이스". 상황 입력 → 쟁점 체크리스트 + 관련 법령/판례 + 변호사에게 물어볼 질문 목록을 제공하는 웹 서비스. 법률 자문이 아닌 "법률 정보 제공 도구"로 포지셔닝.

**Core Value:** 이혼 고민자가 자신의 상황에 맞는 쟁점과 관련 법령/판례를 한눈에 파악하여 변호사 상담을 효과적으로 준비할 수 있어야 한다.

### Constraints

- **규제**: 법적 추론/결론 생성 절대 차단. "법률 정보 제공"만 허용 — 변호사법 109조 위반 방지
- **스택**: Next.js 15 + React 19 + TypeScript + Tailwind CSS — 기존 기술 스택 통일
- **AI**: Claude API (claude-sonnet-4-6) — 법률 분석 및 쉬운 말 변환
- **DB**: Firebase Firestore (단일 컬렉션) — 사용자 상황 데이터, 분석 결과
- **배포**: Vercel — 자동 배포, 스트리밍 응답으로 타임아웃 회피
- **디자인**: warm gray #F5F3F0, deep teal #1B6B5A, Pretendard 16px+, 보라색/카드그리드 금지
- **접근성**: WCAG AA, Mobile-first 375px, 48px 터치타겟
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x (pin to 15 — sibling uses 16.1.6 but 15 is the project constraint) | App Router, SSR, Route Handlers | Project constraint. App Router's Server Components + streaming Route Handlers are exactly what Claude API streaming requires. |
| React | 19.x | UI rendering | Peer of Next.js 15. React 19's concurrent features and Server Actions align with streaming UX. |
| TypeScript | 5.x | Type safety | Project constraint. strict mode required. Catches Claude response shape mismatches at compile time. |
| Node.js | 18+ | Runtime | Required by @anthropic-ai/sdk. Vercel runtime satisfies this. |
### AI Integration
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @anthropic-ai/sdk | ^0.88.0 | Claude API calls | Official SDK. Typed, streaming-native, retries built-in. Use `messages.stream()` for streaming responses. |
| Vercel AI SDK (`ai`) | ^4.x | Streaming helpers for Next.js Route Handlers | `streamText()` + `toDataStreamResponse()` gives streaming-safe responses that survive Vercel's function timeout. Anthropic provider built-in. **Use alongside @anthropic-ai/sdk, not instead of it.** |
| claude-sonnet-4-6 | — | Model | Project constraint. Best balance of legal reasoning quality and cost. Do NOT use claude-haiku for legal analysis (accuracy risk). |
### Korean Law API Integration
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js native `fetch` | built-in (Node 18+) | 법제처 Open API calls | No extra library needed. The MCP fly.dev server is confirmed 404. Direct API calls to `open.law.go.kr` using OC key `oneday24n1`. |
| Custom `KoreanLawClient` wrapper | (internal) | Encapsulate law API retry logic | The law API returns XML; needs parsing. Wrap in a service class in `src/lib/koreanLawClient.ts`. Parse with Node's `DOMParser` or `fast-xml-parser`. |
| fast-xml-parser | ^4.x | Parse 법제처 XML responses | Law API returns XML not JSON. fast-xml-parser is the most popular, fastest XML parser for Node.js. Lightweight (~50KB). |
- `getLawList` — keyword search for statutes
- `getLawService` — full statute text by MST
- `getPrecSearch` — precedent search (683 divorce cases confirmed)
- `getPrec` — full precedent by PrecSeq
### Database
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Firebase SDK (client) | ^12.x | Anonymous Auth + client-side reads | Project constraint. Sibling project uses firebase@12.9.0. Anonymous Auth satisfies PIPA minimum-collection principle. |
| firebase-admin | ^13.x | Server-side Firestore writes (Route Handlers) | Admin SDK required for server components. Sibling uses 13.6.1. Use lazy Proxy init pattern (see sibling's `src/lib/firebaseAdmin.ts`) to avoid build-time throw. |
| Firestore | — (SDK) | User session data, analysis results | Single-collection design as per PROJECT.md. Collections: `sessions/{sessionId}` with subcollections for wizard answers and analysis results. |
### UI Component System
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | ^4.x | Utility-first styling | Project constraint. v4 is CSS-first (no tailwind.config.js needed). Auto-scans content. 5x faster builds. |
| @tailwindcss/postcss | ^4.x | PostCSS plugin for TW4 | Required by TW4. Replaces old `tailwindcss` PostCSS plugin. |
| shadcn/ui | latest CLI | Accessible component primitives | shadcn/ui now fully supports TW4 + React 19. CLI copies source — full customization. Use for: Dialog, Accordion, Progress, Checkbox, RadioGroup, Tabs. DO NOT use for wizard stepper (build custom). |
| Pretendard | via CSS import | Korean typography | Project constraint. `font-pretendard` via `@fontsource/pretendard` or CDN import. 16px+ minimum per design spec. |
- Background: `#F5F3F0` (warm gray)
- Primary: `#1B6B5A` (deep teal)
- Forbidden: purple tones, card-grid layouts
### Form Management (Wizard)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-hook-form | ^7.x | Multi-step wizard form state | De facto standard. Works with Server Actions and Zod. Uncontrolled inputs = minimal re-renders in wizard steps. |
| Zod | ^3.x (NOT v4 yet) | Schema validation | Use Zod 3 for now. Zod 4 released July 2025 but published as `zod/v4` subpath (not default export yet). React Hook Form's `zodResolver` targets Zod 3. Switch to Zod 4 when `@hookform/resolvers` officially supports it. |
| @hookform/resolvers | ^3.x | Connects Zod schemas to RHF | Bridge package. Check version compatibility when upgrading Zod. |
### State Management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | ^5.x | Wizard state, analysis results | Project constraint (same as sibling). Sibling uses 5.0.11. Use curried `create<T>()((set, get) => {...})` form. One store: `useWizardStore` for wizard answers + analysis state. |
### Internationalization
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| next-intl | ^4.x | Ko/En i18n routing | Project constraint (same as sibling, 4.8.3). Path-based routing `/ko/...`, `/en/...`. Korean default locale. |
### Testing
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | ^4.x | Unit + integration tests | Sibling uses vitest@4.0.18. Fast, ESM-native, Vite-powered. Replace Jest entirely. |
| @testing-library/react | ^16.x | Component testing | Standard React testing. |
| @testing-library/user-event | ^14.x | User interaction simulation | Wizard step interactions. |
| jsdom | ^28.x | DOM environment for Vitest | As in sibling. |
### Deployment
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | — | Hosting + Edge Functions | Project constraint. Streaming Route Handlers survive function timeout via SSE. No cold-start issues with Edge runtime for streaming routes. |
- Set `export const runtime = 'edge'` on the analysis Route Handler for sub-100ms cold starts
- Claude streaming keeps connection alive past 10s timeout
- Edge runtime does NOT support Node.js APIs — keep `fast-xml-parser` and `firebase-admin` in standard Node.js runtime Route Handlers only
- Two Route Handler runtime types needed: `runtime = 'edge'` for streaming AI, `runtime = 'nodejs'` for Firebase Admin + XML parsing
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| AI SDK | Vercel AI SDK + @anthropic-ai/sdk | Direct fetch to Claude API | Vercel AI SDK handles streaming protocol, retries, and edge compatibility. Re-implementing is wasted effort. |
| State | Zustand | React Context / Jotai | Consistency with sibling project. Zustand v5 has better TypeScript inference than Context for complex wizard state. |
| UI | shadcn/ui | Radix UI direct | shadcn/ui IS Radix + TW4 styling. Same primitives, better DX. |
| Validation | Zod 3 | Zod 4 | Zod 4 not yet fully supported by @hookform/resolvers. Defer upgrade. |
| DB | Firestore | Supabase / PlanetScale | Project constraint. Firebase Anonymous Auth is critical for PIPA compliance. Switching DB means switching Auth. |
| XML parsing | fast-xml-parser | xml2js / node-xml | fast-xml-parser is 3x faster and TypeScript-native. xml2js has callback-only API (legacy). |
| Testing | Vitest | Jest | Sibling uses Vitest. No reason to mix. Vitest is faster and ESM-native. |
## Installation
# Core
# AI
# Firebase
# Law API
# UI
# Forms
# Dev
## Critical Constraints (Non-Negotiable)
## Sources
- [@anthropic-ai/sdk on npm](https://www.npmjs.com/package/@anthropic-ai/sdk) — v0.88.0 current
- [Vercel AI SDK docs](https://ai-sdk.dev/docs/introduction) — streamText, Anthropic provider
- [AI SDK 4.1 release notes](https://vercel.com/blog/ai-sdk-4-1) — structured output + streamText
- [Tailwind CSS v4 official](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first config
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — compatibility confirmed
- [Next.js 15 + React 19 — shadcn/ui](https://ui.shadcn.com/docs/react-19) — React 19 support
- [Zod v4 release (InfoQ)](https://www.infoq.com/news/2025/08/zod-v4-available/) — released July 2025 as subpath
- [법제처 Open API guide](https://open.law.go.kr/LSO/openApi/guideList.do) — endpoint reference
- [korean-law-mcp GitHub](https://github.com/chrisryugj/korean-law-mcp) — reference for API wrapper patterns
- [South Korea PIPA 2025 updates](https://crossborderadvisorysolutions.com/personal-information-protection-act-pipa-updates-2025/) — pseudonymization/anonymization provisions
- Sibling project `mbti-ai-live-chat/package.json` — firebase@12.9.0, firebase-admin@13.6.1, next-intl@4.8.3, zustand@5.0.11, vitest@4.0.18 — HIGH confidence baseline
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
