# Phase 3: Polish, Accessibility, PIPA Completeness - Research

**Researched:** 2026-04-12
**Domain:** WCAG 2.1 AA 접근성, 모바일 반응형(375px), PIPA 제23조 민감정보 동의, Firebase 계정 삭제
**Confidence:** HIGH (코드베이스 직접 검증 + 공식 문서 기반)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Mobile-first 반응형 (min 375px) | 기존 컴포넌트 `max-w-lg mx-auto px-4` 패턴 확인. 고정 너비 없음, 수평 스크롤 없음. 점검 필요 항목 목록화. |
| UI-02 | 터치 타겟 최소 48px | DivorceReasonStep 빠른 선택 버튼 `min-h-[36px]` — 48px 미달 확인. 다른 버튼은 모두 `min-h-[48px]` 이상. |
| UI-03 | WCAG AA 접근성 준수 | 색상 대비 계산 완료 (실패 지점 2개 식별). 키보드 탐색: 스텝 전환 시 포커스 이동 없음 (useRef 필요). |
| UI-04 | 디자인 토큰: warm gray #F5F3F0, deep teal #1B6B5A, Pretendard 16px+ | globals.css에 CSS 변수 정의 완료. Pretendard CDN 로드 중. |
| UI-05 | 정보 계층: 랜딩→위저드→결과 (요약→체크리스트→질문→법령) | 현재 구조 확인. 결과 페이지 섹션 순서 IssueChecklist→StatuteSection→PrecedentSection→LawyerQuestions 확인됨. |
| PRIV-03 | "내 데이터 전체 삭제" 버튼 — Firebase 익명 계정 + 관련 데이터 즉시 삭제 | 현재 Firestore 쓰기 없음 (PRIV-02 준수). 삭제 대상: Firebase Auth 계정 + sessionStorage + Zustand store. |
| PRIV-05 | 이혼 사유/DV 여부 입력 전 PIPA 민감정보 별도 동의 게이트 | DivorceReasonStep이 스텝 4 — 이 스텝 진입 전에 동의 모달 필요. 현재 미구현. |
</phase_requirements>

---

## Summary

Phase 2에서 위저드 6단계와 결과 UI가 완성된 상태. Phase 3는 "완성도 레이어"다 — 새 기능보다는 기존 구현의 빈틈을 채우는 작업이 주를 이룬다.

**접근성 감사 결과:** 코드베이스 직접 분석으로 구체적 실패 지점 3개를 확인했다. (1) `DivorceReasonStep` 빠른 선택 버튼 `min-h-[36px]` — UI-02 실패. (2) `text-gray-500` on `#F5F3F0` 배경 — 대비율 4.37:1, WCAG AA 4.5:1 미달. (3) 스텝 전환 시 키보드 포커스가 새 스텝 상단으로 이동하지 않음 — `useRef + useEffect` 추가 필요.

**PRIV-03 (전체 삭제):** 현재 Firestore 쓰기가 없다 (PRIV-02 준수). 삭제 대상은 Firebase 익명 Auth 계정 + sessionStorage + Zustand 인메모리 상태. 서버 Route Handler(`DELETE /api/account`)를 통해 `adminAuth.deleteUser(uid)`로 구현하는 것이 가장 안전하다 — 클라이언트 SDK `deleteUser()`는 오래된 익명 세션에서 `auth/requires-recent-login` 에러가 발생할 수 있다.

**PRIV-05 (PIPA 동의 게이트):** 한국 개인정보보호법 제23조 민감정보 범위에는 "건강" 정보와 "전과 기록"이 포함되며, DV 관련 정보는 이 두 범주에 걸쳐 있다. 이혼 사유 자체는 명시적 열거 항목은 아니지만 요구사항 PRIV-05에서 이미 "별도 동의 필요"로 결정되어 있다. 구현은 스텝 4 진입 전 `shadcn Dialog`(Radix UI 기반, 포커스 트랩 내장)를 사용한 동의 모달로 한다.

**Primary recommendation:** UI-02(터치 타겟), UI-03(대비·포커스), PRIV-03(삭제 버튼), PRIV-05(동의 게이트) 순서로 구현. shadcn 설치 없이도 Radix Dialog를 직접 사용하거나 네이티브 `<dialog>`로 구현 가능하지만, 이미 shadcn을 사용하도록 스택에 명시되어 있으므로 shadcn CLI로 Dialog 컴포넌트를 추가한다.

---

## Standard Stack

### Core (이미 설치됨)

| Library | Version | Purpose | 근거 |
|---------|---------|---------|------|
| Tailwind CSS | ^4.2.2 | 반응형 유틸리티 | 설치 확인 [VERIFIED: package.json] |
| React | ^19.2.5 | `useRef` + `useEffect` 포커스 관리 | 설치 확인 [VERIFIED: package.json] |
| firebase | ^12.12.0 | Client Auth deleteUser | 설치 확인 [VERIFIED: package.json] |
| firebase-admin | ^13.8.0 | Server-side adminAuth.deleteUser | 설치 확인 [VERIFIED: package.json] |
| zustand | ^5.0.12 | Wizard store reset() | 설치 확인 [VERIFIED: package.json] |

### 추가 설치 필요

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| shadcn/ui Dialog | CLI | PIPA 동의 모달 | Radix Dialog 기반 — 포커스 트랩, Escape, ARIA 자동 처리 [CITED: ui.shadcn.com/docs/components/dialog] |

```bash
# shadcn Dialog 추가 (npx shadcn@latest add dialog)
npx shadcn@latest add dialog
```

### 대안 고려

| 표준 | 대안 | 트레이드오프 |
|------|------|------------|
| shadcn Dialog | 네이티브 `<dialog>` | 네이티브 dialog는 브라우저 지원 충분하나, 포커스 트랩 폴리필 직접 구현 필요. shadcn이 간단하고 프로젝트 스택과 일치. |
| 서버 Route Handler 삭제 | 클라이언트 deleteUser() | 클라이언트 삭제는 `requires-recent-login` 에러 위험 있음. 서버 방식이 더 신뢰성 높음. |

---

## Architecture Patterns

### 현재 코드베이스 구조 (확인됨)

```
src/
├── app/
│   ├── layout.tsx              # HTML root, Pretendard CDN
│   └── [locale]/
│       ├── layout.tsx          # AuthProvider + Safety UI 래퍼
│       ├── page.tsx            # 랜딩
│       └── wizard/page.tsx     # 위저드 + 결과 통합 페이지
├── components/
│   ├── AuthProvider.tsx        # Firebase 익명 인증
│   ├── DisclaimerBanner.tsx    # 면책 고지 (role="alert")
│   ├── QuickExitButton.tsx     # 긴급 탈출 (fixed 우상단)
│   ├── wizard/                 # WizardContainer + 5개 스텝
│   └── results/                # ResultsContainer + 4개 섹션
├── lib/
│   └── firebaseAdmin.ts        # Proxy 패턴, adminAuth 사용 가능
└── stores/
    └── wizardStore.ts          # reset() 메서드 존재
```

### Pattern 1: 스텝 전환 시 포커스 이동

**What:** 위저드 스텝이 바뀔 때 새 스텝의 헤딩(`h2`)으로 키보드 포커스를 이동
**When to use:** `setStep()` 호출 후 컴포넌트 재렌더 시
**Example:**
```tsx
// WizardContainer.tsx에 추가
const stepHeadingRef = useRef<HTMLHeadingElement>(null);

useEffect(() => {
  // 스텝 변경 시 헤딩으로 포커스 이동 — 키보드/스크린리더 사용자를 위함
  stepHeadingRef.current?.focus();
}, [currentStep]);

// 각 스텝의 h2에 ref 전달 + tabIndex={-1} (포커스 받을 수 있도록)
// <h2 ref={stepHeadingRef} tabIndex={-1}>결혼 기간</h2>
```
[ASSUMED] — React 공식 접근성 문서와 일치하는 표준 패턴이나, 현재 코드베이스에서 직접 테스트 미완료.

### Pattern 2: PIPA 동의 게이트 (스텝 4 진입 전)

**What:** 스텝 3(재산) → 스텝 4(이혼 사유) 전환 시 shadcn Dialog로 PIPA 동의 요청
**When to use:** `handleNext`가 스텝 3 완료를 처리할 때
**Example:**
```tsx
// WizardContainer.tsx 수정 패턴
const [showPipaConsent, setShowPipaConsent] = useState(false);
const [pipaConsented, setPipaConsented] = useState(false);

const handleNext = () => {
  // 스텝 3→4 전환 시 PIPA 동의 체크
  if (currentStep === 3 && !pipaConsented) {
    setShowPipaConsent(true); // 다이얼로그 열기
    return; // 스텝 전환 보류
  }
  // ... 나머지 로직
};

const handlePipaConsent = () => {
  setPipaConsented(true);
  setShowPipaConsent(false);
  setStep(4); // 동의 후 스텝 진행
};
```
[VERIFIED: codebase] — WizardContainer의 `handleNext` 흐름 직접 확인.

### Pattern 3: 계정 삭제 Route Handler

**What:** `DELETE /api/account` — adminAuth.deleteUser(uid)로 서버에서 삭제
**Why server-side:** 클라이언트 SDK `deleteUser()`는 오래된 익명 세션에서 `auth/requires-recent-login` 에러 발생 가능. Admin SDK는 이 제한이 없음.

```tsx
// src/app/api/account/route.ts
export const runtime = 'nodejs'; // firebase-admin 필요
export async function DELETE(req: Request) {
  const authHeader = req.headers.get('Authorization');
  // ... 토큰 검증
  const { uid } = await adminAuth.verifyIdToken(token);
  await adminAuth.deleteUser(uid);
  return new Response(null, { status: 204 });
}

// 클라이언트: DeleteDataButton.tsx
const handleDelete = async () => {
  const token = await auth.currentUser?.getIdToken();
  await fetch('/api/account', { 
    method: 'DELETE', 
    headers: { Authorization: `Bearer ${token}` }
  });
  sessionStorage.clear();
  useWizardStore.getState().reset();
  // 홈으로 이동 또는 "삭제 완료" 표시
};
```
[VERIFIED: codebase] — firebaseAdmin.ts의 adminAuth Proxy 패턴 및 analyze route.ts의 토큰 검증 패턴 확인.

### Anti-Patterns

- **`document.getElementById().focus()` 직접 사용:** React에서는 항상 `useRef`로 DOM 접근
- **PIPA 동의를 sessionStorage에 저장:** 세션마다 새로 동의해야 함 (민감정보이므로)
- **클라이언트 SDK `deleteUser()` 단독 사용:** 오래된 익명 세션에서 에러 위험

---

## Don't Hand-Roll

| 문제 | 직접 만들지 말 것 | 사용할 것 | 이유 |
|------|-----------------|-----------|------|
| 모달 포커스 트랩 | 직접 Tab 키 핸들러 구현 | shadcn Dialog (Radix UI) | Radix가 포커스 트랩, Escape, ARIA 자동 처리. 직접 구현 시 엣지케이스 다수 |
| 색상 대비 계산 | 런타임 계산 | 빌드 타임에 수정 (Tailwind 클래스) | 대비는 코드 리뷰 시점에 고정값. 런타임 체크 불필요 |
| 터치 타겟 패딩 계산 | JS로 동적 패딩 | Tailwind `min-h-[48px]` 클래스 | CSS만으로 충분 |

---

## 실제 결함 목록 (코드베이스 직접 검증)

### 결함 1: 터치 타겟 미달 — DivorceReasonStep 빠른 선택 버튼 [VERIFIED: codebase]

**파일:** `src/components/wizard/DivorceReasonStep.tsx` line 57
**현재:** `min-h-[36px]`
**요구:** `min-h-[48px]` (UI-02)
**수정:** `px-3 py-2`를 `px-3 py-3 min-h-[48px]`로 변경

### 결함 2: 색상 대비 실패 — gray-500 on warm-gray [VERIFIED: codebase]

**계산:** gray-500 (#6B7280) on warm-gray (#F5F3F0) = **4.37:1** (FAIL — 4.5:1 필요)
**영향 파일:**
- `src/app/[locale]/page.tsx` line 23: `text-xs text-gray-500` (랜딩 면책 문구)
- `src/components/PrivacyNotice.tsx` line 2: `text-xs text-gray-500` (locale layout 하단)

**수정:** `text-gray-500` → `text-gray-600` (6.82:1 on warm-gray → PASS)

**안전한 조합:**
| 색상 | 배경 | 대비율 | 판정 |
|------|------|--------|------|
| gray-900 on white | white | 17.74:1 | PASS |
| gray-900 on warm-gray | #F5F3F0 | 16.02:1 | PASS |
| gray-700 on warm-gray | #F5F3F0 | 9.31:1 | PASS |
| **gray-600 on warm-gray** | #F5F3F0 | **6.82:1** | **PASS** |
| gray-500 on warm-gray | #F5F3F0 | 4.37:1 | **FAIL** |
| #1B6B5A on white | white | 6.37:1 | PASS |
| #1B6B5A on warm-gray | #F5F3F0 | 5.75:1 | PASS |
| amber-900 on amber-50 | DisclaimerBanner | 6.37:1 | PASS |
| red-600 on white | ResultsContainer | 4.83:1 | PASS |

### 결함 3: 키보드 포커스 관리 없음 [VERIFIED: codebase]

**파일:** `src/components/wizard/WizardContainer.tsx`
**문제:** `setStep()` 호출 후 포커스가 DOM 어딘에도 명시적으로 이동하지 않음
**영향:** 키보드/스크린리더 사용자가 스텝 전환 후 어디에 있는지 파악 불가
**수정:** `useRef + useEffect`로 스텝 헤딩에 포커스 이동 (Pattern 1 참조)

### 결함 4: 라벨 미연결 — ChildrenStep [VERIFIED: codebase]

**파일:** `src/components/wizard/ChildrenStep.tsx` line 70
**문제:** `<label>`이 있으나 `htmlFor` 속성 없음. textarea에 `id` 없음.
**수정:** label에 `htmlFor="childrenInfo"`, textarea에 `id="childrenInfo"` 추가

### 결함 5: 빠른 선택 버튼 키보드 접근성 [VERIFIED: codebase]

**파일:** `src/components/wizard/DivorceReasonStep.tsx` lines 52-58
**문제:** 빠른 선택 버튼이 `type="button"`이므로 Tab으로 도달 가능. 하지만 스크린리더가 "성격 차이 button"만 읽음 — 문맥 불명확.
**수정:** `aria-label="이혼 사유 추가: 성격 차이"` 형식으로 aria-label 추가

---

## PRIV-03: 계정 삭제 상세 분석

### 현재 저장된 데이터 현황 [VERIFIED: codebase]

| 저장소 | 데이터 | 삭제 방법 |
|--------|--------|----------|
| Firebase Auth | 익명 계정 (uid) | `adminAuth.deleteUser(uid)` (서버 Route Handler) |
| sessionStorage | `incognito_guidance_seen: 'true'` | `sessionStorage.clear()` |
| Zustand store | 위저드 입력 상태 (메모리) | `useWizardStore.getState().reset()` |
| Firestore | **없음** — PRIV-02 준수로 서버 저장 안 함 | N/A |

**중요:** Phase 3 시점에서 Firestore에 사용자 데이터가 없으므로 삭제 작업이 단순하다. Phase 4 (Persistence)에서 Firestore 저장이 추가되면 그때 삭제 로직 확장 필요.

### 구현 위치

`PrivacyNotice.tsx`를 확장하거나 새 `DeleteDataButton.tsx` 컴포넌트로 분리.
locale layout 하단 (`PrivacyNotice` 위치)에 배치.

---

## PRIV-05: PIPA 제23조 민감정보 동의 게이트

### 법적 근거 [CITED: DLA Piper Data Protection Laws of the World - Korea]

PIPA 제23조 민감정보 범위:
1. 사상·신념
2. 노동조합·정당 가입/탈퇴
3. 정치적 견해
4. **건강·성생활** ← DV 피해로 인한 신체/정신적 피해 포함
5. 유전자검사 정보
6. **전과 기록** ← 가정폭력 형사처벌 이력 포함
7. 생체인식 정보

이혼 사유가 제23조 명시적 열거 항목은 아니나:
- 이혼 사유에 DV가 포함될 경우 건강/전과 카테고리 해당
- PRIV-05에서 이미 "별도 동의 필요"로 결정됨 — 이를 구현하면 됨

**동의 시점:** 스텝 3(재산) → 스텝 4(이혼 사유/DV) 전환 시
**동의 범위:** 이혼 사유 및 가정폭력 여부 정보 처리에 대한 별도 동의

### 동의 문구 (예시)

```
[민감정보 처리 동의]

이후 입력하시는 '이혼 사유' 및 '가정폭력 여부' 정보는 
개인정보보호법 제23조의 민감정보에 해당할 수 있습니다.

이 정보는 법률 정보 검색 및 분석에만 사용되며,
서버에 저장되지 않고 브라우저 세션 종료 시 삭제됩니다.

AI 모델 학습에 사용되지 않습니다.
```

**구현 방식:**
- shadcn `Dialog` (AlertDialog 아님 — 취소 가능해야 함)
- 취소 시: 스텝 4로 진행 안 함 (위저드 3단계에서 대기)
- 동의 시: `pipaConsented` 상태 true, 스텝 4로 진행
- `pipaConsented` 상태는 Zustand store에 저장 (세션 내 유효)

---

## Common Pitfalls

### Pitfall 1: shadcn CLI가 globals.css를 덮어씀
**What goes wrong:** `npx shadcn@latest init`을 실행하면 기존 `globals.css`를 덮어씀
**Why it happens:** shadcn init은 프로젝트 초기화를 가정
**How to avoid:** `npx shadcn@latest add dialog`만 실행 (init 없이). Dialog 컴포넌트만 추가됨.
**Warning signs:** globals.css의 `@theme` 블록이 사라지면 디자인 토큰 모두 손실

### Pitfall 2: deleteUser() auth/requires-recent-login
**What goes wrong:** 오래된 익명 세션에서 클라이언트 `deleteUser()` 호출 시 에러
**Why it happens:** Firebase는 일부 민감 작업에 최근 인증(5분 이내) 요구
**How to avoid:** 서버 Route Handler에서 `adminAuth.deleteUser(uid)` 사용
**Warning signs:** 에러 코드 `auth/requires-recent-login`

### Pitfall 3: PIPA 동의 상태를 sessionStorage에 저장하면 세션 간 유효
**What goes wrong:** 탭을 닫지 않고 위저드를 재시작할 때 동의 다이얼로그가 뜨지 않음
**Why it happens:** 민감정보 동의는 매 데이터 처리 세션마다 받아야 함
**How to avoid:** `pipaConsented` 상태를 Zustand store에 저장 (페이지 새로고침 시 리셋됨)
**Warning signs:** `reset()`이 호출되어도 동의 상태가 남아있으면 버그

### Pitfall 4: 스텝 헤딩 tabIndex="-1" 누락
**What goes wrong:** `ref.current.focus()`가 동작하지 않음 (에러 없이 무시됨)
**Why it happens:** `div`, `h2` 등 비인터랙티브 요소는 기본적으로 포커스 불가
**How to avoid:** `tabIndex={-1}` 추가. `-1`은 프로그래밍 포커스는 허용하되 Tab 탐색에는 포함 안 됨
**Warning signs:** `focus()` 호출 후 포커스가 이동하지 않음

### Pitfall 5: 대비 실패를 "큰 텍스트" 예외로 처리하려는 시도
**What goes wrong:** text-xs (12px)에 WCAG 대비 예외 적용
**Why it happens:** WCAG AA 대형 텍스트(18pt/24px 또는 14pt bold/19px) 기준 오해
**How to avoid:** text-xs = 12px = 일반 텍스트 → 4.5:1 필요. text-xl(20px) 이상만 대형 텍스트.

---

## Code Examples

### focus 이동 패턴 (스텝 전환)

```tsx
// WizardContainer.tsx — useRef + useEffect 추가
import { useRef, useEffect } from 'react';

const stepHeadingRef = useRef<HTMLHeadingElement>(null);

useEffect(() => {
  if (currentStep > 0) {
    stepHeadingRef.current?.focus();
  }
}, [currentStep]);

// 각 스텝에 ref 전달 (WizardContainer → 각 스텝 컴포넌트)
// 또는 WizardContainer 내부 컨테이너 div에 ref 사용
```

### shadcn Dialog PIPA 동의 게이트

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

<Dialog open={showPipaConsent} onOpenChange={setShowPipaConsent}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>민감정보 처리 동의</DialogTitle>
      <DialogDescription>
        이혼 사유 및 가정폭력 여부는 개인정보보호법 제23조의
        민감정보에 해당할 수 있습니다.
      </DialogDescription>
    </DialogHeader>
    <p className="text-sm text-gray-700">
      이 정보는 법률 정보 검색에만 사용되며 서버에 저장되지 않습니다.
    </p>
    <DialogFooter>
      <button onClick={() => setShowPipaConsent(false)} className="...">
        취소
      </button>
      <button onClick={handlePipaConsent} className="...">
        동의하고 계속하기
      </button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 계정 삭제 Route Handler

```tsx
// src/app/api/account/route.ts
import { adminAuth } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function DELETE(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '인증 필요' }), { status: 401 });
  }
  try {
    const { uid } = await adminAuth.verifyIdToken(authHeader.slice(7));
    await adminAuth.deleteUser(uid);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(JSON.stringify({ error: '삭제 실패' }), { status: 500 });
  }
}
```

### ChildrenStep 라벨 수정

```tsx
// 현재 (잘못됨)
<label className="block text-sm text-gray-600 mb-2">
  자녀 나이와 현재 양육 상황을 알려주세요
</label>
<textarea {...register('childrenInfo')} />

// 수정 후
<label htmlFor="childrenInfo" className="block text-sm text-gray-600 mb-2">
  자녀 나이와 현재 양육 상황을 알려주세요
</label>
<textarea id="childrenInfo" {...register('childrenInfo')} />
```

---

## State of the Art

| 구버전 접근 | 현재 접근 | 의미 |
|------------|----------|------|
| 포커스 관리: `document.getElementById` | React `useRef + useEffect` | React 권장 패턴 |
| 모달: 직접 div + CSS | Radix UI / shadcn Dialog | 포커스 트랩, ARIA 자동 처리 |
| WCAG 버전: 2.0 | WCAG 2.1 AA (현재 기준) | WCAG 3.0은 아직 초안 |
| Firebase 계정 삭제: 클라이언트만 | 서버 Route Handler 권장 | 익명 세션 에러 방지 |

---

## Environment Availability

Phase 3는 외부 의존성이 없는 코드/UI 작업이므로 환경 가용성 감사를 생략한다.

단, shadcn CLI 실행 환경 확인:
```bash
npx shadcn@latest add dialog  # node_modules에서 직접 실행 가능
```
[VERIFIED: codebase] — Node.js 22.22.0, npm 사용 가능 환경 확인됨.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.ts` (루트) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --reporter=verbose` |
| Current state | 114 tests, 22 test files — ALL PASS [VERIFIED: npm run test] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-02 | DivorceReasonStep 빠른 선택 버튼 min-h-[48px] | unit | `npx vitest run src/components/wizard/__tests__/DivorceReasonStep.test.tsx` | ✅ (파일 있음, 테스트 보강 필요) |
| UI-03 | PIPA 동의 없이 스텝 4 진입 불가 | unit | `npx vitest run src/components/wizard/__tests__/WizardContainer.test.tsx` | ✅ (보강 필요) |
| PRIV-03 | DELETE /api/account 엔드포인트 | unit | `npx vitest run src/app/api/account/__tests__/route.test.ts` | ❌ Wave 0 |
| PRIV-05 | PIPA 동의 체크박스 미체크 시 스텝 4 진입 안 됨 | unit | `npx vitest run src/components/wizard/__tests__/WizardContainer.test.tsx` | ✅ (보강 필요) |
| UI-03 (키보드) | 스텝 전환 시 포커스 이동 | unit | `npx vitest run src/components/wizard/__tests__/WizardContainer.test.tsx` | ✅ (보강 필요) |

### Sampling Rate

- **태스크 커밋 시:** `npx vitest run`
- **웨이브 머지 시:** `npx vitest run --reporter=verbose`
- **Phase 게이트:** 전체 suite green (114+ tests) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/app/api/account/__tests__/route.test.ts` — PRIV-03 커버
- [ ] `src/components/DeleteDataButton/__tests__/DeleteDataButton.test.tsx` — PRIV-03 UI 커버

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (계정 삭제 인증) | Firebase JWT 토큰 검증 (기존 패턴 재사용) |
| V3 Session Management | yes (sessionStorage.clear) | 삭제 후 sessionStorage.clear() |
| V4 Access Control | yes | DELETE /api/account — 본인 uid만 삭제 가능 (verifyIdToken 검증) |
| V5 Input Validation | no | Phase 3는 입력 추가 없음 |
| V6 Cryptography | no | Firebase 처리 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 타인 계정 삭제 요청 | Tampering | `adminAuth.verifyIdToken(token)`으로 uid 추출 → 해당 uid만 삭제 |
| 동의 bypass (URL 직접 접근) | Tampering | PIPA 동의 상태를 Zustand store에 저장, reset() 시 초기화 |
| 삭제 후 토큰 재사용 | Elevation | 계정 삭제 후 클라이언트 세션도 무효화 (signOut 호출) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useRef + useEffect` 포커스 이동이 스텝 헤딩에 정상 작동 | Architecture Patterns | tabIndex=-1 누락 시 포커스 이동 무시 — 테스트로 검증 필요 |
| A2 | PIPA 동의 시점: 스텝 3→4 전환 시 | PRIV-05 | 법률 자문 없이 결정. 리스크: 동의가 너무 늦거나 너무 이름. 안전측 선택이므로 수용 가능 |
| A3 | Phase 3 시점에 Firestore 사용자 데이터 없음 | PRIV-03 | Phase 1/2 코드 검증으로 확인. 분석 Route Handler가 Firestore write 없음을 확인 |

**테이블 외 HIGH confidence 사항:**
- DivorceReasonStep min-h-[36px] 실패: 직접 코드 검증
- gray-500 on warm-gray 대비 4.37:1 실패: Python 계산 검증
- 현재 Firestore 쓰기 없음: analyze route.ts 전체 읽기 검증

---

## Open Questions

1. **shadcn Dialog 스타일 충돌 여부**
   - What we know: shadcn UI는 TW4 + React 19 지원 확인됨 (CLAUDE.md에 명시)
   - What's unclear: `npx shadcn@latest add dialog` 실행 시 globals.css 덮어쓸 가능성
   - Recommendation: `add dialog` 명령만 실행, init 실행 금지. 실행 후 globals.css @theme 블록 유지 확인 필수

2. **PIPA 동의 문구의 법적 충분성**
   - What we know: PIPA 제23조는 별도 명시적 동의 요구
   - What's unclear: 동의 문구의 정확한 법적 요건 (목적, 항목, 보유 기간 명시 여부)
   - Recommendation: 현재 구현에서 (1) 처리 목적, (2) 항목, (3) 보유 기간("세션 종료 시 삭제"), (4) 동의 거부 권리 명시. 서비스 출시 전 법무 검토 필요 [STATE.md 블로커로 기록됨]

3. **안내 없이 위저드 3단계에서 막히는 UX**
   - What we know: PIPA 동의 거부 시 스텝 4 진행 불가
   - What's unclear: 사용자가 왜 진행이 안 되는지 명확히 알 수 있는가
   - Recommendation: 동의 거부 시 "이혼 사유 입력 없이는 분석이 불가능합니다" 안내 문구 표시

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: codebase] — `src/` 디렉토리 전체 코드 직접 읽기 (22개 파일)
- [VERIFIED: package.json] — 설치된 의존성 버전 확인
- [VERIFIED: vitest run] — 114 tests, 22 files PASS
- WCAG 2.1 SC 1.4.3 Contrast Minimum — 4.5:1 normal / 3:1 large [W3C 공식]

### Secondary (MEDIUM confidence)

- [DLA Piper - South Korea Data Protection] — PIPA Article 23 민감정보 범주 확인
- [Firebase Docs - Manage Users] — `deleteUser()` re-auth 요구 사항
- [shadcn/ui Dialog docs] — Radix 기반 포커스 트랩 지원

### Tertiary (LOW confidence / ASSUMED)

- shadcn `add dialog` 명령이 globals.css를 덮어쓰지 않는다 — 실행 전 확인 필요

---

## Metadata

**Confidence breakdown:**
- 실제 결함 목록: HIGH — 코드베이스 직접 검증
- 대비율 계산: HIGH — Python luminance 공식
- PIPA 법적 범주: MEDIUM — 영문 법제 데이터베이스 기반, 한국어 원문 미확인
- shadcn 통합: MEDIUM — 공식 문서 확인, 실제 실행 미검증

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (30일 — 스택이 안정적)
