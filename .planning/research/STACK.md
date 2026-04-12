# Technology Stack

**Project:** AI 이혼 법률 가이드 플랫폼
**Researched:** 2026-04-12
**Confidence:** HIGH (core stack verified against sibling project package.json + official docs)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x (pin to 15 — sibling uses 16.1.6 but 15 is the project constraint) | App Router, SSR, Route Handlers | Project constraint. App Router's Server Components + streaming Route Handlers are exactly what Claude API streaming requires. |
| React | 19.x | UI rendering | Peer of Next.js 15. React 19's concurrent features and Server Actions align with streaming UX. |
| TypeScript | 5.x | Type safety | Project constraint. strict mode required. Catches Claude response shape mismatches at compile time. |
| Node.js | 18+ | Runtime | Required by @anthropic-ai/sdk. Vercel runtime satisfies this. |

**IMPORTANT — version clarification:** The sibling project (mbti-ai-live-chat) runs Next.js 16.1.6 in production. Next.js 16 is actively shipping. However, PROJECT.md explicitly lists "Next.js 15" as the stack constraint. Lock to Next.js 15.x unless the roadmap explicitly upgrades. The stack below is validated against 15.

### AI Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @anthropic-ai/sdk | ^0.88.0 | Claude API calls | Official SDK. Typed, streaming-native, retries built-in. Use `messages.stream()` for streaming responses. |
| Vercel AI SDK (`ai`) | ^4.x | Streaming helpers for Next.js Route Handlers | `streamText()` + `toDataStreamResponse()` gives streaming-safe responses that survive Vercel's function timeout. Anthropic provider built-in. **Use alongside @anthropic-ai/sdk, not instead of it.** |
| claude-sonnet-4-6 | — | Model | Project constraint. Best balance of legal reasoning quality and cost. Do NOT use claude-haiku for legal analysis (accuracy risk). |

**Streaming pattern:** Route Handler → `ai.streamText({ model: anthropic('claude-sonnet-4-6'), ... })` → `toDataStreamResponse()`. Client side: Vercel AI SDK `useCompletion` or manual SSE reader. This survives Vercel's 60s timeout because streaming keeps the connection alive.

**Confidence:** HIGH — verified against ai-sdk.dev official docs and Vercel blog (AI SDK 4.1).

### Korean Law API Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js native `fetch` | built-in (Node 18+) | 법제처 Open API calls | No extra library needed. The MCP fly.dev server is confirmed 404. Direct API calls to `open.law.go.kr` using OC key `oneday24n1`. |
| Custom `KoreanLawClient` wrapper | (internal) | Encapsulate law API retry logic | The law API returns XML; needs parsing. Wrap in a service class in `src/lib/koreanLawClient.ts`. Parse with Node's `DOMParser` or `fast-xml-parser`. |
| fast-xml-parser | ^4.x | Parse 법제처 XML responses | Law API returns XML not JSON. fast-xml-parser is the most popular, fastest XML parser for Node.js. Lightweight (~50KB). |

**API endpoints to wrap:**
- `getLawList` — keyword search for statutes
- `getLawService` — full statute text by MST
- `getPrecSearch` — precedent search (683 divorce cases confirmed)
- `getPrec` — full precedent by PrecSeq

**Confidence:** MEDIUM — API confirmed working (GATE verification), but XML parsing approach inferred from API docs. Verify response shape in Phase 1.

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Firebase SDK (client) | ^12.x | Anonymous Auth + client-side reads | Project constraint. Sibling project uses firebase@12.9.0. Anonymous Auth satisfies PIPA minimum-collection principle. |
| firebase-admin | ^13.x | Server-side Firestore writes (Route Handlers) | Admin SDK required for server components. Sibling uses 13.6.1. Use lazy Proxy init pattern (see sibling's `src/lib/firebaseAdmin.ts`) to avoid build-time throw. |
| Firestore | — (SDK) | User session data, analysis results | Single-collection design as per PROJECT.md. Collections: `sessions/{sessionId}` with subcollections for wizard answers and analysis results. |

**PIPA compliance pattern:** Default to Anonymous Auth (no PII collected). Offer Google login only when user explicitly wants to save results. Implement `deleteUserData()` mutation for instant full-delete. Store consent timestamp alongside data. Mark all Firestore fields with `createdAt` and `consentVersion`.

**Confidence:** HIGH — same stack as sibling project, already battle-tested.

### UI Component System

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | ^4.x | Utility-first styling | Project constraint. v4 is CSS-first (no tailwind.config.js needed). Auto-scans content. 5x faster builds. |
| @tailwindcss/postcss | ^4.x | PostCSS plugin for TW4 | Required by TW4. Replaces old `tailwindcss` PostCSS plugin. |
| shadcn/ui | latest CLI | Accessible component primitives | shadcn/ui now fully supports TW4 + React 19. CLI copies source — full customization. Use for: Dialog, Accordion, Progress, Checkbox, RadioGroup, Tabs. DO NOT use for wizard stepper (build custom). |
| Pretendard | via CSS import | Korean typography | Project constraint. `font-pretendard` via `@fontsource/pretendard` or CDN import. 16px+ minimum per design spec. |

**Design tokens (from PROJECT.md):**
- Background: `#F5F3F0` (warm gray)
- Primary: `#1B6B5A` (deep teal)
- Forbidden: purple tones, card-grid layouts

**Confidence:** HIGH — TW4 + shadcn/ui v2 compatibility verified via official shadcn/ui docs.

### Form Management (Wizard)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-hook-form | ^7.x | Multi-step wizard form state | De facto standard. Works with Server Actions and Zod. Uncontrolled inputs = minimal re-renders in wizard steps. |
| Zod | ^3.x (NOT v4 yet) | Schema validation | Use Zod 3 for now. Zod 4 released July 2025 but published as `zod/v4` subpath (not default export yet). React Hook Form's `zodResolver` targets Zod 3. Switch to Zod 4 when `@hookform/resolvers` officially supports it. |
| @hookform/resolvers | ^3.x | Connects Zod schemas to RHF | Bridge package. Check version compatibility when upgrading Zod. |

**Multi-step wizard pattern:** Single `useForm` at parent level + `FormProvider` context. Each step reads from context via `useFormContext`. Submit-per-step for field-level validation. Zustand store persists across steps (same pattern as sibling's callStore).

**Confidence:** MEDIUM — react-hook-form v7 verified. Zod v4 status verified (use v3 for now).

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | ^5.x | Wizard state, analysis results | Project constraint (same as sibling). Sibling uses 5.0.11. Use curried `create<T>()((set, get) => {...})` form. One store: `useWizardStore` for wizard answers + analysis state. |

**Store shape:**
```typescript
interface WizardStore {
  answers: WizardAnswers;        // step-by-step inputs
  analysisResult: AnalysisResult | null;  // Claude output
  currentStep: number;
  isAnalyzing: boolean;
  setAnswer: (step: string, value: unknown) => void;
  setAnalysisResult: (result: AnalysisResult) => void;
  reset: () => void;
}
```

**Confidence:** HIGH — verified against sibling project, same version.

### Internationalization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| next-intl | ^4.x | Ko/En i18n routing | Project constraint (same as sibling, 4.8.3). Path-based routing `/ko/...`, `/en/...`. Korean default locale. |

**Note:** Korean is the primary language. English is secondary (legal terminology in Korean law has no good English equivalent). Keep translation keys minimal — legal content should only appear in Korean to avoid translation errors in legal context.

**Confidence:** HIGH — verified against sibling project.

### Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | ^4.x | Unit + integration tests | Sibling uses vitest@4.0.18. Fast, ESM-native, Vite-powered. Replace Jest entirely. |
| @testing-library/react | ^16.x | Component testing | Standard React testing. |
| @testing-library/user-event | ^14.x | User interaction simulation | Wizard step interactions. |
| jsdom | ^28.x | DOM environment for Vitest | As in sibling. |

**TDD requirement:** Test Korean Law API wrapper thoroughly with mocked responses (API rate limits). Test Claude prompt builder with snapshot tests. Test wizard state machine exhaustively.

**Confidence:** HIGH — same as sibling project, all versions verified.

### Deployment

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | — | Hosting + Edge Functions | Project constraint. Streaming Route Handlers survive function timeout via SSE. No cold-start issues with Edge runtime for streaming routes. |

**Vercel config notes:**
- Set `export const runtime = 'edge'` on the analysis Route Handler for sub-100ms cold starts
- Claude streaming keeps connection alive past 10s timeout
- Edge runtime does NOT support Node.js APIs — keep `fast-xml-parser` and `firebase-admin` in standard Node.js runtime Route Handlers only
- Two Route Handler runtime types needed: `runtime = 'edge'` for streaming AI, `runtime = 'nodejs'` for Firebase Admin + XML parsing

**Confidence:** HIGH — Vercel streaming pattern is well-documented, edge runtime limitation is well-known.

---

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

---

## Installation

```bash
# Core
npm install next@15 react@19 react-dom@19 typescript

# AI
npm install @anthropic-ai/sdk ai @ai-sdk/anthropic

# Firebase
npm install firebase firebase-admin

# Law API
npm install fast-xml-parser

# UI
npm install next-intl zustand
npx shadcn@latest init

# Forms
npm install react-hook-form @hookform/resolvers zod

# Dev
npm install -D tailwindcss @tailwindcss/postcss vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/user-event jsdom \
  @types/node @types/react @types/react-dom eslint eslint-config-next prettier
```

---

## Critical Constraints (Non-Negotiable)

1. **No legal conclusions from Claude.** Prompt engineering must frame all output as "relevant statutes" and "questions to ask" — never as legal advice or outcome predictions. This is enforced at the prompt layer, not just the UI.

2. **DV safety UX.** Every page needs a keyboard-accessible "quick exit" button that navigates to a neutral URL and clears session history. This is a safety requirement, not a nice-to-have.

3. **Edge runtime split.** Analysis streaming route → `runtime = 'edge'`. Firebase Admin routes → `runtime = 'nodejs'`. Never mix them.

4. **PIPA: anonymous by default.** Firebase Anonymous Auth is the only Auth active at page load. Never pre-initialize Google Auth. Consent gate must appear before any PII collection.

5. **법제처 API key in server-only env.** `OC=oneday24n1` must be in `KOREAN_LAW_OC_KEY` env var, server-side only. Never expose to client bundle.

---

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
