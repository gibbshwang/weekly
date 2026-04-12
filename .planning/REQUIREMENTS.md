# Requirements: AI 이혼 법률 가이드 플랫폼

**Defined:** 2026-04-12
**Core Value:** 이혼 고민자가 자신의 상황에 맞는 쟁점과 관련 법령/판례를 한눈에 파악하여 변호사 상담을 효과적으로 준비할 수 있어야 한다.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### 상황 입력 (INTAKE)

- [ ] **INTAKE-01**: User can enter marriage duration, children info, asset overview, and divorce reason through a step-by-step wizard
- [ ] **INTAKE-02**: Wizard uses everyday language (not legal terms) with one question per step
- [ ] **INTAKE-03**: User can go back and edit previous steps without losing data
- [ ] **INTAKE-04**: Wizard includes empathetic intro explaining what the tool does and doesn't do

### AI 분석 엔진 (ANALYSIS)

- [ ] **ANALYSIS-01**: System searches relevant statutes via 법제처 API based on user's situation
- [ ] **ANALYSIS-02**: System searches relevant precedents via 법제처 API based on user's situation
- [ ] **ANALYSIS-03**: Claude generates structured issue checklist (쟁점 체크리스트) from API results — no legal conclusions
- [ ] **ANALYSIS-04**: Claude generates "questions to ask your lawyer" list tailored to user's situation
- [ ] **ANALYSIS-05**: Analysis results stream progressively (not wait for full completion)
- [ ] **ANALYSIS-06**: Claude acts as language converter only — all legal content sourced from 법제처 API, never generated

### 법률 정보 표시 (LEGAL)

- [ ] **LEGAL-01**: User can view relevant statute articles with source citations (조문 번호 + 법령명)
- [ ] **LEGAL-02**: User can view relevant precedent summaries with case numbers and dates
- [ ] **LEGAL-03**: AI provides plain-language summaries alongside original legal text
- [ ] **LEGAL-04**: All legal content shows clear source attribution (법제처 API origin)

### 규제 준수 (COMPLIANCE)

- [ ] **COMPL-01**: Every page displays disclaimer: "법률 정보 제공 서비스이며, 법률 자문이 아닙니다"
- [ ] **COMPL-02**: Every analysis output includes "변호사 상담 권유" CTA
- [ ] **COMPL-03**: System prompt enforces "no legal conclusions" — output post-filter validates compliance
- [ ] **COMPL-04**: AI never generates statements like "귀하의 경우 ~입니다" or percentage predictions

### DV 안전 (SAFETY)

- [ ] **SAFE-01**: Quick exit button fixed at top-right, redirects to neutral site (weather/news) on click
- [ ] **SAFE-02**: Page title shows neutral text (not "이혼" or law-related)
- [ ] **SAFE-03**: Emergency contacts (여성긴급전화 1366, 경찰 112) visible on every page
- [ ] **SAFE-04**: When abuse-related input detected, system shows safety information branch before analysis
- [ ] **SAFE-05**: Incognito mode usage guidance displayed on first visit

### 개인정보보호 (PRIVACY)

- [ ] **PRIV-01**: User can use the service anonymously without login (Firebase anonymous auth)
- [ ] **PRIV-02**: No data saved to server by default — explicit consent required before Firestore write
- [ ] **PRIV-03**: User can delete all their data with one click (즉시 전체삭제)
- [ ] **PRIV-04**: Clear notice that user data is NOT used for AI training
- [ ] **PRIV-05**: Sensitive information (이혼 사유, DV 여부) requires separate PIPA consent

### UI/UX (UI)

- [ ] **UI-01**: Mobile-first responsive design (min 375px width)
- [ ] **UI-02**: Touch targets minimum 48px
- [ ] **UI-03**: WCAG AA accessibility compliance
- [ ] **UI-04**: Design tokens: warm gray #F5F3F0, deep teal #1B6B5A, Pretendard 16px+
- [ ] **UI-05**: Information hierarchy: Landing (empathy→disclaimer→CTA) → Wizard → Results (summary→checklist→questions→statutes)

### 인증 (AUTH)

- [ ] **AUTH-01**: Firebase anonymous authentication on first visit
- [ ] **AUTH-02**: Google login option for saving sessions

### 인프라 (INFRA)

- [ ] **INFRA-01**: 법제처 API wrapper (XML→JSON) with error handling and fallback
- [ ] **INFRA-02**: Streaming response architecture to avoid Vercel timeouts
- [ ] **INFRA-03**: Edge/Node runtime split (Claude streaming = Node, static = Edge)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### 확장 기능

- **V2-01**: PDF download of analysis report
- **V2-02**: Session save and revisit (multi-session preparation)
- **V2-03**: Issue priority ranking (중요도 순 정렬)
- **V2-04**: Comparison view: 협의이혼 vs 재판이혼 side-by-side
- **V2-05**: 법제처 API response caching (frequently accessed statutes)
- **V2-06**: i18n support (English)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 재산분할/위자료 금액 예측 | 변호사법 109조 위반 — 법적 결론 생성 해당 |
| 이혼 가능성/승소율 표시 | 법적 추론 = 변호사법 위반 |
| AI 이혼 소장 자동 작성 | 변호사법 109조 직접 해당 ("법률 관계 문서 작성") |
| 변호사 매칭/중개 | 로톡 경쟁 불필요, MVP 범위 초과 |
| 챗봇 자유 질문 답변 | "워크스페이스" 포지셔닝 훼손, Law&Bot과 차별화 상실 |
| 배우자 개인정보 입력 | PIPA — 제3자 정보 수집 법적 위험 |
| AI 학습에 데이터 활용 | PIPA 민감정보 — 절대 금지 |
| 이혼 외 법률 영역 | MVP는 이혼 특화만 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (Populated by roadmapper) | | |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 0
- Unmapped: 30 ⚠️

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after research synthesis*
