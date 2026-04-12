# Phase 1: Foundation - Research

**Researched:** 2026-04-12
**Domain:** Next.js 15 App Router + Firebase Anonymous Auth + 법제처 Open API + Claude 스트리밍 + DV 안전 UX + 규제 준수 인프라
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | 법제처 API wrapper (XML→JSON) with error handling and fallback | KoreanLawClient 설계 패턴, fast-xml-parser 사용법, HTML strip 유틸, 동의어 사전 |
| INFRA-02 | Streaming response architecture to avoid Vercel timeouts | ReadableStream + Node.js runtime 패턴, maxDuration 설정 |
| INFRA-03 | Edge/Node runtime split (Claude streaming = Node, static = Edge) | runtime 선언 위치, Anthropic SDK Node.js 의존성 |
| AUTH-01 | Firebase anonymous authentication on first visit | signInAnonymously 호출 시점, AuthProvider wrapper, window guard 패턴 |
| COMPL-01 | Every page displays disclaimer: "법률 정보 제공 서비스이며, 법률 자문이 아닙니다" | DisclaimerBanner 컴포넌트, layout.tsx 배치 전략 |
| COMPL-02 | Every analysis output includes "변호사 상담 권유" CTA | 분석 출력 레이아웃에 CTA 고정, 법률구조공단/로톡 링크 |
| COMPL-03 | System prompt enforces "no legal conclusions" — output post-filter validates compliance | 시스템 프롬프트 가드레일 설계, 출력 후처리 필터 패턴 |
| COMPL-04 | AI never generates statements like "귀하의 경우 ~입니다" or percentage predictions | 개별화 언어 패턴 감지 정규식, 출력 차단 로직 |
| SAFE-01 | Quick exit button fixed at top-right, redirects to neutral site on click | history.replaceState + sessionStorage.clear 구현, fixed z-index |
| SAFE-02 | Page title shows neutral text (not "이혼" or law-related) | Next.js metadata API로 중립 타이틀 설정, 동적 타이틀 변경 방지 |
| SAFE-03 | Emergency contacts (여성긴급전화 1366, 경찰 112) visible on every page | layout.tsx 고정 컴포넌트 배치 |
| SAFE-05 | Incognito mode usage guidance displayed on first visit | localStorage 미사용 체계, 첫 방문 감지 패턴 |
| PRIV-01 | User can use the service anonymously without login (Firebase anonymous auth) | anonymous auth 초기화, 로그인 없이 API 호출 허용 |
| PRIV-02 | No data saved to server by default — explicit consent required before Firestore write | 메모리 전용 상태 관리, Firestore 쓰기 차단 기본값 |
| PRIV-04 | Clear notice that user data is NOT used for AI training | Anthropic 데이터 처리 정책 확인, 고지 문구 위치 |
</phase_requirements>

---

## Summary

Phase 1은 세 개의 독립적인 인프라 레이어를 동시에 구축한다: (1) 법제처 Open API 래퍼 (XML→JSON, rate-limit 가드, HTML strip), (2) Claude 스트리밍 파이프라인 (`POST /api/analyze`, Node.js runtime, ReadableStream 즉시 반환), (3) 규제·안전 UI 인프라 (DisclaimerBanner, QuickExitButton, EmergencyContacts, 익명 Firebase Auth). 세 레이어는 서로 의존성이 낮아 병렬 개발이 가능하며, Wave 1에서 스캐폴딩과 서비스 모듈을 먼저 만들고 Wave 2에서 API 경로와 UI 컴포넌트를 조립하는 순서가 최적이다.

가장 높은 리스크 항목은 변호사법 가드레일(COMPL-03, COMPL-04)과 DV 탈출 버튼의 완전한 안전(SAFE-01)이다. 가드레일은 시스템 프롬프트 설계만으로 부족하고 후처리 필터(개별화 언어 패턴 감지)가 반드시 함께 구현되어야 한다. 탈출 버튼은 `history.replaceState()` + `sessionStorage.clear()` 조합이 필수이며, 모든 위저드 상태는 localStorage가 아닌 React 메모리에만 유지해야 한다.

Firebase 초기화 패턴은 형제 프로젝트(mbti-ai-live-chat)에서 이미 검증되었다: 클라이언트 SDK는 `typeof window !== 'undefined'` 가드로 보호하고, Admin SDK는 Lazy Proxy 패턴으로 빌드 타임 오류를 방지한다. 이 패턴을 그대로 복사해 적용한다.

**Primary recommendation:** `src/lib/koreanLawClient.ts` → `src/lib/claudeClient.ts` → `src/app/api/analyze/route.ts` 순서로 서버 사이드 파이프라인을 먼저 검증하고, UI 컴포넌트(DisclaimerBanner, QuickExitButton)를 그 다음에 연결한다.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | App Router, Route Handlers, streaming | 프로젝트 제약 (형제 프로젝트는 16.1.6이나 이 프로젝트는 15로 고정) |
| React | 19.x | UI rendering, Server Components | Next.js 15의 peer dependency |
| TypeScript | 5.x | Type safety (strict mode) | 프로젝트 제약. Claude API 응답 타입 불일치를 컴파일 타임에 잡음 |
| @anthropic-ai/sdk | 0.88.0 | Claude API 스트리밍 | 공식 SDK. `messages.stream()` 네이티브 지원. [VERIFIED: npm registry] |
| firebase | 12.12.0 | 클라이언트 익명 Auth + Firestore 읽기 | 형제 프로젝트 동일 버전(12.9.0)으로 검증됨. [VERIFIED: npm registry] |
| firebase-admin | 13.8.0 | 서버 Firestore 쓰기 | Lazy Proxy 패턴으로 Vercel 빌드 안전. [VERIFIED: npm registry] |
| fast-xml-parser | 5.5.11 | 법제처 XML 응답 파싱 | TypeScript 네이티브, xml2js보다 3배 빠름, 가장 많이 사용됨. [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-intl | 4.9.1 | Ko/En i18n 라우팅 | 형제 프로젝트와 동일 버전. 한국어 기본 로케일 (`/ko/...`). [VERIFIED: npm registry] |
| zustand | 5.0.11 | 위저드 상태 (메모리 전용, localStorage 사용 안 함) | PRIV-02 준수: 서버 자동 저장 차단. 형제 프로젝트 동일 버전. [VERIFIED: sibling package.json] |
| vitest | 4.2.2 | 단위/통합 테스트 | 형제 프로젝트 동일 계열(4.0.18). TDD 필수. [VERIFIED: npm registry] |
| @testing-library/react | 16.3.2 | 컴포넌트 테스트 | [VERIFIED: npm registry] |
| tailwindcss | 4.x | CSS-first 스타일링 | v4는 tailwind.config.js 없음. CSS @import로만 설정. [VERIFIED: official docs] |
| Zod | 3.x (NOT v4) | API 입력 검증 | @hookform/resolvers가 아직 Zod v4 미지원. Zod v4는 `zod/v4` 서브패스로만 존재. [VERIFIED: npm registry - Zod 4.3.6 최신이지만 default export는 v3 호환] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `runtime = 'nodejs'` on analyze route | `runtime = 'edge'` | Edge는 Anthropic SDK Node.js API 미지원. Node.js 필수. |
| fast-xml-parser | xml2js | xml2js는 callback-only legacy API. fast-xml-parser가 TypeScript 네이티브. |
| React state only (wizard) | localStorage | localStorage는 DV 피해자 가해자 접근 위험. 메모리 전용 필수. |
| Lazy Proxy (firebase-admin) | 직접 initializeApp | 직접 초기화는 `next build` 타임에 credentials 없어 오류. |

**Installation:**

```bash
# Core
npm install next@15 react@19 react-dom@19 typescript

# AI
npm install @anthropic-ai/sdk

# Firebase
npm install firebase firebase-admin

# Law API
npm install fast-xml-parser

# State + i18n
npm install zustand next-intl

# Dev
npm install -D tailwindcss @tailwindcss/postcss vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/user-event jsdom \
  @types/node @types/react @types/react-dom eslint eslint-config-next prettier
```

**Version verification:** [VERIFIED: npm registry - 2026-04-12]

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── [locale]/             # next-intl 라우팅 (ko/en)
│   │   ├── layout.tsx        # DisclaimerBanner + QuickExitButton + EmergencyContacts 배치
│   │   └── page.tsx          # 랜딩 (중립 타이틀)
│   └── api/
│       ├── analyze/
│       │   └── route.ts      # POST — pipeline orchestrator, runtime = 'nodejs'
│       └── law/
│           ├── search/route.ts  # GET — 법제처 lawSearch.do 프록시
│           └── detail/route.ts  # GET — 법제처 lawService.do 프록시
├── components/
│   ├── DisclaimerBanner.tsx  # 모든 페이지 상단 고정, COMPL-01/02
│   ├── QuickExitButton.tsx   # fixed 우상단, SAFE-01
│   └── EmergencyContacts.tsx # 1366/112, SAFE-03
└── lib/
    ├── koreanLawClient.ts    # 법제처 API 래퍼 (INFRA-01)
    ├── claudeClient.ts       # Anthropic SDK 래퍼 + 가드레일 (COMPL-03/04)
    ├── pipelineOrchestrator.ts  # 분석 파이프라인 조합
    ├── complianceFilter.ts   # 출력 후처리 필터 (COMPL-03/04)
    ├── firebase.ts           # 클라이언트 SDK (window guard 포함)
    └── firebaseAdmin.ts      # Admin SDK (Lazy Proxy 패턴)
```

### Pattern 1: 즉시 스트림 반환 (Vercel timeout 회피)

Route Handler는 법제처 API 호출 + Claude 스트리밍을 ReadableStream 내부에서 수행하고, Response를 즉시 반환해야 한다. `runtime = 'nodejs'`와 `maxDuration = 60` 설정이 필수다.

```typescript
// src/app/api/analyze/route.ts
// Source: .planning/research/ARCHITECTURE.md — Pattern 1
export const runtime = 'nodejs'; // NOT 'edge' — Anthropic SDK는 Node.js API 필요
export const maxDuration = 60;   // Vercel Pro: 최대 300s. 60s는 안전한 기본값

export async function POST(req: Request) {
  const situation = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const laws = await koreanLawClient.searchStatutes(buildQueries(situation));
        const precedents = await koreanLawClient.searchPrecedents(situation);
        const claudeStream = await claudeClient.stream(buildPrompt(situation, laws, precedents));

        for await (const chunk of claudeStream) {
          // 후처리 필터 적용 (COMPL-03/04)
          const filtered = complianceFilter.apply(chunk.text);
          if (filtered !== null) {
            controller.enqueue(new TextEncoder().encode(filtered));
          }
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
      'Cache-Control': 'no-cache, no-store',
    },
  });
}
```

[CITED: .planning/research/ARCHITECTURE.md Pattern 1]

### Pattern 2: 법제처 API 래퍼 (XML→JSON 정규화)

법제처 API는 HTTP (not HTTPS), XML 응답, HTML 태그 포함(`<br/>`)이며 OC 키는 서버 전용 환경 변수에서만 사용한다. 응답 경계에서 즉시 정규화하고, 애플리케이션 코드에는 XML이나 HTML이 도달하지 않아야 한다.

```typescript
// src/lib/koreanLawClient.ts
import { XMLParser } from 'fast-xml-parser';

const OC_KEY = process.env.KOREAN_LAW_OC_KEY; // 서버 전용, NEXT_PUBLIC_ 금지
const BASE_URL = 'https://www.law.go.kr/DRF'; // HTTPS 지원 확인됨 [ASSUMED]
const parser = new XMLParser({ ignoreAttributes: false });

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function searchStatutes(query: string): Promise<Statute[]> {
  const url = `${BASE_URL}/lawSearch.do?OC=${OC_KEY}&target=law&type=XML&query=${encodeURIComponent(query)}`;
  const xml = await fetch(url, { signal: AbortSignal.timeout(3000) }).then(r => r.text());
  const parsed = parser.parse(xml);
  // XML 필드명은 Phase 1 구현 중 실제 응답으로 검증 필요 [ASSUMED: LawSearch 하위 Law 배열]
  const laws = parsed?.LawSearch?.law ?? [];
  return (Array.isArray(laws) ? laws : [laws]).map(l => ({
    name: l.법령명한글 ?? '',
    mst: l.법령MST ?? '',
    category: l.법령구분명 ?? '',
    effectiveDate: l.시행일자 ?? '',
  }));
}

// 500ms 간격 rate-limit 가드
let lastCallAt = 0;
async function rateLimitedFetch(url: string): Promise<string> {
  const now = Date.now();
  const wait = Math.max(0, 500 - (now - lastCallAt));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCallAt = Date.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
  return res.text();
}
```

[CITED: .planning/GATE-VERIFICATION.md — API 작동 확인, 법령 필드명은 ASSUMED]

### Pattern 3: 변호사법 가드레일 (시스템 프롬프트 + 후처리)

두 겹의 방어가 필요하다. 시스템 프롬프트로 Claude에 제약을 주고, 후처리 필터로 슬립스루를 차단한다.

```typescript
// src/lib/claudeClient.ts
export const SYSTEM_PROMPT = `
당신은 법률 정보를 제공하는 도구입니다. 아래 규칙을 절대 위반하지 마세요:
1. 법적 결론을 내리지 마세요. 금지 표현: "~이 인정됩니다", "~가 유리합니다", "귀하의 경우", "~할 가능성이 높습니다"
2. 재산분할/위자료 금액, 양육권 결과, 승소율을 예측하지 마세요.
3. 모든 법령과 판례는 법제처 API 검색 결과에서만 인용하세요. 번호나 내용을 생성하지 마세요.
4. 응답 형식: 반드시 "이혼 시 일반적으로 검토되는 쟁점" 형태로만 제시하세요.
5. 매 응답 끝에: "이 정보는 법률 자문이 아닙니다. 변호사 상담을 받으시기 바랍니다."
`.trim();

// src/lib/complianceFilter.ts
const FORBIDDEN_PATTERNS = [
  /귀하의\s*경우/,
  /귀하에게\s*(적용|해당)/,
  /~\s*입니다.*(?:법적|재판|판결)/,
  /(?:\d+)%\s*(?:가능성|확률|승소)/,
  /(?:재산분할|위자료).*(?:\d+만원|\d+억)/,
];

export function applyFilter(text: string): string | null {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      // 스트리밍 청크를 차단하고 로그 (모니터링 목적)
      console.warn('[ComplianceFilter] Blocked chunk:', text.slice(0, 100));
      return null; // 청크 전체 드롭
    }
  }
  return text;
}
```

[CITED: .planning/research/PITFALLS.md — C-1 방지 전략, .planning/research/ARCHITECTURE.md — Pattern 4]

### Pattern 4: DV 긴급 탈출 (완전한 디지털 안전)

단순 탭 이동이 아닌 이력 교체 + 저장소 초기화 조합이 필수다.

```typescript
// src/components/QuickExitButton.tsx
'use client';

export function QuickExitButton() {
  const handleExit = () => {
    // 1) 브라우저 히스토리에서 현재 페이지 제거
    window.history.replaceState(null, '', '/');
    // 2) 세션 저장소 초기화 (SAFE-01)
    sessionStorage.clear();
    // 3) 상태 메모리 초기화는 React state reset으로 처리
    // 4) 중립 사이트로 이동 (날씨, 뉴스 등)
    window.location.replace('https://weather.com');
  };

  return (
    <button
      onClick={handleExit}
      aria-label="사이트 즉시 나가기"
      style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}
      className="min-h-[56px] min-w-[56px] bg-red-600 text-white font-bold rounded-lg px-4 py-2"
    >
      나가기 ✕
    </button>
  );
}
```

**중요:** 위저드 상태는 절대 `localStorage`에 저장하지 않는다. Zustand store의 persist 미들웨어를 사용하지 않는다.

[CITED: .planning/research/PITFALLS.md — C-3 DV 탈출 버튼 완전한 구현]

### Pattern 5: Firebase 초기화 (형제 프로젝트 검증된 패턴)

```typescript
// src/lib/firebase.ts (클라이언트)
// window guard — SSR/빌드 타임 초기화 방지
if (typeof window !== 'undefined') {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  // 익명 로그인은 AuthProvider에서 signInAnonymously() 호출
}

// src/lib/firebaseAdmin.ts (서버)
// Lazy Proxy — 요청 타임에만 초기화, 빌드 타임 오류 방지
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const db = getFirestore(requireAdminApp());
    const value = (db as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as Function).bind(db) : value;
  },
});
```

[VERIFIED: 형제 프로젝트 src/lib/firebaseAdmin.ts 직접 확인]

### Pattern 6: 중립 페이지 메타데이터 (SAFE-02)

```typescript
// src/app/[locale]/layout.tsx
export const metadata: Metadata = {
  title: '법률 정보 안내',          // "이혼" 포함 금지 (SAFE-02)
  description: '법률 정보를 쉽게 이해할 수 있도록 도와드립니다.',
  // robots: noindex 고려 (검색엔진 노출 최소화 — DV 피해자 보호)
};
```

동적 타이틀 변경은 허용하지 않는다. DV 감지 시에도 서버 사이드 metadata가 고정되고, client-side에서 `document.title`을 조작할 필요는 없다.

[ASSUMED: Next.js 15 App Router metadata API 동작 방식 — 공식 문서 미확인]

### Anti-Patterns to Avoid

- **Edge runtime에 Anthropic SDK:** `export const runtime = 'edge'`는 Anthropic SDK와 호환 안 됨. 반드시 `'nodejs'`.
- **localStorage에 위저드 데이터:** DV 피해자 가해자 접근 가능. 메모리(React state + Zustand non-persist)만 사용.
- **클라이언트에서 법제처 API 직접 호출:** OC 키 노출 + CORS 차단 위험. 모든 호출은 Route Handler 경유.
- **Claude에게 판례 번호 생성 요청:** 환각 위험. 법제처 API 결과만 인용, Claude는 요약만.
- **Firestore 자동 저장:** PIPA 위반. 명시적 동의 모달 이후에만 쓰기.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XML 파싱 | 직접 regex/string 파싱 | fast-xml-parser | CDATA, 속성, 중첩 엘리먼트 처리 엣지케이스 무수히 많음 |
| 스트리밍 응답 버퍼링 | 직접 SSE 프로토콜 구현 | ReadableStream + Response | Next.js 15 Route Handler가 이미 SSE 호환 포맷으로 처리 |
| Firebase 인증 토큰 검증 | 직접 JWT 디코드 | firebase-admin `verifyIdToken()` | 토큰 만료, 서명 검증, 취소된 토큰 처리 등 복잡 |
| 익명 세션 관리 | 직접 UUID 생성 + 쿠키 | Firebase Anonymous Auth | Firebase가 UID를 영속적으로 관리. 나중에 Google 계정 링크 시 `linkWithCredential()` 사용 가능 |
| HTML 스트립 | 직접 regex | 유틸 함수 (단순 replace) | 법제처 API 응답의 `<br/>`, `<p>` 수준은 간단한 replace로 충분. XSS 위험 없는 서버사이드 처리 |

---

## Common Pitfalls

### Pitfall 1: 법제처 API XML 필드명 사전 가정

**What goes wrong:** `parsed.LawSearch.law.법령명한글` 같이 XML 필드명을 사전에 가정하고 코드를 작성했다가, 실제 응답의 필드명이 다르거나 중첩 구조가 다르면 silent failure(빈 배열 반환).

**Why it happens:** GATE 검증이 API가 응답한다는 사실만 확인했고, 정확한 XML 스키마는 직접 파싱해서 검증해야 한다.

**How to avoid:** Wave 1 첫 번째 태스크에서 법제처 API를 직접 호출하고 실제 XML을 출력하여 필드명 확인. 타입 정의를 실제 응답 기반으로 작성.

**Warning signs:** `searchStatutes()` 결과가 빈 배열 반환. `parsed.LawSearch` 자체가 undefined.

### Pitfall 2: Vercel 타임아웃 (법제처 + Claude 순차 호출)

**What goes wrong:** 법제처 lawSearch(~500ms) + getPrecSearch(~500ms) + Claude 스트리밍(5~15s) = 총 7~17초. `maxDuration`을 설정하지 않으면 Vercel 기본 10초 타임아웃 초과 → 504 에러.

**How to avoid:** `export const maxDuration = 60` 필수. ReadableStream으로 즉시 응답 시작. 법제처 API 3초 타임아웃 설정(AbortSignal.timeout(3000)).

**Warning signs:** 개발 환경에서는 되고 Vercel에서만 504 에러 발생.

### Pitfall 3: 면책 고지가 layout.tsx 밖에서 조건부 렌더링

**What goes wrong:** DisclaimerBanner를 특정 페이지에만 렌더링하거나, 특정 조건에서 숨김 처리. COMPL-01은 "모든 페이지 상단"이 요구사항.

**How to avoid:** `[locale]/layout.tsx`에서 DisclaimerBanner를 `children` 위에 항상 렌더링. 조건부 렌더링 금지.

**Warning signs:** 모달 오버레이가 뜰 때 DisclaimerBanner가 가려짐.

### Pitfall 4: QuickExitButton이 다른 UI에 가려짐

**What goes wrong:** z-index가 낮아 쿠키 배너, 모달, shadcn/ui 오버레이 뒤에 숨음. 모바일에서 스크롤 시 fixed 위치가 깨짐.

**How to avoid:** `z-index: 9999` 사용. `position: fixed; top: 1rem; right: 1rem`. 최소 터치 타겟 56px. CSS `safe-area-inset-right` 패딩 적용(노치 대응).

**Warning signs:** 모달이 열릴 때 버튼이 안 보임.

### Pitfall 5: 첫 방문 시 익명 Auth 초기화 실패

**What goes wrong:** Firebase Client SDK가 SSR에서 초기화 시도 → `window is not defined` 오류 → 빌드 실패 또는 런타임 오류.

**How to avoid:** `typeof window !== 'undefined'` 가드 필수. `signInAnonymously()`는 `useEffect` 내부에서만 호출.

**Warning signs:** Vercel 빌드 로그에 `ReferenceError: window is not defined`.

### Pitfall 6: Claude 스트리밍 청크에 개별화 언어가 등장

**What goes wrong:** 시스템 프롬프트만 설정하고 후처리 필터 미구현 → 특정 입력("내 케이스에서 위자료 얼마?")에서 Claude가 "귀하의 경우..." 형태로 응답 생성 → 변호사법 위반.

**How to avoid:** 스트리밍 청크를 `complianceFilter.apply(chunk)`로 통과시킨 후에만 controller에 enqueue. 필터에 걸린 청크는 drop + 경고 로그.

**Warning signs:** 출력 스트림에 "귀하의 경우", 숫자 + "만원", "% 가능성" 등 패턴 등장.

---

## Code Examples

### 법제처 판례 검색 (실제 API 응답 기반 [ASSUMED])

```typescript
// 판례 검색 — getPrecSearch endpoint
async function searchPrecedents(keywords: string[]): Promise<Precedent[]> {
  const query = keywords.join(' ');
  const url = `https://www.law.go.kr/DRF/lawSearch.do?OC=${OC_KEY}&target=prec&type=XML&query=${encodeURIComponent(query)}&display=5`;
  const xml = await rateLimitedFetch(url);
  const parsed = parser.parse(xml);
  // 실제 필드명 Wave 1에서 검증 필요
  const precs = parsed?.PrecSearch?.prec ?? [];
  return (Array.isArray(precs) ? precs : [precs]).map(p => ({
    caseNumber: p.사건번호 ?? '',
    date: p.선고일자 ?? '',
    summary: stripHtml(p.판시사항 ?? ''),
    ruling: stripHtml(p.판결요지 ?? ''),
  }));
}
```

[ASSUMED: XML 필드명은 GATE-VERIFICATION.md 결과 기반 추정, 실제 파싱 시 검증 필요]

### 익명 Auth 초기화 (AuthProvider)

```typescript
// src/components/AuthProvider.tsx
'use client';
import { useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!auth?.currentUser) {
      signInAnonymously(auth).catch(console.error);
    }
  }, []);
  return <>{children}</>;
}
```

[VERIFIED: 형제 프로젝트 firebase.ts 패턴 적용, AUTH-01 구현]

### 중립 타이틀 메타데이터

```typescript
// src/app/[locale]/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '법률 정보 안내',
  description: '상황에 맞는 법률 정보를 정리해 드립니다.',
  robots: { index: false, follow: false }, // DV 피해자 보호: 검색 노출 최소화
};
```

[ASSUMED: Next.js 15 metadata API `robots` 필드 동작 — 공식 문서 미확인. 플래너 검증 필요]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel AI SDK streaming (streamText) | ReadableStream 직접 사용 | 이 프로젝트는 Vercel AI SDK 불필요 | Phase 1은 스트리밍 파이프라인 검증 목적, Vercel AI SDK의 `useCompletion` hook은 Phase 2 UI에서 사용 |
| tailwind.config.js | CSS `@import "tailwindcss"` | Tailwind v4.0 (2025) | 설정 파일 없음. CSS 파일 직접 수정. |
| Firebase v9 modular SDK | Firebase v12 (동일 modular API) | 점진적 업그레이드 | API 동일. 형제 프로젝트 12.9.0, npm 최신 12.12.0. |
| Zod 기본 import | Zod 3 고정 (`import { z } from 'zod'`) | Zod v4가 2025.07에 `zod/v4` 서브패스로 출시 | @hookform/resolvers가 Zod 4 미지원. v3 유지. |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 법제처 API HTTPS (`https://www.law.go.kr`) 지원 | Standard Stack / 코드 예시 | HTTP만 지원하면 Vercel 서버에서 HTTP fetch 필요 — 동일하게 작동하지만 코드 수정 필요 |
| A2 | 법제처 XML 필드명: `법령명한글`, `법령MST`, `사건번호`, `판시사항` | Code Examples | 실제 필드명이 다르면 silent failure. Wave 1에서 실제 응답 기반 검증 필수 |
| A3 | Next.js 15 metadata API `robots: { index: false }` 필드 동작 | Architecture Patterns Pattern 6 | 필드명이 다르면 robots 태그 미적용. 사소한 수정으로 해결 가능 |
| A4 | Zustand non-persist 기본값 (persist 미들웨어 미사용 시 localStorage 미저장) | Pattern 4 DV 탈출 | persist 미들웨어 기본값이 예상과 다르면 localStorage에 데이터 잔존 |
| A5 | `export const maxDuration = 60`이 Vercel Hobby 플랜에서도 동작 | Pattern 1 | Hobby 플랜은 maxDuration 10초 제한 가능. Pro 플랜 확인 필요 |

---

## Open Questions

1. **법제처 API: HTTP vs HTTPS**
   - What we know: GATE 검증에서 API가 응답함을 확인. URL 프로토콜 미확인.
   - What's unclear: `www.law.go.kr` 도메인이 HTTPS를 지원하는지.
   - Recommendation: Wave 1 첫 태스크에서 HTTPS URL로 fetch 시도, 실패 시 HTTP로 fallback.

2. **Vercel Hobby vs Pro 플랜의 maxDuration 한계**
   - What we know: Pro 플랜은 maxDuration 300s. Hobby 플랜은 10s 기본.
   - What's unclear: 이 프로젝트의 Vercel 플랜 등급.
   - Recommendation: `maxDuration = 60` 설정 후 배포 테스트. Hobby 플랜이면 스트리밍으로도 10s 초과 시 문제 발생 → Pro 업그레이드 또는 법제처 호출 병렬화 필수.

3. **Claude 스트리밍 청크 단위와 후처리 필터 적용 시점**
   - What we know: Anthropic SDK `messages.stream()`이 텍스트 델타를 청크로 반환.
   - What's unclear: 청크 경계가 문장 중간에 잘릴 때 금지 패턴이 두 청크에 걸쳐 나타나는 경우 처리 방법.
   - Recommendation: 청크 버퍼를 유지하여 문장 단위로 필터링. 또는 완전한 문장이 모인 후 방출(스트리밍 지연 허용).

4. **PRIV-04: Anthropic이 Claude API를 통해 수신한 데이터를 학습에 사용하지 않는다는 보장**
   - What we know: Anthropic의 일반 Privacy Policy 존재.
   - What's unclear: API를 통해 전송된 데이터가 모델 학습에 사용되지 않음을 명시한 조항.
   - Recommendation: Anthropic API 약관의 데이터 처리 조항 확인. "API 데이터는 모델 학습에 사용되지 않습니다" 문구가 있으면 UI에 그대로 인용.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 18+ | @anthropic-ai/sdk | ✓ | (Vercel 런타임 제공) | — |
| 법제처 Open API | INFRA-01 | ✓ | — (공개 API) | 법령 미검색 graceful degradation |
| Vercel 배포 환경 | INFRA-02 | ✓ | — | 로컬 개발: `next dev` |
| Firebase 프로젝트 | AUTH-01, PRIV-01 | ✓ | Firebase SDK 12.x | — (신규 프로젝트 생성 필요) |
| Claude API 키 | INFRA-02 | ✓ | claude-sonnet-4-6 | — (없으면 분석 불가) |
| KOREAN_LAW_OC_KEY (oneday24n1) | INFRA-01 | ✓ | — | — (GATE에서 작동 확인) |

**Missing dependencies with no fallback:**
- 없음 — 모든 의존성 확인됨.

**Note:** Firebase 프로젝트는 새로 생성해야 함 (이 프로젝트용). 형제 프로젝트의 Firebase 프로젝트를 공유하지 않는다.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.2.2 |
| Config file | `vitest.config.ts` (Wave 0에서 생성) |
| Quick run command | `npx vitest run --reporter=dot` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | KoreanLawClient.searchStatutes() 반환 구조 검증 | unit | `npx vitest run src/__tests__/koreanLawClient.test.ts` | ❌ Wave 0 |
| INFRA-01 | HTML strip 유틸: `<br/>` → 공백 변환 | unit | `npx vitest run src/__tests__/koreanLawClient.test.ts` | ❌ Wave 0 |
| INFRA-01 | 3초 타임아웃 시 graceful fallback | unit (mock) | `npx vitest run src/__tests__/koreanLawClient.test.ts` | ❌ Wave 0 |
| INFRA-02 | POST /api/analyze가 ReadableStream을 즉시 반환 | integration | `npx vitest run src/__tests__/analyze.test.ts` | ❌ Wave 0 |
| COMPL-03 | complianceFilter: 금지 패턴 차단 | unit | `npx vitest run src/__tests__/complianceFilter.test.ts` | ❌ Wave 0 |
| COMPL-04 | "귀하의 경우" 패턴 감지 → null 반환 | unit | `npx vitest run src/__tests__/complianceFilter.test.ts` | ❌ Wave 0 |
| SAFE-01 | QuickExitButton 클릭 시 history.replaceState 호출 | unit (jsdom) | `npx vitest run src/__tests__/QuickExitButton.test.ts` | ❌ Wave 0 |
| AUTH-01 | AuthProvider 마운트 시 signInAnonymously 호출 | unit (mock) | `npx vitest run src/__tests__/AuthProvider.test.ts` | ❌ Wave 0 |
| PRIV-02 | 분석 흐름에서 Firestore write 호출 없음 (기본값) | unit (mock) | `npx vitest run src/__tests__/pipelineOrchestrator.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=dot` (관련 테스트 파일만)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/koreanLawClient.test.ts` — INFRA-01 커버리지
- [ ] `src/__tests__/complianceFilter.test.ts` — COMPL-03, COMPL-04
- [ ] `src/__tests__/QuickExitButton.test.ts` — SAFE-01
- [ ] `src/__tests__/AuthProvider.test.ts` — AUTH-01
- [ ] `src/__tests__/pipelineOrchestrator.test.ts` — PRIV-02
- [ ] `vitest.config.ts` — 프레임워크 설정
- [ ] `src/__tests__/setup.ts` — jsdom 환경 설정
- Framework install: `npm install -D vitest @vitejs/plugin-react @testing-library/react jsdom`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Firebase Anonymous Auth (server에서 ID 토큰 검증) |
| V3 Session Management | yes | 위저드 상태 메모리 전용 (sessionStorage 최소화) |
| V4 Access Control | yes | `/api/analyze` — 인증 없이 호출 가능하지만 rate limit 적용 |
| V5 Input Validation | yes | Zod로 `/api/analyze` 요청 바디 검증 |
| V6 Cryptography | no | 이 Phase에서는 암호화 직접 구현 없음 (Firebase/Anthropic이 처리) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| OC 키 클라이언트 노출 | Information Disclosure | `KOREAN_LAW_OC_KEY` 서버 전용 env var, NEXT_PUBLIC_ 접두사 금지 |
| 법제처 API를 통한 SSRF | Tampering | 법제처 도메인 고정(화이트리스트). 사용자 입력을 URL로 직접 조합하지 않음 |
| 과도한 Claude API 호출 | Elevation of Privilege | `/api/analyze` rate limiting (IP 기반 또는 Firebase UID 기반) |
| sessionStorage 미초기화로 데이터 잔존 | Information Disclosure | QuickExitButton에서 `sessionStorage.clear()` 강제 실행 |
| 위저드 데이터 localStorage 잔존 | Information Disclosure | Zustand에 persist 미들웨어 미사용. localStorage 접근 코드 전면 금지 |

---

## Sources

### Primary (HIGH confidence)

- 형제 프로젝트 `mbti-ai-live-chat/src/lib/firebaseAdmin.ts` — Lazy Proxy 패턴 직접 확인
- 형제 프로젝트 `mbti-ai-live-chat/src/lib/firebase.ts` — window guard 패턴 직접 확인
- 형제 프로젝트 `mbti-ai-live-chat/package.json` — firebase@12.9.0, zustand@5.0.11, vitest@4.0.18 직접 확인
- `.planning/GATE-VERIFICATION.md` — 법제처 API 작동 확인, 683건 판례, HTML 태그 포함 확인
- `.planning/research/ARCHITECTURE.md` — 스트리밍 Route Handler 패턴, 컴포넌트 경계
- `.planning/research/PITFALLS.md` — C-1~C-4, M-1, N-1~N-4 모든 함정 정보
- `.planning/research/STACK.md` — 전체 스택 버전 및 선택 근거
- npm registry (2026-04-12): @anthropic-ai/sdk@0.88.0, firebase@12.12.0, firebase-admin@13.8.0, fast-xml-parser@5.5.11, next-intl@4.9.1, vitest@4.2.2, tailwindcss@4.2.2 [VERIFIED]

### Secondary (MEDIUM confidence)

- [법제처 Open API 가이드](https://open.law.go.kr/LSO/openApi/guideList.do) — 엔드포인트 레퍼런스
- [대법원 로폼 판결 2025.2](https://www.lawtimes.co.kr/news/articleView.html?idxno=218004) — 변호사법 109조 AI 적용 기준
- [ACM DV Quick Exit 감사](https://dl.acm.org/doi/fullHtml/10.1145/3544548.3581078) — DV 탈출 버튼 완전한 구현 근거

---

## Metadata

**Confidence breakdown:**

- Standard Stack: HIGH — npm registry 직접 확인 + 형제 프로젝트 동일 버전 검증
- Architecture: HIGH — 형제 프로젝트 검증된 패턴 적용. 법제처 API 래퍼 XML 필드명만 ASSUMED
- Pitfalls: HIGH — 실제 판례(대법원 로폼 2025.2, Latham & Watkins 2025) + ACM 학술 연구 기반. 추측 아님
- Test Map: HIGH — Vitest 4.x 형제 프로젝트 동일 패턴

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (30일 — 스택이 안정적이지만 Anthropic SDK 업데이트 주시 필요)
