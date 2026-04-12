# Phase 2: Wizard UI + Analysis Pipeline - Research

**Researched:** 2026-04-12
**Domain:** Multi-step Wizard UI (react-hook-form + Zustand) + Claude 스트리밍 결과 표시 + DV 감지 분기 + 법제처 출처 라벨링
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INTAKE-01 | 결혼 기간·자녀·재산·이혼 사유를 단계별 일상어 질문으로 입력 | 4-step wizard 구조, UserSituation 타입 매핑, react-hook-form multi-step 패턴 |
| INTAKE-02 | 위저드가 일상 언어(비법률 용어) + 1질문/1화면 구조 | 각 스텝 질문 문구 설계, single-field-per-step RHF 패턴 |
| INTAKE-03 | 이전 단계로 돌아가도 입력값 유지 | Zustand `useWizardStore` persist-in-memory 전략, RHF keepValues |
| INTAKE-04 | 위저드 시작 전 공감 인트로(도구 설명 + 면책) 화면 | Step 0: IntroStep 컴포넌트, 기존 DisclaimerBanner와 연계 |
| ANALYSIS-01 | 법제처 API로 관련 법령 검색 (상황 기반) | Phase 1 `searchStatutes` 이미 구현됨. Phase 2에서 UI 연결만 |
| ANALYSIS-02 | 법제처 API로 관련 판례 검색 (상황 기반) | Phase 1 `searchPrecedents` 이미 구현됨. Phase 2에서 UI 연결만 |
| ANALYSIS-03 | Claude가 쟁점 체크리스트 생성 (법제처 API 결과 기반, 법적 결론 없음) | Phase 1 `claudeClient` + `complianceFilter` 이미 구현됨 |
| ANALYSIS-04 | Claude가 "변호사에게 물어볼 질문" 목록 생성 | buildUserPrompt 수정으로 구조화된 섹션 추가 |
| ANALYSIS-05 | 분석 결과 순차적 스트리밍 (완료 전 표시) | Phase 1 `/api/analyze` ReadableStream 이미 구현됨. 클라이언트 fetch+stream 파싱 |
| ANALYSIS-06 | Claude = 언어 변환 레이어만, 법령/판례 원문은 100% 법제처 API | 기존 SYSTEM_PROMPT 준수, buildUserPrompt에서 API 데이터만 인용하도록 제한 |
| LEGAL-01 | 관련 법령 조문 + 출처(조문번호 + 법령명) 표시 | StatuteCitation 컴포넌트, `법제처 API 검색 결과` 라벨 |
| LEGAL-02 | 관련 판례 요약 + 사건번호 + 날짜 표시 | PrecedentCard 컴포넌트, 판례일련번호 상세 조회 옵션 |
| LEGAL-03 | AI가 원문 옆에 일상어 요약 제공 | Claude 프롬프트 구조에 "쉬운 말로 요약" 섹션 추가 |
| LEGAL-04 | 모든 법률 콘텐츠에 "법제처 API 검색 결과" 출처 라벨 | SourceBadge 컴포넌트, 일관된 라벨링 패턴 |
| SAFE-04 | 가정폭력 입력 감지 시 분석 전 안전 정보 브랜치 표시 | DV 키워드 감지 로직, SafetyBranch 컴포넌트 (1366, 112 연결) |
</phase_requirements>

---

## Summary

Phase 2는 Phase 1이 구축한 백엔드 파이프라인(`/api/analyze`, `koreanLawClient`, `claudeClient`, `complianceFilter`) 위에 프론트엔드 UI 레이어를 추가하는 단계다. 핵심 작업은 세 가지다: (1) 4단계 위저드 UI (`useWizardStore` + `react-hook-form` + Zustand 상태 유지), (2) 스트리밍 결과 표시 페이지 (fetch ReadableStream → 실시간 파싱 → 섹션별 점진 렌더), (3) DV 감지 → 안전 정보 브랜치 선제 표시 (`SAFE-04`).

Phase 1에서 이미 구현된 것들: `UserSituation` 타입 (4개 필드 그대로 사용 가능), 법제처 API 래퍼, Claude 스트리밍 파이프라인, compliance 필터, 공유 레이아웃 컴포넌트. Phase 2는 새로운 인프라를 만드는 것이 아니라 기존 인프라에 사용자 접점을 연결하는 작업이다.

가장 중요한 구현 결정은 스트리밍 파싱 전략이다. `/api/analyze`는 현재 text/plain 청크를 그대로 흘려보낸다. Phase 2에서는 클라이언트가 이 스트림을 `섹션 구분자` 기준으로 파싱해 쟁점 체크리스트 / 법령 / 판례 / 변호사 질문을 별도 UI 블록으로 렌더해야 한다. 이를 위해 Claude 프롬프트의 출력 형식을 파싱 가능한 마크다운 섹션 구조(`## 섹션명`)로 고정하고, 클라이언트에서 섹션 헤더 기준으로 split한다.

**Primary recommendation:** Zustand 위저드 스토어 → 4단계 위저드 컴포넌트 → DV 감지 분기 → 스트리밍 결과 페이지 순서로 개발. 백엔드 변경은 Claude 프롬프트 출력 형식 구조화가 유일하다.

---

## Phase 1에서 이미 구현된 것 (재구현 금지)

Phase 2 개발 시 아래 항목은 이미 존재함. 새로 만들지 말 것.

| 파일 | 제공하는 것 | Phase 2 사용 방법 |
|------|------------|-----------------|
| `src/types/analysis.ts` | `UserSituation`, `AnalysisResult`, `AnalysisStreamChunk` | 그대로 사용. 위저드 스텝 데이터가 이 타입으로 수렴 |
| `src/types/law.ts` | `Statute`, `Precedent`, `StatuteArticle` | 결과 표시 컴포넌트에서 import |
| `src/lib/koreanLawClient.ts` | `searchStatutes`, `searchPrecedents`, `getStatuteDetail` | API route에서 이미 호출됨. 직접 호출 불필요 |
| `src/lib/claudeClient.ts` | `claudeClient.stream()`, `SYSTEM_PROMPT` | buildUserPrompt 수정 후 그대로 사용 |
| `src/lib/complianceFilter.ts` | `createStreamFilter`, `FORBIDDEN_PATTERNS` | 기존 필터 그대로 사용. 패턴 추가만 검토 |
| `src/lib/pipelineOrchestrator.ts` | `orchestrateAnalysis`, `buildUserPrompt` | `buildUserPrompt`에 구조화 형식 추가. `orchestrateAnalysis`는 변경 없이 사용 |
| `src/app/api/analyze/route.ts` | `POST /api/analyze` 스트리밍 엔드포인트 | 위저드에서 fetch POST로 호출. auth token 첨부 필요 |
| `src/components/AuthProvider.tsx` | `useAuth()` 훅 (user, loading) | 위저드에서 auth token 취득에 사용 |
| `src/components/DisclaimerBanner.tsx` | 면책 고지 배너 (layout에 이미 포함) | 추가 구현 불필요 |
| `src/components/QuickExitButton.tsx` | 탈출 버튼 (layout에 이미 포함) | 추가 구현 불필요 |
| `src/components/EmergencyContacts.tsx` | 1366/112 연락처 (layout에 이미 포함) | 추가 구현 불필요 |
| `src/app/[locale]/layout.tsx` | QuickExit + Disclaimer + EmergencyContacts 통합 레이아웃 | 위저드/결과 페이지 자동 적용됨 |

---

## Standard Stack

### Core (Phase 1에서 이미 설치됨 — 추가 설치 불필요)

| Library | Version | Purpose | 확인 |
|---------|---------|---------|------|
| Next.js | ^15.5.15 | App Router, Route Handlers | [VERIFIED: package.json] |
| React | ^19.2.5 | UI rendering | [VERIFIED: package.json] |
| TypeScript | ^6.0.2 | strict mode | [VERIFIED: package.json] |
| Tailwind CSS | ^4.2.2 | CSS-first 스타일링 | [VERIFIED: package.json] |
| Zustand | ^5.0.12 | 위저드 상태 (메모리 전용) | [VERIFIED: package.json] |
| next-intl | ^4.9.1 | 한국어 라우팅 | [VERIFIED: package.json] |
| Vitest | ^4.1.4 | 테스트 | [VERIFIED: package.json] |
| @testing-library/react | ^16.3.2 | 컴포넌트 테스트 | [VERIFIED: package.json] |

### Phase 2에서 추가 설치 필요

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| react-hook-form | ^7.x | 위저드 멀티스텝 폼 상태 | INTAKE-01~03. Uncontrolled inputs로 불필요한 re-render 방지. Zustand와 상호보완 (RHF=개별 스텝 유효성, Zustand=전체 위저드 데이터 집계). [ASSUMED — package.json에 없으나 CLAUDE.md 권장 스택] |
| @hookform/resolvers | ^3.x | Zod 스키마와 RHF 연결 | react-hook-form의 Zod 통합 필수. Zod 3 전용. [ASSUMED] |

**설치 명령:**
```bash
npm install react-hook-form @hookform/resolvers
```

> **참고:** Zod는 `^4.3.6`이 이미 설치되어 있으나, `@hookform/resolvers`는 Zod 3 타겟. Zod 4의 기본 export는 v3 API 호환(`import { z } from 'zod'` 그대로 동작)이므로 호환성 문제 없음. [VERIFIED: package.json - zod ^4.3.6 설치됨]

---

## Architecture Patterns

### 권장 파일 구조 (Phase 2 신규 생성 파일)

```
src/
├── app/[locale]/
│   ├── wizard/
│   │   └── page.tsx          # 위저드 라우트 (4단계 컨테이너)
│   └── results/
│       └── page.tsx          # 스트리밍 결과 라우트
├── components/
│   ├── wizard/
│   │   ├── WizardContainer.tsx    # 스텝 네비게이션 + 진행 표시
│   │   ├── IntroStep.tsx          # Step 0: 공감 인트로 + 면책 (INTAKE-04)
│   │   ├── MarriageDurationStep.tsx  # Step 1: 결혼 기간 (INTAKE-01)
│   │   ├── ChildrenStep.tsx       # Step 2: 자녀 (INTAKE-01)
│   │   ├── AssetStep.tsx          # Step 3: 재산 개요 (INTAKE-01)
│   │   ├── DivorceReasonStep.tsx  # Step 4: 이혼 사유 (INTAKE-01, DV 감지)
│   │   └── SafetyBranch.tsx       # DV 감지 시 표시 (SAFE-04)
│   └── results/
│       ├── ResultsContainer.tsx   # 스트리밍 오케스트레이터
│       ├── IssueChecklist.tsx     # 쟁점 체크리스트 섹션
│       ├── StatuteSection.tsx     # 법령 섹션 (LEGAL-01, LEGAL-04)
│       ├── PrecedentSection.tsx   # 판례 섹션 (LEGAL-02, LEGAL-04)
│       ├── LawyerQuestions.tsx    # 변호사 질문 섹션 (ANALYSIS-04)
│       └── SourceBadge.tsx        # "법제처 API 검색 결과" 라벨 (LEGAL-04)
├── stores/
│   └── wizardStore.ts             # Zustand 위저드 상태 (INTAKE-03)
└── lib/
    └── dvDetector.ts              # DV 키워드 감지 (SAFE-04)
```

### Pattern 1: Zustand 위저드 스토어 (메모리 전용)

**What:** 위저드 전체 데이터를 Zustand에 누적. 각 스텝 제출 시 업데이트.
**When to use:** 이전 스텝으로 돌아가도 데이터 유지 (INTAKE-03). localStorage 미사용 (DV 피해자 보안, PRIV-02).

```typescript
// Source: 형제 프로젝트 패턴 (mbti-ai-live-chat callStore.ts) + CLAUDE.md 가이드라인
import { create } from 'zustand';
import type { UserSituation } from '@/types/analysis';

interface WizardState {
  currentStep: number;           // 0=Intro, 1=Marriage, 2=Children, 3=Asset, 4=DivorceReason
  situation: Partial<UserSituation>;
  isDvDetected: boolean;
  setStep: (step: number) => void;
  updateSituation: (partial: Partial<UserSituation>) => void;
  setDvDetected: (detected: boolean) => void;
  reset: () => void;
}

export const useWizardStore = create<WizardState>()((set) => ({
  currentStep: 0,
  situation: {},
  isDvDetected: false,
  setStep: (step) => set({ currentStep: step }),
  updateSituation: (partial) =>
    set((state) => ({ situation: { ...state.situation, ...partial } })),
  setDvDetected: (detected) => set({ isDvDetected: detected }),
  reset: () => set({ currentStep: 0, situation: {}, isDvDetected: false }),
}));
```

> **중요:** Zustand v5는 curried `create<T>()((set, get) => {...})` 형식 필수. [VERIFIED: CLAUDE.md + sibling project pattern]

### Pattern 2: react-hook-form 단일 스텝 패턴

**What:** 각 스텝에서 RHF를 독립적으로 사용. 스텝 이동 시 Zustand에 값 저장.
**When to use:** 개별 스텝의 실시간 유효성 검사 + Zustand에서 전체 누적.

```typescript
// Source: react-hook-form 공식 패턴 [ASSUMED — 공식 docs 기반 훈련 지식]
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  marriageDuration: z.string().min(1, '결혼 기간을 입력해주세요'),
});

function MarriageDurationStep({ onNext }: { onNext: () => void }) {
  const { situation, updateSituation } = useWizardStore();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { marriageDuration: situation.marriageDuration ?? '' },
  });

  const onSubmit = (data: { marriageDuration: string }) => {
    updateSituation({ marriageDuration: data.marriageDuration });
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <label>결혼하신 지 얼마나 되셨나요?</label>
      <input {...register('marriageDuration')} />
      {errors.marriageDuration && <p>{errors.marriageDuration.message}</p>}
      <button type="submit">다음</button>
    </form>
  );
}
```

### Pattern 3: DV 감지 분기 (SAFE-04)

**What:** DivorceReasonStep 입력값에서 DV 키워드 실시간 감지 → SafetyBranch 선제 표시.
**When to use:** 입력 중 또는 스텝 제출 직전 감지. 분석 시작 전 반드시 처리.

```typescript
// Source: pipelineOrchestrator.ts buildSearchKeywords에서 기존 DV 감지 패턴 참고 [VERIFIED: 기존 코드]
export const DV_PATTERNS = [
  /폭력|폭행|학대|때리|맞/,
  /협박|위협|무서|두렵/,
  /성폭력|성추행|성희롱/,
  /가정폭력/,
] as const;

export function detectDv(text: string): boolean {
  return DV_PATTERNS.some((pattern) => pattern.test(text));
}
```

`detectDv` 결과가 true이면:
1. Zustand `isDvDetected: true` 설정
2. DivorceReasonStep 제출 시 분석 페이지 대신 SafetyBranch 표시
3. SafetyBranch에서 "이해했습니다. 계속 진행할게요" CTA → 분석 계속

### Pattern 4: 클라이언트 스트리밍 fetch + 섹션 파싱

**What:** `/api/analyze` ReadableStream을 클라이언트에서 청크별로 읽어 섹션 헤더(`## 섹션명`) 기준으로 파싱.
**When to use:** ANALYSIS-05 순차 스트리밍 표시.

```typescript
// Source: MDN ReadableStream + @anthropic-ai/sdk 스트리밍 패턴 [ASSUMED — MDN 기반]
async function fetchAnalysis(situation: UserSituation, idToken: string) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(situation),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // 섹션 파싱은 별도 유틸리티로 처리
    onChunk(buffer);
  }
}
```

**섹션 파싱 전략:** Claude 응답에 `## 쟁점 체크리스트`, `## 관련 법령`, `## 관련 판례`, `## 변호사에게 물어볼 질문` 섹션 헤더를 강제. 클라이언트에서 `##` 기준으로 파싱.

### Pattern 5: buildUserPrompt 구조화 출력 형식

**What:** Phase 1의 `buildUserPrompt`를 수정해 Claude가 파싱 가능한 구조화된 마크다운을 출력하도록 강제.
**구체적 변경:** 기존 자유 형식 요청 → 아래 섹션 헤더 강제 지정.

```typescript
// 기존 마지막 부분 (pipelineOrchestrator.ts)을 아래로 교체
parts.push('\n아래 형식으로 정확히 작성해주세요. 섹션 헤더는 변경하지 마세요:');
parts.push('\n## 쟁점 체크리스트');
parts.push('(이혼 시 일반적으로 검토하는 쟁점을 체크리스트 항목으로. 개인화 결론 금지)');
parts.push('\n## 관련 법령');
parts.push('(위 법제처 검색 결과에서만 인용. 법령명과 조문번호 명시)');
parts.push('\n## 관련 판례');
parts.push('(위 법제처 검색 결과에서만 인용. 사건번호와 선고일자 명시)');
parts.push('\n## 변호사에게 물어볼 질문');
parts.push('(사용자 상황에 맞는 구체적인 질문 목록)');
```

### Anti-Patterns to Avoid

- **로컬 스토리지 위저드 상태 저장:** DV 피해자 가해자 접근 위험. 메모리(Zustand)만 사용.
- **단일 긴 폼:** INTAKE-02 위반. 스텝당 하나의 질문만.
- **Client Component에서 직접 법제처 API 호출:** API 키 노출 위험. 반드시 서버 Route Handler(`/api/analyze`)를 통해서만.
- **스트리밍 완료 대기 후 렌더:** ANALYSIS-05 위반. 청크 도착 즉시 렌더.
- **DV 감지 없이 바로 분석 진행:** SAFE-04 위반. `divorceReason` 입력 후 반드시 감지 로직 통과.
- **"법제처 API" 출처 라벨 없이 법령/판례 표시:** LEGAL-04 위반.
- **Zustand v5에서 비-curried `create` 사용:** TypeScript 오류 발생. 반드시 `create<T>()((set) => ...)` 형식.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 폼 유효성 검사 | 커스텀 validate 로직 | react-hook-form + zodResolver | Edge case (특수문자, 빈 문자열, 공백) 처리 미흡 위험 |
| 스텝별 상태 누적 | useState 배열 | Zustand store | 부모→자식 prop drilling 없이 어느 컴포넌트에서도 접근 |
| 입력 sanitize | 직접 regex | Phase 1 `/api/analyze` route의 `sanitizeInput` | 이미 구현됨. 서버 사이드에서 처리 |
| 법령/판례 검색 | 클라이언트 API 호출 | `POST /api/analyze` (서버) | API 키 보안 + Phase 1 rate-limit 가드 활용 |
| ReadableStream 읽기 | 커스텀 WebSocket | `fetch` + `response.body.getReader()` | SSE/WebSocket 불필요. Vercel에서 chunked HTTP가 안정적 |
| 출처 라벨 컴포넌트 | 각 컴포넌트에 인라인 텍스트 | `SourceBadge` 공유 컴포넌트 | 일관성 + LEGAL-04 한 곳에서 관리 |

---

## Common Pitfalls

### Pitfall 1: auth token 없이 /api/analyze 호출
**What goes wrong:** 401 응답. 스트리밍 시작 안 됨.
**Why it happens:** `/api/analyze`는 Firebase anonymous auth 토큰 필수 (Phase 1에서 구현됨).
**How to avoid:** 위저드 제출 전 `useAuth()`에서 `user.getIdToken()`으로 토큰 취득. `loading: true`면 제출 버튼 비활성화.
**Warning signs:** 401 상태 코드, `"인증이 필요합니다"` 에러.

### Pitfall 2: Zustand v5 비-curried create 패턴
**What goes wrong:** TypeScript strict mode에서 `create<T>(...)` 단일 호출 오류.
**Why it happens:** Zustand v5는 curried 형식 `create<T>()((set, get) => ...)` 필수.
**How to avoid:** 반드시 `create<WizardState>()((set) => {...})` 이중 호출 패턴.
**Warning signs:** `create` 타입 오류, `Argument of type ... is not assignable` 에러.

### Pitfall 3: 스트리밍 중 React 상태 과잉 업데이트
**What goes wrong:** 매 청크마다 setState 호출 → 60fps+ 렌더 → 성능 저하.
**Why it happens:** 텍스트 스트림이 수백 개 청크로 나뉨.
**How to avoid:** `requestAnimationFrame` 또는 `useTransition`으로 업데이트 배칭. 또는 100ms debounce.
**Warning signs:** 결과 페이지 렌더 시 CPU 100%, 브라우저 프레임 드롭.

### Pitfall 4: DV 감지 후 사용자 강제 차단
**What goes wrong:** DV 감지 시 분석 자체를 막으면 UX 최악. 피해자가 정보를 얻지 못함.
**Why it happens:** "안전 먼저" 의도의 오구현.
**How to avoid:** DV 감지 시 SafetyBranch를 먼저 표시 + "계속 진행" 옵션 제공. 분석을 막지 않음.
**Warning signs:** "이혼 사유" 입력 후 분석 시작 버튼이 완전히 사라지는 경우.

### Pitfall 5: 섹션 파싱 실패 시 빈 화면
**What goes wrong:** Claude가 `## 섹션명` 형식을 따르지 않으면 파싱 결과가 빈 배열.
**Why it happens:** 프롬프트 지시를 Claude가 무시하는 edge case.
**How to avoid:** 파싱 실패 시 원문 텍스트 그대로 표시하는 fallback. "섹션 파싱 실패" → raw 텍스트 렌더.
**Warning signs:** 결과 페이지가 완전히 비어있으나 스트리밍 완료 신호는 수신됨.

### Pitfall 6: next-intl 없이 페이지 라우트 생성
**What goes wrong:** `/wizard`가 `[locale]` 하위에 없으면 DisclaimerBanner 등 레이아웃 컴포넌트가 적용 안 됨.
**Why it happens:** 기존 레이아웃이 `src/app/[locale]/layout.tsx`에 정의됨.
**How to avoid:** 모든 신규 페이지는 `src/app/[locale]/위저드/page.tsx` 형식으로 생성.
**Warning signs:** QuickExitButton, DisclaimerBanner가 보이지 않는 페이지.

---

## Code Examples

### 위저드 진행 상태 표시 (shadcn/ui Progress 불필요 — 커스텀)

```typescript
// Source: Phase 1 CLAUDE.md "DO NOT use for wizard stepper (build custom)" [VERIFIED: CLAUDE.md]
function WizardProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full bg-[#E8E4E0] rounded-full h-1.5">
      <div
        className="bg-[#1B6B5A] h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${(current / total) * 100}%` }}
      />
    </div>
  );
}
```

### SafetyBranch 컴포넌트 (SAFE-04)

```typescript
// Source: Phase 1 EmergencyContacts.tsx 패턴 기반 [VERIFIED: 기존 코드]
function SafetyBranch({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="p-6 bg-[#FFF3F0] border border-red-200 rounded-xl">
      <h2 className="text-lg font-bold text-red-700 mb-3">
        먼저 안전을 확인해 주세요
      </h2>
      <p className="text-gray-700 mb-4">
        입력하신 내용에 폭력 관련 상황이 포함된 것 같습니다.
        현재 위험한 상황이라면 즉시 연락하세요.
      </p>
      <div className="flex gap-3 mb-4">
        <a href="tel:1366" className="flex-1 text-center py-3 bg-red-600 text-white rounded-lg font-bold min-h-[48px] flex items-center justify-center">
          여성긴급전화 1366
        </a>
        <a href="tel:112" className="flex-1 text-center py-3 bg-red-700 text-white rounded-lg font-bold min-h-[48px] flex items-center justify-center">
          경찰 112
        </a>
      </div>
      <button
        onClick={onContinue}
        className="w-full py-3 text-[#1B6B5A] border border-[#1B6B5A] rounded-lg min-h-[48px]"
      >
        안전한 상황입니다. 법률 정보 계속 보기
      </button>
    </div>
  );
}
```

### 스트리밍 결과 fetch 훅

```typescript
// Source: MDN fetch streaming + Phase 1 route.ts 구조 기반 [ASSUMED — MDN 기반]
function useAnalysisStream(situation: UserSituation | null) {
  const [rawText, setRawText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const { user } = useAuth();

  const startAnalysis = useCallback(async () => {
    if (!situation || !user) return;
    setIsStreaming(true);
    setRawText('');

    const idToken = await user.getIdToken();
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(situation),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      setRawText((prev) => prev + chunk);
    }
    setIsStreaming(false);
  }, [situation, user]);

  return { rawText, isStreaming, startAnalysis };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zod 3 default | Zod 4 default export (v3 호환) | 2025-07 | `import { z } from 'zod'`는 동일. `zod/v4` 서브패스는 새 API |
| Zustand v4 `create<T>(...)` | Zustand v5 curried `create<T>()((set) => ...)` | 2024 | 이중 호출 형식 필수 |
| Tailwind config.js | Tailwind v4 CSS-first (@import) | 2025 | tailwind.config.js 없음 |
| shadcn/ui 별도 TW config | shadcn/ui TW4 통합 | 2025 | CLI가 CSS 변수 자동 주입 |

**Deprecated/outdated:**
- `localStorage` for wizard state: DV 피해자 보안 이유로 이 프로젝트에서 금지
- `runtime = 'edge'` on analyze route: Anthropic SDK Node.js 의존성으로 불가 (Node.js 필수)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | react-hook-form 미설치 (package.json에 없음) — Phase 2에서 신규 추가 필요 | Standard Stack | 이미 설치되어 있으면 버전 충돌 위험 낮음. 설치 전 `npm ls react-hook-form` 확인 |
| A2 | Claude가 `## 섹션명` 형식 지시를 일관되게 따름 | Pattern 5 | 불일치 시 클라이언트 파싱 실패. Fallback 필수 구현 |
| A3 | DV 감지에서 false positive (일반 텍스트 오탐)가 UX에 허용 가능 | Pattern 3 | false positive가 많으면 "안전 분기" 남발로 UX 저하. 패턴 조정 필요 가능성 |
| A4 | 스트리밍 fetch가 모바일 브라우저(iOS Safari)에서 안정적으로 동작 | Pattern 4 | iOS Safari ReadableStream 지원은 2022년부터 안정화. 구버전(< iOS 14.5) 미지원 가능 |

---

## Open Questions

1. **섹션 파싱 vs. JSON 구조화 응답**
   - What we know: 현재 `/api/analyze`는 text/plain 스트림. JSON으로 바꾸면 섹션 파싱이 불필요해짐.
   - What's unclear: JSON 스트리밍(ndjson)으로 변경 시 기존 compliance filter 재설계 필요.
   - Recommendation: 마크다운 섹션 파싱 유지. 변경 최소화 원칙. Phase 2 범위 내에서 `buildUserPrompt` 출력 형식 구조화만으로 충분.

2. **DivorceReasonStep에서 텍스트 입력 vs. 선택지**
   - What we know: INTAKE-02는 "일상 언어" + "1질문/1화면" 요구. 자유 입력이 적합하나, 선택지 제공 시 UX 더 간단.
   - What's unclear: 구체적인 UX 형식 미정.
   - Recommendation: textarea 자유 입력 + 공통 사유 선택 버튼(빠른 선택) 조합. 자유 텍스트가 ANALYSIS-06을 더 잘 지원.

3. **결과 페이지 URL 설계**
   - What we know: Next.js App Router에서 결과를 별도 페이지(`/results`)로 분리할지, 위저드 페이지 내 조건부 렌더로 할지 미결정.
   - Recommendation: `/wizard` 단일 페이지에서 `step: 'results'` 상태로 전환하는 방식. URL 히스토리 push 없음 (개인정보 보호 - 브라우저 히스토리에 "이혼 법률 상담" 흔적 최소화).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev server | ✓ | (확인 불필요 — Phase 1 실행됨) | — |
| npm | react-hook-form 설치 | ✓ | (package.json 존재) | — |
| ANTHROPIC_API_KEY | /api/analyze 스트리밍 | 확인 필요 | — | Phase 1에서 설정되어야 함 |
| KOREAN_LAW_OC_KEY | koreanLawClient | 확인 필요 | — | 없으면 빈 배열 반환 (graceful degradation 이미 구현) |
| Firebase env vars | AuthProvider 익명 인증 | 확인 필요 | — | auth=undefined 시 API 401 |

**Missing dependencies with no fallback:**
- ANTHROPIC_API_KEY 미설정 시 Claude 스트리밍 불가 — Phase 2 테스트 불가

**Missing dependencies with fallback:**
- KOREAN_LAW_OC_KEY 미설정 시 법제처 API 빈 배열 반환 (기존 graceful degradation 동작)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.4 |
| Config file | `vitest.config.ts` (루트) |
| Quick run command | `npm test` |
| Full suite command | `npm test -- --reporter=verbose` |
| Environment | jsdom (컴포넌트), node (lib 유닛) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTAKE-01 | 4단계 위저드 필드 입력 | component | `npm test -- WizardContainer` | ❌ Wave 0 |
| INTAKE-02 | 1질문/1화면 구조 | component | `npm test -- MarriageDurationStep` | ❌ Wave 0 |
| INTAKE-03 | 이전 스텝으로 돌아가도 값 유지 | component | `npm test -- wizardStore` | ❌ Wave 0 |
| INTAKE-04 | IntroStep 면책 문구 표시 | component | `npm test -- IntroStep` | ❌ Wave 0 |
| ANALYSIS-01 | 법제처 API 법령 검색 연동 | integration | `npm test -- pipelineOrchestrator` (기존) | ✅ 기존 |
| ANALYSIS-02 | 법제처 API 판례 검색 연동 | integration | `npm test -- pipelineOrchestrator` (기존) | ✅ 기존 |
| ANALYSIS-03 | 쟁점 체크리스트 섹션 파싱 | unit | `npm test -- parseAnalysisStream` | ❌ Wave 0 |
| ANALYSIS-04 | 변호사 질문 섹션 파싱 | unit | `npm test -- parseAnalysisStream` | ❌ Wave 0 |
| ANALYSIS-05 | 스트리밍 청크 도착 즉시 렌더 | component | `npm test -- ResultsContainer` | ❌ Wave 0 |
| ANALYSIS-06 | buildUserPrompt API 결과만 인용 | unit | `npm test -- buildUserPrompt` (기존 확장) | ✅ 기존 |
| LEGAL-01 | 법령명 + 조문번호 표시 | component | `npm test -- StatuteSection` | ❌ Wave 0 |
| LEGAL-02 | 판례 사건번호 + 날짜 표시 | component | `npm test -- PrecedentSection` | ❌ Wave 0 |
| LEGAL-03 | 일상어 요약 섹션 표시 | component | `npm test -- IssueChecklist` | ❌ Wave 0 |
| LEGAL-04 | "법제처 API 검색 결과" 라벨 | component | `npm test -- SourceBadge` | ❌ Wave 0 |
| SAFE-04 | DV 키워드 감지 → SafetyBranch 표시 | unit + component | `npm test -- dvDetector` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test` (전체 suite, ~10초)
- **Per wave merge:** `npm test -- --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/stores/__tests__/wizardStore.test.ts` — INTAKE-03
- [ ] `src/lib/__tests__/dvDetector.test.ts` — SAFE-04
- [ ] `src/lib/__tests__/parseAnalysisStream.test.ts` — ANALYSIS-03, ANALYSIS-04
- [ ] `src/components/wizard/__tests__/WizardContainer.test.tsx` — INTAKE-01
- [ ] `src/components/wizard/__tests__/IntroStep.test.tsx` — INTAKE-04
- [ ] `src/components/wizard/__tests__/DivorceReasonStep.test.tsx` — DV 감지 통합
- [ ] `src/components/results/__tests__/ResultsContainer.test.tsx` — ANALYSIS-05
- [ ] `src/components/results/__tests__/SourceBadge.test.tsx` — LEGAL-04

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Firebase anonymous auth 토큰 (`user.getIdToken()`) — Phase 1 구현됨 |
| V3 Session Management | yes | 위저드 상태 메모리 전용 (localStorage 미사용) — DV 피해자 보안 |
| V4 Access Control | yes | `/api/analyze` Bearer 토큰 검증 — Phase 1 구현됨 |
| V5 Input Validation | yes | zod + react-hook-form 클라이언트 + `sanitizeInput` 서버 — Phase 1 구현됨 |
| V6 Cryptography | no | 암호화 직접 구현 없음 — Firebase SDK 내부 처리 |

### Known Threat Patterns (Phase 2 신규 추가 범위)

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DV 피해자 브라우저 히스토리 노출 | Information Disclosure | 결과 페이지를 새 URL 없이 렌더 (history.pushState 최소화) |
| 법적 결론 출력 (변호사법 위반) | Tampering | compliance filter (기존) + 구조화 출력 강제 |
| 클라이언트에서 법제처 API 직접 호출 | Information Disclosure | Route Handler 경유만 허용 (API 키 서버 전용) |
| 긴 텍스트 입력으로 프롬프트 주입 | Tampering | `sanitizeInput` 2000자 제한 (기존) + Zod 서버 검증 |

---

## Project Constraints (from CLAUDE.md)

1. **스택 고정:** Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 — 변경 금지
2. **AI 모델:** claude-sonnet-4-6 — claude-haiku 금지 (법률 정확성)
3. **변호사법 109조:** 개인화 법적 결론 절대 차단 (`귀하의 경우 ~`, % 예측 등)
4. **디자인:** warm gray #F5F3F0, deep teal #1B6B5A, 보라색/카드그리드 금지
5. **위저드 스테퍼:** shadcn/ui 사용 금지 — 커스텀 빌드
6. **Zustand v5:** curried `create<T>()((set, get) => ...)` 형식 필수
7. **Zod:** v4 기본 export 사용 (v3 API 호환). `@hookform/resolvers`와 호환성 검증 필요
8. **localStorage 미사용:** 위저드 상태는 Zustand 메모리 전용 (DV 보안)
9. **TDD 필수:** 실패하는 테스트 먼저, 구현은 그 다음
10. **접근성:** WCAG AA, 48px 터치 타겟, 375px Mobile-first (Phase 2에서 기본 구현, Phase 3에서 완성)

---

## Sources

### Primary (HIGH confidence)

- Phase 1 구현 코드 (`src/lib/`, `src/types/`, `src/components/`, `src/app/api/`) — 직접 코드 리뷰 [VERIFIED: Read tool]
- `package.json` — 실제 설치 버전 [VERIFIED: Read tool]
- `CLAUDE.md` — 프로젝트 제약 [VERIFIED: Read tool]
- `.planning/REQUIREMENTS.md` — 요구사항 [VERIFIED: Read tool]
- `.planning/ROADMAP.md` — Phase 2 목표 [VERIFIED: Read tool]

### Secondary (MEDIUM confidence)

- Zustand v5 curried 패턴 — 형제 프로젝트 MEMORY.md 및 CLAUDE.md 가이드라인 [VERIFIED: project files]
- react-hook-form multi-step 패턴 — CLAUDE.md 권장 스택 [CITED: CLAUDE.md]

### Tertiary (LOW confidence)

- react-hook-form @hookform/resolvers + Zod v4 호환성 — 훈련 지식 기반 [ASSUMED: A1]
- iOS Safari ReadableStream 스트리밍 안정성 — 훈련 지식 기반 [ASSUMED: A4]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — package.json 직접 확인
- Architecture: HIGH — Phase 1 코드 직접 리뷰 후 확장 설계
- Pitfalls: HIGH — 기존 코드에서 실제 패턴 확인
- DV 감지 패턴: MEDIUM — pipelineOrchestrator 기존 코드 기반 확장 [ASSUMED: false positive rate]

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (의존성 버전 변경 없을 경우 30일)
