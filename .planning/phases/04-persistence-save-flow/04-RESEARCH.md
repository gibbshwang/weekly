# Phase 4: Persistence + Save Flow - Research

**Researched:** 2026-04-12
**Domain:** Firebase Anonymous Auth → Google account linking, Firestore write/delete, PIPA Article 23 save-consent UX
**Confidence:** HIGH (stack is established; patterns verified against official Firebase docs and sibling codebase)

---

## Summary

Phase 4 adds an optional save flow: after seeing analysis results, the user can choose to persist the session to Firestore. This requires three components working in sequence — (1) a PIPA Article 23 consent modal specific to *saving* (not the one for entering sensitive data in Phase 3), (2) a Google sign-in that upgrades the existing anonymous Firebase account via `linkWithPopup`, and (3) a server-side Firestore write scoped to the authenticated user's UID.

The anonymous-to-Google upgrade pattern (`linkWithPopup`) is the correct Firebase primitive for this flow. The anonymous UID persists after linking, so all subsequent Firestore writes use the same UID that the anonymous session would have used — no data migration or UID remapping is needed. Session deletion (success criterion 3) extends the existing `/api/account` DELETE route by adding an `adminDb.collection('sessions').doc(sessionId).delete()` call before `adminAuth.deleteUser(uid)`.

The key architectural decision is **flat collection vs. subcollection** for session storage. Given the CLAUDE.md constraint of "단일 컬렉션 design" and PIPA's minimal-collection principle, use `sessions/{sessionId}` with `userId` as a field (not nested under `users/{uid}/sessions/`). This enables server-side deletion by `userId` field query without needing to know the `sessionId` up front.

**Primary recommendation:** Use `sessions/{sessionId}` flat collection with `userId` field + Firestore security rules requiring `request.auth.uid == resource.data.userId`. Extend the existing DELETE route. Use `linkWithPopup` with fallback to `linkWithRedirect` for mobile browsers.

---

## Standard Stack

No new libraries needed. All required packages are already installed.

### Core (already in project)
| Library | Version in project | Purpose in Phase 4 | Verified |
|---------|-------------------|---------------------|----------|
| firebase (client) | ^12.12.0 | `linkWithPopup`, `GoogleAuthProvider`, `getRedirectResult` | [VERIFIED: package.json] |
| firebase-admin | ^13.8.0 | `adminDb.collection('sessions').doc().set()` + `.delete()` | [VERIFIED: package.json] |
| zustand | ^5.0.12 | `useSaveStore` for save flow state (saveConsented, saveStatus) | [VERIFIED: package.json] |
| vitest | ^4.1.4 | TDD for save route + SaveButton component | [VERIFIED: package.json] |

### No New Installs Required
`linkWithPopup` and `GoogleAuthProvider` are already exported from the installed `firebase` package (version 12.x includes these). `adminDb` is already set up via the Proxy pattern in `src/lib/firebaseAdmin.ts`.

---

## Architecture Patterns

### Recommended Firestore Schema

```
sessions/{sessionId}
  ├── userId: string           // Firebase UID — owner of this session
  ├── createdAt: number        // Date.now() at write time
  ├── pipaConsentedAt: number  // Timestamp of PIPA Article 23 consent
  ├── wizardSituation: object  // Snapshot of UserSituation (from wizardStore)
  └── analysisResult: object   // Snapshot of AnalysisSections (from wizardStore)
```

**Why flat collection (not `users/{uid}/sessions/{id}`):** CLAUDE.md specifies "단일 컬렉션 design". Flat `sessions/` collection means `adminDb.collection('sessions').where('userId', '==', uid)` can find and delete all sessions for a user when account is deleted — no need for subcollection enumeration. [VERIFIED: CLAUDE.md constraint]

**`sessionId` generation:** Use `crypto.randomUUID()` (built into Node 18+ and modern browsers). Generate on the client before the save API call, send it in the request body. This makes the write idempotent on retry.

### Pattern 1: Anonymous → Google Account Upgrade (linkWithPopup)

**What:** `linkWithPopup(auth.currentUser, googleProvider)` merges the Google identity into the existing anonymous Firebase account. The UID does NOT change.
**When to use:** User clicks "저장하기", consents to PIPA, then needs Google login.

```typescript
// Source: https://firebase.google.com/docs/auth/web/account-linking [CITED]
import { getAuth, linkWithPopup, GoogleAuthProvider, type AuthError } from 'firebase/auth';

async function linkGoogleAccount(): Promise<void> {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  
  try {
    await linkWithPopup(auth.currentUser!, provider);
    // UID unchanged — user.uid is same as before
  } catch (err) {
    const error = err as AuthError;
    if (error.code === 'auth/credential-already-in-use') {
      // Google account is already linked to a different Firebase account
      // (rare: user has used this Google account with anonymous auth before)
      // Recovery: sign in with the existing Google account instead
      // NOTE: Data from the current anonymous session will be lost unless manually merged
      throw new Error('이미 다른 계정에 연결된 Google 계정입니다. 해당 계정으로 로그인해 주세요.');
    }
    if (error.code === 'auth/popup-blocked') {
      // Fall back to redirect flow on mobile
      throw error; // caller handles with linkWithRedirect
    }
    throw error;
  }
}
```

### Pattern 2: Mobile Fallback — linkWithRedirect

On mobile browsers (especially in-app browsers on iOS/Android), `linkWithPopup` may be blocked. Firebase's recommendation since June 2024 is to use `linkWithRedirect` as the mobile fallback. [CITED: firebase.google.com/docs/auth/web/redirect-best-practices]

```typescript
// Source: https://firebase.google.com/docs/auth/web/account-linking [CITED]
import { 
  linkWithPopup, linkWithRedirect, getRedirectResult, 
  GoogleAuthProvider, getAuth 
} from 'firebase/auth';

async function linkGoogleWithFallback(): Promise<void> {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Redirect flow: page reloads, result read on return
    await linkWithRedirect(auth.currentUser!, provider);
    // (execution continues on the page that the redirect returns to)
  } else {
    await linkWithPopup(auth.currentUser!, provider);
  }
}

// In AuthProvider or layout: read redirect result on mount
// getRedirectResult(auth).then(result => { if (result) { /* linked */ } })
```

**Simplification option:** Given this is a legal sensitivity tool where users are unlikely to use in-app social browsers, starting with popup-only and adding redirect fallback in v2 is acceptable. [ASSUMED — risk: medium. Mobile popup blocking will surface in QA.]

### Pattern 3: Session Save Route Handler

```typescript
// POST /api/sessions — save analysis session
// Source: sibling project mbti-ai-live-chat/src/app/api/memory/extract/route.ts [VERIFIED]
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import type { AnalysisSections } from '@/lib/parseAnalysisStream';
import type { UserSituation } from '@/types/analysis';

export const runtime = 'nodejs';

interface SaveSessionBody {
  sessionId: string;
  wizardSituation: Partial<UserSituation>;
  analysisResult: AnalysisSections;
  pipaConsentedAt: number;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  
  let uid: string;
  try {
    ({ uid } = await adminAuth.verifyIdToken(authHeader.slice(7)));
  } catch {
    return new Response(JSON.stringify({ error: '유효하지 않은 인증 토큰입니다.' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const body = await req.json() as SaveSessionBody;
  const { sessionId, wizardSituation, analysisResult, pipaConsentedAt } = body;
  
  if (!sessionId || !analysisResult) {
    return new Response(JSON.stringify({ error: '필수 데이터가 없습니다.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Idempotent: if already saved, return 200 without re-writing
  const sessionRef = adminDb.collection('sessions').doc(sessionId);
  const existing = await sessionRef.get();
  if (existing.exists && existing.data()?.userId === uid) {
    return new Response(JSON.stringify({ saved: true }), { status: 200 });
  }
  
  await sessionRef.set({
    userId: uid,
    createdAt: Date.now(),
    pipaConsentedAt,
    wizardSituation,
    analysisResult,
  });
  
  return new Response(JSON.stringify({ saved: true }), {
    status: 201, headers: { 'Content-Type': 'application/json' },
  });
}
```

### Pattern 4: Session Deletion — Extending Existing DELETE /api/account

The current `DELETE /api/account` only deletes the Firebase Auth user (`adminAuth.deleteUser(uid)`). Phase 4 must extend it to also delete all Firestore sessions owned by that user.

**Critical:** Firestore does NOT automatically delete documents when the owning UID is removed from Auth. [CITED: firebase.google.com/docs/firestore/manage-data/delete-data]

```typescript
// Extension to src/app/api/account/route.ts
// Add before adminAuth.deleteUser(uid):
const sessionsQuery = adminDb.collection('sessions').where('userId', '==', uid);
const snapshot = await sessionsQuery.get();
const batch = adminDb.batch();
snapshot.docs.forEach(doc => batch.delete(doc.ref));
await batch.commit();
await adminAuth.deleteUser(uid);
```

**Why batch delete:** Firestore batch writes support up to 500 operations. A user will have at most a few sessions (Phase 4 is MVP save, not multi-session). Batch is safe and atomic. [CITED: firebase.google.com/docs/firestore/manage-data/delete-data]

### Pattern 5: Firestore Security Rules

```
// firestore.rules
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{sessionId} {
      // Only authenticated owner can read or delete their own sessions
      allow read, delete: if request.auth != null 
                          && request.auth.uid == resource.data.userId;
      // Create: must be authenticated, must write own userId
      allow create: if request.auth != null 
                    && request.auth.uid == request.resource.data.userId;
      // No update — sessions are write-once
      allow update: if false;
    }
  }
}
```

**Note:** Server-side writes via `firebase-admin` bypass Firestore security rules entirely. Rules only apply to client-SDK writes. The save route uses Admin SDK, so rules are not evaluated for saves. Rules protect against direct client manipulation. [CITED: firebase.google.com/docs/firestore/security/get-started]

### Recommended Project Structure Additions

```
src/
├── app/
│   └── api/
│       ├── account/
│       │   └── route.ts     # EXTEND: add Firestore session deletion before auth deletion
│       └── sessions/
│           └── route.ts     # NEW: POST to save analysis session
├── components/
│   └── results/
│       └── SaveButton.tsx   # NEW: save button + PIPA consent modal + Google login flow
├── stores/
│   └── saveStore.ts         # NEW: Zustand store for save flow state
└── (root)
    └── firestore.rules      # NEW: security rules for sessions collection
```

### Pattern 6: Save Flow UI State Machine

The save flow has 5 states managed in `useSaveStore`:

```typescript
// src/stores/saveStore.ts
type SaveStatus = 'idle' | 'consent' | 'google-login' | 'saving' | 'saved' | 'error';

interface SaveState {
  status: SaveStatus;
  sessionId: string | null;   // set when save begins, persists to 'saved'
  errorMessage: string | null;
  setStatus: (s: SaveStatus) => void;
  setSessionId: (id: string) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}
```

State machine transitions:
- `idle` → click "저장하기" → `consent`
- `consent` → user agrees → `google-login`
- `consent` → user cancels → `idle`
- `google-login` → `linkWithPopup` success → `saving`
- `google-login` → popup blocked/cancelled → `idle` (with error message)
- `google-login` → auth/credential-already-in-use → `error`
- `saving` → POST /api/sessions success → `saved`
- `saving` → POST failure → `error`
- `saved` → show "저장됨" permanent state (no reset — session is saved)

### Anti-Patterns to Avoid

- **Writing Firestore from the client SDK directly:** Bypass via Admin SDK keeps security rules simpler and avoids client-side credential exposure. Use `/api/sessions` POST route.
- **Storing pipaConsented flag in sessionStorage:** PIPA save-consent is separate from Phase 3's sensitive-data consent. Track separately. Phase 3's `pipaConsented` in wizardStore is for entering sensitive data; Phase 4 needs a separate consent for *persisting* data to Firestore.
- **Changing the anonymous UID on linkWithPopup:** It does NOT change. But if the developer incorrectly calls `signInWithGoogle` instead of `linkWithPopup`, a new UID is created, losing the anonymous session context. Always use `linkWithPopup(auth.currentUser, provider)` — not `signInWithPopup(auth, provider)`.
- **Forgetting redirect result handling:** If `linkWithRedirect` is used for mobile fallback, `getRedirectResult(auth)` must be called in `AuthProvider.useEffect` to complete the link on page reload.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Anonymous → Google account upgrade | Custom OAuth token exchange | `linkWithPopup` from firebase/auth | Firebase handles token exchange, UID preservation, error codes |
| Firestore write idempotency | Custom lock/mutex | `sessionRef.get()` → check `existing.exists` before `.set()` | Simple and reliable; sibling project uses this pattern |
| Batch deletion of user documents | Recursive async delete loops | `adminDb.batch()` with forEach delete | Atomic, 500-op limit sufficient for MVP |
| Mobile popup fallback detection | Custom UA sniffing library | `navigator.userAgent` check + `linkWithRedirect` | No library needed; Firebase handles the rest |
| Security rules testing | Manual Firestore writes | Firebase Rules Simulator in console | Built-in tool, no code needed |

**Key insight:** Firebase account linking is a solved problem. The `linkWithPopup` → fallback to `linkWithRedirect` pattern is well-documented and handles all edge cases. The only custom code is the UI state machine and the API route.

---

## Common Pitfalls

### Pitfall 1: linkWithPopup on Already-Linked Account
**What goes wrong:** User had previously signed in anonymously, saved a session, then clears browser data and tries to save again. `linkWithPopup` throws `auth/credential-already-in-use`.
**Why it happens:** The Google account is already linked to a Firebase user (the previous anonymous UID). Firebase creates a new anonymous session, but the Google credential belongs to the old UID.
**How to avoid:** Catch `auth/credential-already-in-use` explicitly. Display: "이 Google 계정은 이미 다른 세션에 연결되어 있습니다. 새 세션으로 저장됩니다." Then call `signInWithPopup(auth, provider)` to sign in as the existing account and save under that UID. This is a UX edge case — document but don't over-engineer for MVP.
**Warning signs:** `error.code === 'auth/credential-already-in-use'` in the catch block.

### Pitfall 2: Deleting Auth User Without Deleting Firestore Data
**What goes wrong:** `DELETE /api/account` removes the Firebase Auth user but leaves `sessions/{sessionId}` documents with `userId` orphaned in Firestore. PIPA requires immediate deletion.
**Why it happens:** Firebase Auth deletion and Firestore deletion are independent operations.
**How to avoid:** Always delete Firestore sessions BEFORE deleting the Auth user. If Firestore delete fails, do NOT delete the Auth user (return 500). If Auth delete fails after Firestore delete succeeded, log the discrepancy — the Firestore data is already gone which satisfies PIPA.
**Warning signs:** Existing `DELETE /api/account` route only calls `adminAuth.deleteUser(uid)` — no Firestore cleanup. Must be extended.

### Pitfall 3: Separate PIPA Consent for Save vs. Phase 3 Sensitive Data Consent
**What goes wrong:** Reusing Phase 3's `PipaConsentDialog` for the save flow, showing "민감정보 처리 동의" for what is actually "서버 저장 동의".
**Why it happens:** Phase 3 already has a PIPA consent modal. Developer assumes it's reusable.
**How to avoid:** Create a new `SaveConsentDialog` component with distinct text: "이혼 관련 분석 결과가 Google 계정과 연결된 서버에 저장됩니다. 개인정보보호법 제23조에 따라 민감정보 서버 저장에 대한 동의가 필요합니다." The Phase 3 dialog is for in-browser processing; Phase 4 dialog is for server persistence. [CITED: PIPA Article 23 requires explicit separate consent per processing purpose]
**Warning signs:** If the consent text says "서버에 저장되지 않고" — that's the wrong dialog.

### Pitfall 4: Using signInWithPopup Instead of linkWithPopup
**What goes wrong:** New Firebase UID is created. The analysis session data in Zustand (still tied to the old anonymous UID context) is saved under the new UID. The old anonymous account is orphaned.
**Why it happens:** Confusion between "sign in with Google" and "link Google to existing account".
**How to avoid:** Always use `linkWithPopup(auth.currentUser!, provider)` — not `signInWithPopup(auth, provider)`. The difference: `linkWithPopup` merges into existing account; `signInWithPopup` creates or switches to a different account.
**Warning signs:** After Google login, `auth.currentUser.isAnonymous` goes from `true` to `false` but the UID should stay the SAME. If UID changes, you used `signInWithPopup`.

### Pitfall 5: Mobile In-App Browser Popup Blocking
**What goes wrong:** On iOS/Android in-app browsers (KakaoTalk, Instagram), popups are consistently blocked. `linkWithPopup` throws `auth/popup-blocked` silently or after a timeout.
**Why it happens:** In-app browsers restrict window.open calls.
**How to avoid:** Detect mobile and use `linkWithRedirect` + `getRedirectResult`. For MVP, detecting `auth/popup-blocked` error code and showing an error message with a "다시 시도" button using redirect flow is sufficient.
**Warning signs:** `error.code === 'auth/popup-blocked'` or popup never appears on mobile.

### Pitfall 6: Firestore Security Rules Not Deployed
**What goes wrong:** `firestore.rules` file exists in the repo but is never deployed. Firestore defaults to denying all reads/writes if no rules exist, OR the default "allow all" rules from Firebase console are still active.
**Why it happens:** Firestore rules deployment is a separate step from code deployment (Vercel doesn't deploy them).
**How to avoid:** Include Firestore rules deployment in the Wave 0 setup checklist. Use `firebase deploy --only firestore:rules` as a manual step documented in the plan. For this project, since saves go through Admin SDK (which bypasses rules), rules are defense-in-depth — but required for PIPA audit trail.
**Warning signs:** Firebase console shows "Rules" tab with default allow-all rules after deploy.

---

## Code Examples

### Save Button Component Structure

```typescript
// Source: sibling project patterns [VERIFIED via codebase grep]
// src/components/results/SaveButton.tsx
'use client';

import { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { useSaveStore } from '@/stores/saveStore';
import { useWizardStore } from '@/stores/wizardStore';
import { SaveConsentDialog } from './SaveConsentDialog';

export function SaveButton() {
  const { status, setStatus, setSessionId, setError } = useSaveStore();
  const situation = useWizardStore(s => s.situation);
  // analysisResult from wherever it's stored post-Phase 2
  
  const handleSaveClick = () => setStatus('consent');
  
  const handleConsent = async () => {
    setStatus('google-login');
    const auth = getAuth();
    const { linkWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    
    try {
      await linkWithPopup(auth.currentUser!, provider);
      await performSave();
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === 'auth/popup-blocked') {
        setError('팝업이 차단되었습니다. 브라우저 설정을 확인해 주세요.');
        setStatus('error');
      } else if (error.code === 'auth/credential-already-in-use') {
        setError('이미 다른 계정과 연결된 Google 계정입니다.');
        setStatus('error');
      } else {
        setError('로그인 중 오류가 발생했습니다.');
        setStatus('error');
      }
    }
  };
  
  const performSave = async () => {
    setStatus('saving');
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    const sessionId = crypto.randomUUID();
    setSessionId(sessionId);
    
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId,
        wizardSituation: situation,
        analysisResult: /* from store */,
        pipaConsentedAt: Date.now(),
      }),
    });
    
    if (res.ok) {
      setStatus('saved');
    } else {
      setError('저장 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };
  
  if (status === 'saved') {
    return <p className="text-sm text-[#1B6B5A] font-medium">저장되었습니다.</p>;
  }
  
  return (
    <>
      <button
        onClick={handleSaveClick}
        disabled={status !== 'idle' && status !== 'error'}
        className="w-full py-3 border-2 border-[#1B6B5A] text-[#1B6B5A] rounded-lg font-medium min-h-[48px]"
      >
        {status === 'saving' ? '저장 중...' : '결과 저장하기'}
      </button>
      <SaveConsentDialog
        open={status === 'consent'}
        onConsent={handleConsent}
        onCancel={() => setStatus('idle')}
      />
    </>
  );
}
```

### Extended DELETE /api/account Route

```typescript
// Extension source: [VERIFIED: sibling uses same pattern for memory deletion]
// src/app/api/account/route.ts — updated
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function DELETE(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: '인증이 필요합니다.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }
  let uid: string;
  try {
    ({ uid } = await adminAuth.verifyIdToken(authHeader.slice(7)));
  } catch {
    return new Response(
      JSON.stringify({ error: '유효하지 않은 인증 토큰입니다.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }
  try {
    // Delete Firestore sessions BEFORE deleting Auth user (PIPA compliance order)
    const snapshot = await adminDb
      .collection('sessions')
      .where('userId', '==', uid)
      .get();
    if (!snapshot.empty) {
      const batch = adminDb.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    await adminAuth.deleteUser(uid);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(
      JSON.stringify({ error: '삭제에 실패했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
```

### SaveConsentDialog Text (PIPA Article 23 specific to saving)

The Phase 3 `PipaConsentDialog` says "서버에 저장되지 않고" — this is the *opposite* of what Phase 4 consent needs. Phase 4 `SaveConsentDialog` must clearly state that data IS being sent to the server:

```
민감정보 서버 저장 동의

이혼 관련 상황 및 분석 결과가 Google 계정과 연결된 서버에 영구 저장됩니다.
이 정보는 개인정보보호법 제23조의 민감정보에 해당합니다.

저장 목적: 분석 결과 재열람
보관 기간: 계정 삭제 시까지
제3자 제공: 없음
AI 학습 사용: 없음

[취소]  [동의하고 저장하기]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `signInWithPopup` only | `linkWithPopup` + redirect fallback | June 2024 (third-party storage blocking) | Must handle `auth/popup-blocked` on mobile |
| `linkWithCredential` with manual token | `linkWithPopup` (provider-based) | Firebase SDK v9+ (2021) | Simpler: no manual credential construction |
| Subcollection per user (`users/{uid}/sessions/`) | Flat `sessions/{sessionId}` with `userId` field | Best practice for deletion queries | Enables `where('userId','==',uid)` query for bulk delete |

**Deprecated/outdated:**
- Namespaced Firebase SDK (`firebase.auth().currentUser.linkWithCredential(credential)`): replaced by modular SDK `linkWithPopup(auth.currentUser, provider)` since SDK v9. The project already uses modular SDK (firebase@12.x). [VERIFIED: firebase.ts uses `import { getAuth } from 'firebase/auth'`]

---

## Runtime State Inventory

> Not a rename/refactor phase. No runtime state migration needed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | No Firestore sessions exist yet (feature not built) | None — new collection |
| Live service config | Firestore rules not yet deployed for `sessions` collection | Deploy `firestore.rules` as part of Wave 0 |
| OS-registered state | None | None |
| Secrets/env vars | Existing `FIREBASE_ADMIN_*` env vars cover Firestore writes | None — already configured |
| Build artifacts | None | None |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| firebase (client SDK) | `linkWithPopup`, `GoogleAuthProvider` | Yes | ^12.12.0 | — |
| firebase-admin | `/api/sessions` POST, `/api/account` DELETE extension | Yes | ^13.8.0 | — |
| Firestore (project) | Session storage | Yes (same project) | — | — |
| Google OAuth provider enabled in Firebase console | `linkWithPopup` | [ASSUMED] | — | Cannot work without it — manual setup required |

**Missing dependencies with no fallback:**
- Google OAuth provider must be enabled in the Firebase Authentication console (Providers tab). This is a manual step, not code. The planner must include a Wave 0 setup task.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.4 |
| Config file | `./vitest.config.ts` |
| Quick run command | `npx vitest run --config ./vitest.config.ts --root . <specific test files>` |
| Full suite command | `npx vitest run --config ./vitest.config.ts --root .` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-02 | POST /api/sessions saves session to Firestore | unit | `npx vitest run src/app/api/sessions/__tests__/route.test.ts` | No — Wave 0 |
| AUTH-02 | DELETE /api/account deletes Firestore sessions before Auth user | unit | `npx vitest run src/app/api/account/__tests__/route.test.ts` | Yes (extend) |
| AUTH-02 | SaveButton shows SaveConsentDialog on click | unit | `npx vitest run src/components/results/__tests__/SaveButton.test.tsx` | No — Wave 0 |
| AUTH-02 | SaveConsentDialog has PIPA Article 23 text about server storage | unit | (included in above) | No — Wave 0 |
| AUTH-02 | linkWithPopup called on Google consent | unit (mock) | `npx vitest run src/components/results/__tests__/SaveButton.test.tsx` | No — Wave 0 |
| AUTH-02 | Saved state shows "저장되었습니다" | unit | (included in above) | No — Wave 0 |

### Sampling Rate
- **Per task commit:** Run affected test file only
- **Per wave merge:** `npx vitest run --config ./vitest.config.ts --root .`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/app/api/sessions/__tests__/route.test.ts` — covers POST /api/sessions (AUTH-02)
- [ ] `src/components/results/__tests__/SaveButton.test.tsx` — covers save flow UI
- [ ] `src/components/results/__tests__/SaveConsentDialog.test.tsx` — covers PIPA consent text
- [ ] `src/stores/__tests__/saveStore.test.ts` — covers SaveStatus state machine

Extend existing:
- [ ] `src/app/api/account/__tests__/route.test.ts` — add Firestore batch delete assertions

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Firebase Anonymous Auth + `linkWithPopup` Google OAuth |
| V3 Session Management | Yes | Firebase ID Token (15min expiry) for all API calls |
| V4 Access Control | Yes | Firestore security rules + Admin SDK UID scoping |
| V5 Input Validation | Yes | Validate `sessionId`, `wizardSituation`, `analysisResult` shape in POST route |
| V6 Cryptography | No | Not hand-rolling crypto — Firebase handles all token signing |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Save other user's session under attacker UID | Elevation of Privilege | Admin SDK writes include `userId: uid` from verified token — not from request body |
| Replay saved session token to re-trigger save | Spoofing | Idempotency check: `sessionRef.get()` before `set()` — duplicate sessionIds ignored |
| Client-side Firestore write bypassing server | Tampering | Server-only writes via Admin SDK; Firestore rules deny client writes |
| PIPA non-compliance: save without explicit consent | Compliance | `SaveConsentDialog` is a required gate before `linkWithPopup` — consent timestamp stored |
| Orphaned Firestore data after account deletion | Information Disclosure | Firestore batch delete runs BEFORE `adminAuth.deleteUser` in DELETE /api/account |

---

## Open Questions

1. **Does wizardStore hold analysis results after Phase 2?**
   - What we know: `wizardStore.ts` holds `situation` (UserSituation). Phase 2 adds streaming analysis results.
   - What's unclear: Where do `AnalysisSections` live after analysis completes — in wizardStore or a separate store?
   - Recommendation: Check Phase 2 plan outputs. If results are in a separate store (likely `useAnalysisStore` or similar), the save POST body must pull from there. If they're in wizardStore, extend it with `analysisResult` field. The planner should check `02-04-PLAN.md` for the store design.

2. **Single-session vs. multi-session save in Phase 4 MVP**
   - What we know: REQUIREMENTS.md marks `V2-02: Session save and revisit (multi-session preparation)` as v2. AUTH-02 says "saving sessions" (plural in requirements, but save+delete is the scope).
   - What's unclear: Does Phase 4 allow saving multiple analysis sessions, or just the current session?
   - Recommendation: Save only the current session (one save per analysis). The schema supports multiple sessions per user (each has a unique `sessionId`), but the UI should not show a "my sessions" listing. That's V2-02. DeleteDataButton deletes all sessions for the user (correct for PIPA), not one-by-one session deletion.

3. **Firebase console setup: is Google OAuth provider already enabled?**
   - What we know: Phase 1 set up Anonymous Auth. Google OAuth is a separate provider to enable.
   - What's unclear: Was Google provider enabled during Phase 1 setup?
   - Recommendation: Wave 0 must include a manual checklist item: verify Google OAuth is enabled in Firebase console → Authentication → Sign-in method.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Popup-only approach for MVP (no linkWithRedirect fallback) is acceptable since mobile popup blocking is an edge case | Standard Stack, Code Examples | QA will flag if mobile users can't save; fix in v1.1 |
| A2 | `AnalysisSections` will be accessible from a Zustand store at save time (from Phase 2 work) | Architecture Patterns | If results aren't persisted in store, save body construction needs different approach |
| A3 | Google OAuth provider is not yet enabled in Firebase console | Environment Availability | If already enabled, Wave 0 manual step can be skipped |

---

## Sources

### Primary (HIGH confidence)
- [firebase.google.com/docs/auth/web/account-linking](https://firebase.google.com/docs/auth/web/account-linking) — `linkWithPopup`, `linkWithRedirect`, credential-already-in-use handling
- [firebase.google.com/docs/auth/web/anonymous-auth](https://firebase.google.com/docs/auth/web/anonymous-auth) — Anonymous → permanent account upgrade flow
- [firebase.google.com/docs/firestore/security/rules-conditions](https://firebase.google.com/docs/firestore/security/rules-conditions) — user-owned document security rules pattern
- [firebase.google.com/docs/firestore/manage-data/delete-data](https://firebase.google.com/docs/firestore/manage-data/delete-data) — subcollection deletion behavior, batch delete
- Sibling project `mbti-ai-live-chat/src/app/api/memory/extract/route.ts` — Firestore write pattern with idempotency guard, admin SDK pattern
- Project `src/lib/firebaseAdmin.ts` — existing Proxy init pattern (confirmed works)
- Project `src/app/api/account/route.ts` — existing DELETE pattern to extend
- Project `src/components/wizard/PipaConsentDialog.tsx` — Phase 3 PIPA dialog (NOT reusable for Phase 4 — different consent purpose)
- Project `package.json` — confirmed firebase@12.12.0, firebase-admin@13.8.0 installed

### Secondary (MEDIUM confidence)
- [firebase.google.com/docs/auth/web/redirect-best-practices](https://firebase.google.com/docs/auth/web/redirect-best-practices) — June 2024 guidance on popup blocking; `linkWithRedirect` for mobile
- [iclg.com/practice-areas/data-protection-laws-and-regulations/korea](https://iclg.com/practice-areas/data-protection-laws-and-regulations/korea) — PIPA Article 23 separate explicit consent per processing purpose

### Tertiary (LOW confidence — flagged in Assumptions Log)
- [medium.com — Firebase anonymous upgrade patterns](https://medium.com/@gg.code.latam/updating-firebase-authentication-in-next-js-solving-mobile-authentication-issues-2024-2025-5a01342bcc13) — mobile auth issues in Next.js; not verified against official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in package.json, no new installs
- Architecture: HIGH — Firebase auth linking and Firestore patterns verified against official docs and sibling project
- Pitfalls: HIGH — all pitfalls verified against official Firebase documentation or codebase inspection
- PIPA compliance: MEDIUM — general PIPA Article 23 requirements verified; specific Korean text not officially verified

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (Firebase APIs are stable; 30-day window safe)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-02 | Google login option for saving sessions | `linkWithPopup` pattern documented; POST /api/sessions route designed; Firestore schema defined; `SaveConsentDialog` for PIPA Article 23 consent before server write; DELETE /api/account extension for Firestore cleanup |
</phase_requirements>
