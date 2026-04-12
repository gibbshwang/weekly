# Roadmap: AI 이혼 법률 가이드 플랫폼

## Overview

사용자가 일상 언어로 상황을 입력하면 관련 법령/판례와 쟁점 체크리스트를 제공하는 "상담 준비 워크스페이스". 법제처 API 래퍼와 규제 준수 인프라가 먼저(Phase 1), 그 위에 위저드 UI와 분석 파이프라인(Phase 2), 이후 접근성·PIPA 완성(Phase 3), 마지막으로 저장/로그인(Phase 4) 순서로 진행. DV 안전 UX와 변호사법 가드레일은 Phase 1에서 확립하고 이후에는 보강만 한다.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - 법제처 API 래퍼, DV 안전 인프라, 규제 준수 컴포넌트, Firebase 익명 인증, 스트리밍 아키텍처
- [ ] **Phase 2: Wizard UI + Analysis Pipeline** - 상황 입력 위저드, 분석 파이프라인 (법제처→Claude), 결과 표시 UI
- [ ] **Phase 3: Polish, Accessibility, PIPA Completeness** - 반응형·접근성 완성, 전체삭제, PIPA 민감정보 동의 게이트
- [ ] **Phase 4: Persistence + Save Flow** - Google 로그인, 세션 저장 동의 게이트, Firestore 쓰기

## Phase Details

### Phase 1: Foundation
**Goal**: 규제와 안전 기반이 완비된 상태에서 법제처 API→Claude 스트리밍 파이프라인이 서버에서 동작한다
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, AUTH-01, COMPL-01, COMPL-02, COMPL-03, COMPL-04, SAFE-01, SAFE-02, SAFE-03, SAFE-05, PRIV-01, PRIV-02, PRIV-04
**Success Criteria** (what must be TRUE):
  1. POST /api/analyze에 상황 데이터를 전송하면 법제처 API 검색 결과를 포함한 Claude 스트리밍 응답이 반환된다
  2. 모든 페이지 상단에 "법률 정보 제공 서비스이며, 법률 자문이 아닙니다" 면책 고지와 변호사 상담 CTA가 고정 표시된다
  3. 화면 우상단에 긴급 탈출 버튼이 존재하고, 클릭 시 history.replaceState + sessionStorage.clear 후 중립 사이트로 이동한다
  4. 페이지 타이틀과 메타태그에 "이혼" 또는 법률 관련 단어가 포함되지 않는다 (중립 표현 사용)
  5. 서비스를 로그인 없이 사용할 수 있으며 위저드 데이터가 서버에 자동 저장되지 않는다
**Plans**: 5 plans
Plans:
- [ ] 01-01-PLAN.md — Next.js 15 스캐폴딩 + Firebase 익명인증 + 테스트 인프라 + 공유 타입
- [ ] 01-02-PLAN.md — 법제처 Open API 래퍼 TDD (XML→JSON)
- [ ] 01-03-PLAN.md — Safety/Compliance UI 컴포넌트 (면책고지, 탈출버튼, 긴급연락처)
- [ ] 01-04-PLAN.md — Claude 클라이언트 + 변호사법 준수 후처리 필터 TDD
- [ ] 01-05-PLAN.md — 분석 파이프라인 오케스트레이터 + POST /api/analyze 엔드포인트
**UI hint**: yes

### Phase 2: Wizard UI + Analysis Pipeline
**Goal**: 사용자가 일상 언어로 상황을 입력하고 쟁점 체크리스트·법령·판례·변호사 질문 목록이 담긴 결과 보고서를 받을 수 있다
**Depends on**: Phase 1
**Requirements**: INTAKE-01, INTAKE-02, INTAKE-03, INTAKE-04, ANALYSIS-01, ANALYSIS-02, ANALYSIS-03, ANALYSIS-04, ANALYSIS-05, ANALYSIS-06, LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04, SAFE-04
**Success Criteria** (what must be TRUE):
  1. 사용자가 결혼 기간, 자녀, 재산, 이혼 사유를 단계별 일상 언어 질문으로 입력하고, 이전 단계로 돌아가도 입력값이 유지된다
  2. 위저드 제출 후 쟁점 체크리스트·관련 법령 조문·판례 요약·변호사 질문 목록이 순차적으로 스트리밍 표시된다 (전체 완료를 기다리지 않음)
  3. 법령과 판례 항목에 출처(조문 번호 + 법령명, 판례 번호 + 날짜)가 명시되고 "법제처 API 검색 결과" 라벨이 붙는다
  4. Claude 출력에 "귀하의 경우 ~입니다" 형식의 개인화된 법적 결론이 포함되지 않는다
  5. 가정폭력 관련 입력이 감지되면 분석 전에 안전 정보 브랜치(1366, 112 연결)가 먼저 표시된다
**Plans**: 5 plans
Plans:
- [ ] 02-01-PLAN.md — Zustand 위저드 스토어 + DV 감지 + 스트리밍 파서 TDD
- [ ] 02-02-PLAN.md — buildUserPrompt 구조화 출력 + react-hook-form 설치
- [ ] 02-03-PLAN.md — 위저드 UI 컴포넌트 (IntroStep, 4단계 스텝, SafetyBranch, WizardContainer)
- [ ] 02-04-PLAN.md — 스트리밍 결과 UI (useAnalysisStream, ResultsContainer, 섹션 컴포넌트, SourceBadge)
- [ ] 02-05-PLAN.md — 페이지 라우트 연결 (/wizard) + 랜딩 CTA + 전체 플로우 시각적 검증
**UI hint**: yes

### Phase 3: Polish, Accessibility, PIPA Completeness
**Goal**: 서비스가 모바일 375px에서 완전히 동작하고 WCAG AA를 충족하며 PIPA 민감정보 동의 흐름이 완성된다
**Depends on**: Phase 2
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, PRIV-03, PRIV-05
**Success Criteria** (what must be TRUE):
  1. 375px 화면에서 위저드와 결과 보고서가 깨지지 않고 모든 버튼이 48px 이상 터치 타겟을 갖는다
  2. 키보드 탐색만으로 위저드 전체를 완료할 수 있고, 색상 대비가 WCAG AA 기준을 충족한다
  3. 사용자가 "내 데이터 전체 삭제" 버튼 한 번으로 Firebase 익명 계정과 관련 데이터가 즉시 삭제된다
  4. 이혼 사유 또는 DV 여부 관련 입력 전에 PIPA 민감정보 동의 문구가 표시되고 동의 없이는 해당 단계로 진행되지 않는다
**Plans**: 2 plans
Plans:
- [ ] 03-01-PLAN.md — 반응형·터치타겟·WCAG AA 접근성 수정 (대비, 포커스, 라벨, ARIA)
- [ ] 03-02-PLAN.md — 전체삭제 API/버튼 + PIPA 민감정보 동의 게이트
**UI hint**: yes

### Phase 4: Persistence + Save Flow
**Goal**: 사용자가 분석 결과를 저장하기로 선택하면 명시적 PIPA 동의 후 Google 계정으로 저장된다
**Depends on**: Phase 3
**Requirements**: AUTH-02
**Success Criteria** (what must be TRUE):
  1. 결과 화면에 "저장하기" 옵션이 제공되고, 클릭 시 PIPA Article 23 동의 모달이 먼저 표시된다
  2. 동의 후 Google 로그인(익명 계정 linkWithCredential)으로 분석 세션이 Firestore에 저장된다
  3. 저장된 세션은 사용자가 언제든지 삭제할 수 있으며 삭제 즉시 Firestore에서 제거된다
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/5 | Planning complete | - |
| 2. Wizard UI + Analysis Pipeline | 0/5 | Planning complete | - |
| 3. Polish, Accessibility, PIPA Completeness | 0/2 | Planning complete | - |
| 4. Persistence + Save Flow | 0/TBD | Not started | - |
