# Architecture Patterns

**Domain:** AI 이혼 법률 가이드 플랫폼 (AI legal information platform — divorce)
**Researched:** 2026-04-12
**Confidence:** HIGH (stack confirmed, patterns verified against working implementations)

---

## Recommended Architecture

### Overview

Three-layer architecture: Client UI layer → Next.js API layer (BFF) → External services layer. The BFF (Backend-for-Frontend) pattern is the right fit here because it lets the server hold secrets (law API key, Claude API key), proxy external calls, and stream results back to the client — without ever exposing credentials to the browser.

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT (React 19, Next.js 15 App Router)               │
│                                                         │
│  WizardForm → AnalysisView → ReportView                 │
│  (Zustand or useReducer for local wizard state)         │
└────────────────────┬────────────────────────────────────┘
                     │  fetch / SSE stream
┌────────────────────▼────────────────────────────────────┐
│  NEXT.JS API LAYER (Route Handlers, Node.js runtime)    │
│                                                         │
│  POST /api/analyze     — orchestrates full pipeline     │
│  GET  /api/law/search  — proxies 법제처 lawSearch.do   │
│  GET  /api/law/detail  — proxies 법제처 lawService.do  │
│  POST /api/session     — create/update Firestore doc    │
└────┬───────────────────────────┬────────────────────────┘
     │                           │
┌────▼──────────┐     ┌──────────▼──────────────────────┐
│  Claude API   │     │  External Services               │
│  (Anthropic)  │     │                                  │
│  - Streaming  │     │  법제처 Open API (XML/HTTP)      │
│  - Messages   │     │  Firebase Auth (anonymous/Google)│
│    .stream()  │     │  Firebase Firestore              │
└───────────────┘     └──────────────────────────────────┘
```

---

## Component Boundaries

### Client Components

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `WizardForm` | Multi-step situation intake (marriage duration, children, assets, reason) | Holds local state; submits to `/api/analyze` on completion |
| `AnalysisStream` | Renders streaming response from Claude as SSE arrives | Reads ReadableStream from fetch response |
| `ReportView` | Displays structured analysis: issues checklist, law citations, questions for lawyer | Reads from completed analysis state |
| `DisclaimerBanner` | "법률 자문 아님" persistent notice | Renders on all pages — no external deps |
| `DVSafetyOverlay` | Emergency exit button, 1366 link, neutral tab title on trigger | Activated by `dvMode` flag in state; no external deps |
| `SaveGate` | Shows save prompt only when user explicitly requests saving | Calls `/api/session` POST, triggers Firebase Auth flow |
| `AuthProvider` | Wraps app with Firebase anonymous auth initialization | Firebase Auth SDK |

### Server Components / Route Handlers

| Route | Responsibility | Communicates With |
|-------|---------------|-------------------|
| `POST /api/analyze` | **Orchestrator.** Calls law API → feeds results to Claude → streams Claude output back as SSE | 법제처 API (HTTP), Claude API (stream) |
| `GET /api/law/search` | Wraps `lawSearch.do` XML response → returns JSON | 법제처 Open API |
| `GET /api/law/detail` | Wraps `lawService.do` XML response → returns JSON (full statute text) | 법제처 Open API |
| `POST /api/session` | Creates/updates user session document in Firestore | Firebase Admin SDK, Firestore |
| `DELETE /api/session` | Immediately deletes all user data (PIPA right to erasure) | Firebase Admin SDK, Firestore |

### Service Modules (lib/)

| Module | Responsibility |
|--------|---------------|
| `lib/lawApiClient.ts` | HTTP wrapper for 법제처 API. Parses XML → JS objects. Rate-limit guard (≥500ms between calls). OC key injected from env. |
| `lib/claudeClient.ts` | Anthropic SDK wrapper. Builds prompts from law search results + user situation. Returns `MessageStream`. |
| `lib/firestoreAdmin.ts` | Lazy-initialized Firebase Admin SDK (same pattern as MBTI project). Exposes typed read/write helpers. |
| `lib/pipelineOrchestrator.ts` | Core logic: takes user situation → decides which law API queries to run → calls law API → assembles Claude prompt → returns stream. |
| `lib/dvDetector.ts` | Scans free-text input fields for DV indicators. Returns `{ dvRisk: boolean, safetyLevel: 'low'|'medium'|'high' }`. Runs client-side, no network call. |
| `lib/disclaimer.ts` | Central store of all legal disclaimer text. Single source of truth — prevents omission across pages. |

---

## Data Flow

### Happy Path: User Submits Situation → Receives Report

```
1. USER fills WizardForm (5–7 steps)
   State: local React state / useReducer

2. SUBMIT triggers POST /api/analyze
   Body: { situation: WizardFormData }
   Headers: Authorization: Bearer {Firebase ID token} (if logged in)

3. SERVER: pipelineOrchestrator.ts
   a. Build law search queries from situation
      (e.g., "재산분할", "친권", "위자료" based on user inputs)
   b. Call lawApiClient.ts → GET 법제처 lawSearch.do
      Returns: array of { statute_name, article, content }
   c. If precedent search needed: GET lawSearch.do?type=판례
      Returns: array of { case_summary, ruling }
   d. Assemble Claude prompt:
      - System: "You provide INFORMATION only. Never conclude fault or predict outcomes."
      - User: situation summary + law search results (as context)
      - Request: "Generate: issues checklist, relevant articles, questions for lawyer"
   e. Call claudeClient.ts → messages.stream()

4. SERVER: Stream Claude response back as SSE
   Route handler returns ReadableStream immediately
   Claude tokens arrive → enqueued → flushed to client

5. CLIENT: AnalysisStream reads SSE
   Renders incrementally as tokens arrive
   On stream close: transitions to ReportView (full structured report)

6. OPTIONAL: User clicks "저장하기"
   → SaveGate appears, shows consent modal
   → User consents → POST /api/session
   → Server writes to Firestore users/{uid}/sessions/{sessionId}
```

### DV Safety Branch

```
dvDetector.ts runs on EVERY free-text input change (client-side)
  If dvRisk = true AND safetyLevel = 'high':
    → DVSafetyOverlay activates
    → Page title changes to neutral (e.g., "날씨 정보")
    → Emergency exit button visible (takes user to weather.com or similar)
    → 1366 domestic violence hotline prominently shown
    → Analysis continues normally in background (do not block the user)
```

### Data Deletion Flow

```
User clicks "모두 삭제":
  → DELETE /api/session
  → Server: delete users/{uid}/sessions/* (all docs)
  → Server: Firebase Auth deleteUser(uid)
  → Client: clear all local state, redirect to /
  → Confirmation: "모든 데이터가 삭제되었습니다"
```

---

## Firestore Data Model

Single collection strategy (PROJECT.md constraint: "단일 Firestore 컬렉션").

```
users/{uid}/
  sessions/{sessionId}/
    createdAt: Timestamp
    updatedAt: Timestamp
    situation: WizardFormData          // encrypted at rest via Firestore default
    analysis: {
      issues: string[]                 // checklist items
      lawCitations: LawCitation[]      // { name, article, url }
      precedents: PrecedentSummary[]   // { caseId, summary, ruling }
      lawyerQuestions: string[]        // generated questions
    }
    dvFlagged: boolean                 // never store DV details, only flag
    consentGiven: boolean
    consentAt: Timestamp | null
```

Note: Anonymous users get a Firebase UID just like authenticated users. Session data attaches to whichever UID they hold at save time. If user later upgrades to Google login, `linkWithCredential` merges the anonymous account — no data migration needed.

---

## Patterns to Follow

### Pattern 1: Immediate Stream Return (Vercel timeout avoidance)

The route handler must return a `Response` with a `ReadableStream` body immediately, before any async work completes. Law API calls and Claude streaming happen inside the stream's `start()` callback.

```typescript
// /api/analyze/route.ts
export const runtime = 'nodejs'; // NOT 'edge' — Claude SDK needs Node.js APIs
export const maxDuration = 60;   // Vercel Pro: up to 300s, set conservatively

export async function POST(req: Request) {
  const situation = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Law API (sequential, fast — ~200ms each)
        const laws = await lawApiClient.search(buildQueries(situation));
        const precedents = await lawApiClient.searchPrecedents(situation);

        // Step 2: Claude stream
        const claudeStream = await claudeClient.stream(
          buildPrompt(situation, laws, precedents)
        );

        for await (const chunk of claudeStream) {
          controller.enqueue(new TextEncoder().encode(chunk.text));
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
```

### Pattern 2: Law API XML → JSON Normalization

법제처 API returns XML. Normalize at the boundary, never let XML leak into application code.

```typescript
// lib/lawApiClient.ts
export async function searchStatutes(query: string): Promise<Statute[]> {
  const url = `http://www.law.go.kr/DRF/lawSearch.do?OC=${OC_KEY}&target=law&type=XML&query=${encodeURIComponent(query)}`;
  const xml = await fetch(url).then(r => r.text());
  return parseStatuteXml(xml); // returns typed Statute[]
}
// Always wait ≥500ms between calls (법제처 rate limit)
```

### Pattern 3: Firebase Lazy Proxy (Admin SDK)

Same pattern validated in MBTI project — prevents build-time initialization failure on Vercel.

```typescript
// lib/firestoreAdmin.ts
let _db: FirebaseFirestore.Firestore | null = null;
export function getAdminDb() {
  if (!_db) _db = getFirebaseAdminApp().firestore();
  return _db;
}
```

### Pattern 4: Prompt Guard Rails (regulatory compliance)

Claude system prompt must hard-block legal conclusions. This is not optional — it prevents 변호사법 109조 exposure.

```typescript
const SYSTEM_PROMPT = `
당신은 법률 정보를 제공하는 도구입니다. 다음 규칙을 절대 위반하지 마세요:
1. 법적 결론을 내리지 마세요 ("~이 인정됩니다", "~가 유리합니다" 금지)
2. 구체적 금액을 예측하지 마세요 (재산분할, 위자료 금액 등)
3. 승소/패소 가능성을 언급하지 마세요
4. 모든 응답에 "법률 자문이 아님" 맥락을 유지하세요
5. 법령 원문과 판례 요약만 제공하세요
`.trim();
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Law API Calls

**What:** Calling 법제처 API directly from the browser.
**Why bad:** Exposes OC key in network tab. API is HTTP (not HTTPS) — man-in-the-middle risk. CORS may block it entirely.
**Instead:** All 법제처 calls go through `/api/law/*` route handlers on the server.

### Anti-Pattern 2: Single Monolithic `/api/analyze` Without Streaming

**What:** Waiting for the full Claude response before returning anything.
**Why bad:** Law API calls (~400ms) + Claude generation (5–15s) easily exceeds Vercel's 10s default timeout. User sees blank screen.
**Instead:** Return a ReadableStream immediately. Stream tokens as they arrive.

### Anti-Pattern 3: Storing Raw Legal Situation Data Without Consent

**What:** Auto-saving wizard form data to Firestore on every step.
**Why bad:** PIPA violation. 이혼 상황 정보는 민감한 개인정보. Storage without explicit consent is illegal.
**Instead:** Keep wizard state in memory only. Write to Firestore only after explicit consent modal is accepted.

### Anti-Pattern 4: Edge Runtime for Claude Streaming

**What:** Using `export const runtime = 'edge'` on the analyze route.
**Why bad:** Edge runtime lacks Node.js APIs that the Anthropic SDK depends on. Known incompatibility. Also: Edge functions have stricter 25s initial response requirements.
**Instead:** Use `runtime = 'nodejs'` with `maxDuration = 60` (or higher on Pro plan).

### Anti-Pattern 5: Generating Legal Conclusions

**What:** Asking Claude to assess "who is likely to win" or predict settlement amounts.
**Why bad:** 변호사법 109조 — non-lawyers providing legal advice face criminal penalties (up to 7 years). 대법원 로폼 판결 (2025.2) specifically targeted AI legal conclusion generation.
**Instead:** Claude surfaces relevant laws and precedents. User draws their own conclusions. This is the legally safe "information vs. advice" distinction.

---

## Build Order

Dependencies determine order. Each layer must exist before the layer above it can function.

### Wave 1: Foundation (no external dependencies)
1. Project scaffold (Next.js 15, TypeScript strict, Tailwind, Pretendard font)
2. Firebase Auth setup (anonymous + Google, client SDK + Admin SDK lazy init)
3. `lib/lawApiClient.ts` — HTTP wrapper for 법제처 API (no DB, no Claude)
4. `lib/disclaimer.ts` — Central disclaimer text

**Why first:** Everything else depends on auth context and the law API wrapper. Testing the law API in isolation surfaces integration issues early.

### Wave 2: Core Pipeline
5. `lib/pipelineOrchestrator.ts` + `lib/claudeClient.ts`
6. `POST /api/analyze` route handler (streaming)
7. `GET /api/law/search` + `GET /api/law/detail` proxy routes

**Why second:** The pipeline is the product. Validate it with curl/Postman before building any UI. This reveals prompt quality, latency, and Claude output structure issues early.

### Wave 3: Client UI — Intake
8. `WizardForm` component (multi-step, local state only)
9. `lib/dvDetector.ts` + `DVSafetyOverlay`
10. `DisclaimerBanner` (required on all pages from day 1)

**Why third:** Form shape determines what the pipeline receives. Build form → test against real pipeline → iterate on field design if Claude output is poor.

### Wave 4: Client UI — Output
11. `AnalysisStream` (SSE consumer, incremental render)
12. `ReportView` (structured display: issues, laws, precedents, questions)
13. Print layout (browser print as PDF substitute — no PDF library needed)

**Why fourth:** Output UI depends on knowing the exact shape of Claude's structured response, which is only known after Wave 2 is validated.

### Wave 5: Persistence & Auth
14. `POST /api/session` + `DELETE /api/session`
15. `SaveGate` component (consent modal → save trigger)
16. `lib/firestoreAdmin.ts` full implementation
17. Google login upgrade flow (`linkWithCredential`)

**Why fifth:** Persistence is enhancement, not core. Ship the anonymous analysis experience first. Auth/save complexity should not block the MVP pipeline from being testable.

### Wave 6: Polish & Compliance
18. WCAG AA audit (contrast, touch targets, focus management)
19. Mobile-first responsive pass (375px breakpoint)
20. Full disclaimer audit (all pages, all entry points)
21. PIPA compliance review (storage consent, deletion verification)

---

## Scalability Considerations

| Concern | At 100 users/day | At 10K users/day | Notes |
|---------|-----------------|-----------------|-------|
| 법제처 API rate limit | No issue | May hit — add 500ms delay + queue | API is free but undocumented rate limit |
| Claude API cost | ~$1-2/day | ~$100-200/day | Cache identical query results in Firestore |
| Vercel function cold start | Negligible | Negligible | Streaming hides latency anyway |
| Firestore reads | Negligible | Negligible | Most sessions are anonymous/ephemeral |
| Law API XML parsing | Fast | Fast | Stateless, no bottleneck |

Caching strategy for later (not MVP): Hash the combination of `{situation fields}` → if same hash seen in last 24h, return cached analysis from Firestore instead of re-calling Claude. Reduces cost by estimated 40-60% for repeated common situations.

---

## Sources

- Vercel streaming timeout guidance: https://ai-sdk.dev/docs/troubleshooting/timeout-on-vercel
- 법제처 API wrapper reference (shows XML endpoints and rate limits): https://github.com/chrisryugj/korean-law-mcp
- Next.js App Router API layer patterns: https://medium.com/@ignatovich.dm/api-layer-in-next-js-why-its-important-how-to-use-it-and-best-practices-4b954cb9db00
- Firebase anonymous auth + session management: https://schlosser.io/writing/seamless-authentication-with-nextjs-and-firebase/
- Claude streaming + Next.js Edge: https://dev.to/bydaewon/building-a-production-ready-claude-streaming-api-with-nextjs-edge-runtime-3e7
- Legal AI RAG architecture patterns (2026): https://softcery.com/lab/building-ai-that-understands-legal-documents
