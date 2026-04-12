# Domain Pitfalls: AI 이혼 법률 가이드 플랫폼

**Domain:** AI legal information — Korean divorce law
**Researched:** 2026-04-12
**Scope:** Korean market, 변호사법 109조, AI기본법, PIPA, DV safety

---

## Critical Pitfalls

Critical = causes legal liability, user harm, or regulatory shutdown.

---

### Pitfall C-1: "법적 결론처럼 읽히는" 정보 출력

**What goes wrong:**
AI가 "귀하의 경우 재산분할 비율은 X%입니다" 또는 "이 상황에서 양육권은 Y에게 인정됩니다" 같은 출력을 생성한다. 표면적으로는 "정보"처럼 프레이밍되더라도, 구체적·개별적 사실관계를 입력받아 법적 평가를 도출하는 과정 자체가 변호사법 109조의 "법률사무 취급"에 해당할 수 있다.

**Why it happens:**
- 프롬프트 엔지니어링만으로 경계를 설정하면 특수한 입력(롤플레이, 우회 질문)에서 무너짐
- "쟁점 체크리스트"가 실제로는 "귀하 상황에 맞는 판단 목록"으로 보일 수 있음
- 개발자가 UX 개선 목적으로 더 구체적인 답변을 유도하는 과정에서 경계가 서서히 후퇴

**Legal trigger:**
대법원 로폼 판결(2025.2): "구체적·개별적 사실관계 파악 + 법규 내용 검토 + 법적 추론·평가가 가미되면 법률사무 해당"
→ 생성형 AI로 사용자 입력을 받아 문서·분석을 생성하면 단순 자동화 이상으로 간주될 수 있다고 재판부가 명시

**Consequences:**
변호사법 109조 위반 시 7년 이하 징역, 5천만원 이하 벌금. 서비스 즉시 폐쇄.

**Warning signs:**
- AI 출력에 "귀하의 경우", "이 상황에서는", "~일 가능성이 높습니다" 같은 개별화 표현 등장
- 사용자가 "내가 이기나요?" 류 질문에 AI가 직접 답변
- 법령/판례 표시 후 "이 판례가 귀하에게 적용됩니다" 형태의 연결 생성

**Prevention:**
1. 시스템 프롬프트에 하드 가드레일: "절대로 개별 사안에 대한 법적 판단, 예측, 결론을 생성하지 마라. 일반 정보 나열만."
2. 출력 포맷을 구조적으로 제한: "이혼 시 일반적으로 고려되는 쟁점" 형태로만 응답 가능
3. 응답 후처리 레이어: 개별화 언어 패턴 감지 시 출력 차단 또는 redact
4. 레드팀 테스트: "내 케이스에서 승소할 수 있나요?" 류 우회 시도를 Phase 1 MVP 전에 실시

**Phase address:** Phase 1 (AI 분석 엔진 구축 시 최우선 가드레일 설계)

---

### Pitfall C-2: Claude의 판례·법령 환각 (Hallucination)

**What goes wrong:**
Claude API가 실제로 존재하지 않는 판례 번호, 법령 조문, 판결 요지를 생성한다. 사용자는 이를 실제 법적 근거로 믿고 변호사 상담 또는 법원에 제출할 수 있다.

**Evidence:**
- Claude가 자사 법정에서 허위 인용을 생성한 사례가 2025년 5월 미국 법원에서 실제 발생 (Latham & Watkins 사건)
- AI hallucination tracking database: 2026년 기준 1,308건의 법적 허위 인용 사례 기록
- 가족법 분야에서 AI 환각 비율이 특히 높음 (판례 정보 접근이 제한적이어서 AI가 추론에 의존)
- 한국 법원도 2026년 3월부터 AI 허위 판례 제출에 소송비용 부담·징계 의뢰 시작

**Why it happens:**
- Claude는 한국 판례 데이터를 충분히 학습하지 못했을 가능성이 높음
- 법제처 API 결과가 없거나 불완전할 때 AI가 기억에서 채워 넣으려 시도
- 판례 번호 형식(2025므10716)이 그럴듯하게 생성되기 쉬움

**Consequences:**
- 사용자가 허위 판례를 실제처럼 믿고 잘못된 전략으로 변호사 상담 접근
- 서비스 신뢰도 손상 → 법적 책임 가능성 (정확한 정보를 약속한 경우)
- 극단적으로: 사용자가 허위 판례를 법원에 제출하면 사용자 피해 및 서비스 책임 문제

**Warning signs:**
- AI 출력에 사건번호가 포함되어 있는데 법제처 API로 검증되지 않음
- 법령 조문 번호가 실제 법령과 불일치
- 판결 요지가 법제처 API 원문과 다름

**Prevention:**
1. **핵심 규칙**: Claude는 절대로 판례 번호나 법령 조문을 "생성"하지 말 것. 반드시 법제처 API가 반환한 데이터만 인용
2. 아키텍처: 법제처 API → 검색 결과 → Claude에게 원문 데이터 제공 → Claude는 요약/쉬운 말 변환만
3. UI에서 판례/법령은 법제처 API 응답 데이터만 표시, Claude 생성 텍스트와 명확히 구분
4. 출력에 항상 "법제처 API 검색 기준 N건" 표시 — 검색 결과 없을 때 "해당 법령/판례를 찾지 못했습니다" 명시

**Phase address:** Phase 1 아키텍처 설계 (법제처 API가 source of truth, Claude는 언어 변환기 역할만)

---

### Pitfall C-3: DV 피해자 탈출 버튼이 실제로 안전하지 않음

**What goes wrong:**
"긴급 탈출 버튼"을 구현했지만 실제로 피해자를 보호하지 못한다. 가해자가:
- 브라우저 히스토리에서 방문 기록 확인
- 스크린 리코더/키로거로 입력한 내용 확인
- 세션 쿠키나 자동완성에서 정보 복원
- 공유 기기에서 캐시된 데이터 접근

**Evidence:**
- 323개 DV 지원 사이트 감사: 100%가 트래킹 쿠키 사용, 다수가 Quick Exit 후에도 세션 데이터 미삭제
- 일부 사이트는 Quick Exit 후 채팅 기록을 이메일로 전송 안내 → 가해자가 이메일 접근 시 노출
- 브라우저 보안 제약으로 웹사이트는 브라우저 히스토리를 직접 삭제할 수 없음

**Why it happens:**
- 개발자가 "버튼 클릭 → 탭 이동"만 구현하고 완전한 디지털 안전을 달성했다고 가정
- Vercel/Firebase 기본 분석 쿠키가 자동으로 삽입됨
- localStorage, sessionStorage에 상황 입력 데이터가 잔존

**Consequences:**
DV 피해자가 도움을 요청하려 했다가 가해자에게 발각 → 신체적 위험. 서비스 제공자의 도덕적 및 잠재적 법적 책임.

**Warning signs:**
- Firebase Analytics, Google Analytics 등 트래킹 스크립트가 활성화된 채 배포
- localStorage에 wizard 입력 데이터 저장
- "탈출" 후 back 버튼으로 이전 페이지 복원 가능

**Prevention:**
1. 탈출 버튼: 탭 이동 + `window.history.replaceState()`로 현재 URL 히스토리 교체 + sessionStorage.clear()
2. 모든 입력 데이터를 sessionStorage 대신 메모리(React state)에만 보관 — 새로고침 시 초기화 의도적 설계
3. 사이트 진입 시 "비공개 브라우징(시크릿 모드) 사용 권장" 안내
4. 탈출 목적지 페이지는 날씨, 뉴스 등 완전히 다른 콘텐츠 (기본: weather.com)
5. 서비스 자체 분석 쿠키 최소화 + PIPA 동의 없는 트래킹 금지
6. **절대 하지 말 것**: 사용자 입력을 이메일로 전송하거나 PDF 저장 기능 제공

**Phase address:** Phase 1 (DV UX는 MVP 핵심 요구사항, 나중으로 미루면 안 됨)

---

### Pitfall C-4: PIPA 이혼 데이터 = 민감정보 미인식

**What goes wrong:**
이혼 사유, 가정폭력 여부, 자녀 정보, 혼외관계 정보를 일반 개인정보로 취급한다. 개인정보보호법은 "사생활을 현저히 침해할 우려가 있는 정보"를 민감정보로 분류하며, 별도 동의 없이 수집·처리하면 위반이다.

**Legal basis:**
PIPA 제23조: 민감정보는 정보주체의 별도 동의 또는 법령 근거 없이 처리 불가.
이혼 사유, DV 여부, 혼외관계는 "사생활 침해 우려 정보"로 민감정보에 해당할 가능성 높음.

**Why it happens:**
- Firebase Firestore 기본 설정으로 모든 사용자 입력을 저장
- 익명 세션이라도 IP + 타임스탬프 + 입력 내용의 조합이 식별 가능성 있음
- 개발 편의상 "나중에 동의 플로우 추가"로 미룸

**Consequences:**
개인정보보호위원회 과징금 (위반 관련 매출액 3% 이하 또는 최대 3억원). 서비스 중단 명령 가능.

**Warning signs:**
- 서비스 진입 즉시 입력 시작 가능하고 데이터가 DB에 저장됨
- 개인정보처리방침에 이혼/DV 관련 데이터 처리 근거가 없음
- Firebase Console에서 사용자 입력 내용이 평문으로 조회됨

**Prevention:**
1. 기본 설계: 분석 결과를 생성하기 전까지 Firebase에 아무것도 저장하지 않음 (메모리만)
2. 저장 시점에만 민감정보 별도 동의 팝업 (PIPA 제23조 준수 문구)
3. 개인정보처리방침에 명시: 이혼 관련 정보는 민감정보로 취급, 처리 목적·보유기간·파기 방법
4. 세션 종료 후 자동 파기 또는 명시적 "전체 삭제" 기능
5. AI 학습 미활용 명시 (Claude API에 보낸 데이터가 Anthropic 학습에 사용되지 않는다는 계약 확인)
6. 익명 사용 기본 — 저장을 원하는 사용자만 Firebase Auth 로그인

**Phase address:** Phase 1 설계 (데이터 흐름 설계 시 저장 최소화 원칙을 기본으로)

---

## Moderate Pitfalls

Mistakes that cause user harm, technical debt, or reputational damage but are recoverable.

---

### Pitfall M-1: 법제처 API 의존성 단일 실패점

**What goes wrong:**
법제처 API가 응답하지 않거나 느릴 때 (타임아웃, 서버 점검, rate limit) 서비스 전체가 중단된다. MCP fly.dev 서버가 이미 404 상태임을 GATE 검증에서 확인했다 — 외부 의존성 실패는 현실적 위험이다.

**Characteristics observed:**
- 법제처 API는 공공기관 API로 SLA(서비스 수준 협약)가 없음
- 법령 전문(HTML 포함) 응답이 크고 느릴 수 있음
- 판례 683건 전체를 페이지네이션으로 가져오면 수십 초 소요 가능

**Warning signs:**
- Vercel serverless 함수 기본 타임아웃(10-25초) 도달로 504 에러
- 법제처 API가 간헐적으로 빈 배열 반환 (검색 키워드 mismatch)
- HTML 태그(`<br/>`) 포함된 응답을 파싱하지 않고 그대로 표시

**Prevention:**
1. 법령/판례 검색 결과 캐싱: Firestore 또는 Vercel Edge Cache에 24시간 캐시
2. 타임아웃 처리: 법제처 API 응답 3초 초과 시 graceful degradation ("일시적으로 법령 검색을 이용할 수 없습니다")
3. Vercel streaming 응답으로 Claude 분석 먼저 스트리밍, 법제처 결과는 별도 로딩
4. HTML 파싱 유틸리티 함수 초기에 구현 (법제처 응답 `<br/>` → 줄바꿈 변환)
5. 법령 데이터 부분 캐싱 전략: 민법, 가사소송법 같은 핵심 법령은 사전 로드

**Phase address:** Phase 1 API 래퍼 구현 시

---

### Pitfall M-2: 면책 고지가 "클릭 차단막"으로 전락

**What goes wrong:**
서비스 진입 시 면책 팝업을 표시하지만 사용자가 클릭 한 번으로 닫고 내용을 읽지 않는다. AI 출력 하단의 면책문구는 작은 글씨로 표시되어 사용자가 인지하지 못한다. 법적 분쟁 발생 시 "사용자가 동의했다"는 방어 논리가 약해진다.

**Evidence:**
AI 법률 서비스 liability 케이스에서: 면책 고지는 "제품 결함"이나 "시스템적 과실"을 면제하지 못함. 법원은 면책의 가시성(conspicuousness)과 사용자가 실제로 이해했는지를 고려.

**Warning signs:**
- 면책 팝업이 "확인" 버튼 한 번으로 즉시 닫힘
- AI 출력에 면책문구가 없거나 최하단에만 있음
- 이용약관 링크가 있지만 아무도 읽지 않는 구조

**Prevention:**
1. 면책 팝업: 내용을 짧게 (3문장 이내), 핵심만 큰 글씨로, "법률 자문이 아닙니다"를 헤드라인으로
2. AI 출력 상단에 항상 표시: "아래 내용은 일반적인 법률 정보이며, 귀하의 사안에 대한 법적 판단이 아닙니다"
3. Wizard 시작 전 단계: 서비스 성격을 설명하는 온보딩 화면 (스킵 불가 5초 또는 스크롤 완료 조건)
4. CTA를 "변호사 상담 예약" 또는 "법률구조공단 연결"로 강하게 배치 — 서비스가 대체재가 아님을 UX로 표현

**Phase address:** Phase 1 (MVP 포함), Phase 3 (UX 개선 시)

---

### Pitfall M-3: AI기본법 고영향 AI 분류 사전 미대비

**What goes wrong:**
AI기본법(2026.1.22 시행) 시행령에서 법률 분야 AI가 "고영향 AI"로 분류될 경우, 위험관리방안 수립, 사용자 설명요구권 보장, "비상정지" 기능 구현이 의무화된다. 이를 모르고 출시하면 사후 대규모 리팩터가 필요하다.

**Current state:**
시행 초기 1년(2026~2027) 계도 기간으로 과태료 미부과. 하지만 법적 의무는 2026.1.22부터 발생.
법률 분야 AI의 고영향 분류 여부는 아직 시행령 세부 기준이 확정되지 않음 — 모니터링 필요.

**Warning signs:**
- 시행령 입법예고 모니터링 없이 출시
- AI 사용 여부가 UI에 명시되지 않음 (투명성 의무 위반 가능)
- 사용자가 AI 판단 기준을 물었을 때 설명할 수 없는 구조

**Prevention:**
1. AI 사용 사실을 UI에 명시 (예: "AI(Claude)가 분석합니다") — 투명성 의무 선제 준수
2. 사용자가 "이 분석은 어떻게 생성됐나요?" 물을 때 답할 수 있는 설명 페이지 준비
3. 법무법인 또는 AI 규제 전문가에게 출시 전 고영향 분류 가능성 자문 (Phase 1 완료 후)
4. 정부 시행령 입법예고 RSS/뉴스 모니터링 설정

**Phase address:** Phase 1 (투명성 UI 설계), 출시 전 법률 자문

---

### Pitfall M-4: 이혼 위저드가 "상황 입력 도구"가 아닌 "진단 도구"처럼 느껴짐

**What goes wrong:**
사용자가 상황을 입력하고 분석을 받으면, 실제 의도와 무관하게 "AI가 내 상황을 진단했다"고 인식한다. 이는 법적 결론을 제공하지 않더라도 사용자의 과잉 의존(overreliance)을 유발하고, 실제로 변호사 상담 없이 의사결정을 내리게 만든다.

**Evidence:**
AI legal tools 연구: 사용자들은 AI 법률 정보를 실제보다 더 권위 있고 개인화된 것으로 인식하는 경향. 특히 취약 상황(이혼, DV)의 사용자는 객관적 평가 없이 AI 출력을 수용하려는 bias가 강함.

**Warning signs:**
- 사용자 피드백에 "AI가 내 케이스는 ~라고 했다"는 표현 등장
- 출력 UI가 "당신의 분석 결과"처럼 개인화된 제목 사용
- 변호사 상담 CTA가 분석 결과 화면에서 눈에 띄지 않음

**Prevention:**
1. 출력 제목을 항상 일반적으로: "이혼 시 일반적으로 검토되는 쟁점" (절대 "귀하의 분석 결과" 아님)
2. 분석 결과 최상단에: "이 내용은 귀하의 상황을 진단한 것이 아니라, 유사 상황에서 일반적으로 고려되는 법률 정보입니다"
3. "변호사에게 물어볼 질문" 섹션을 메인 출력으로 배치 — 서비스의 목적이 "상담 준비"임을 UX로 강조
4. 법률구조공단 무료 상담 연결 CTA를 결과 화면 고정 위치에 배치

**Phase address:** Phase 1 UX 설계, Phase 2 (사용자 테스트 시 확인)

---

## Minor Pitfalls

Technical issues that cause friction but are straightforward to fix.

---

### Pitfall N-1: 법제처 API HTML 태그 파싱 미구현

판례 전문에 `<br/>`, `<p>` 등 HTML 태그가 포함되어 있다 (GATE 검증에서 확인). 파싱 없이 그대로 렌더링하면 태그가 텍스트로 표시된다.

**Prevention:** API 응답 처리 레이어에서 HTML strip 유틸리티 초기 구현. React `dangerouslySetInnerHTML` 사용 금지 (XSS 위험), 대신 DOMParser 또는 sanitize-html로 안전하게 파싱.

**Phase address:** Phase 1 API 래퍼

---

### Pitfall N-2: Vercel 서버리스 함수 타임아웃

Claude API + 법제처 API 순차 호출 시 총 응답 시간이 Vercel 기본 타임아웃(10초)을 초과할 수 있다.

**Prevention:** Vercel Edge Functions + streaming 응답 사용. `maxDuration: 60` 설정 (Pro 플랜 필요). 법제처 API와 Claude 호출을 병렬 처리 (`Promise.all`) 또는 스트리밍으로 점진적 표시.

**Phase address:** Phase 1 API 구현

---

### Pitfall N-3: 모바일에서 긴급 탈출 버튼 접근성

탈출 버튼이 스크롤 시 화면에서 사라지거나, 다른 UI 요소(쿠키 고지, 챗 버블)에 가려진다. 연구에서 323개 사이트 감사 시 이런 가시성 문제가 가장 흔한 결함으로 발견됨.

**Prevention:** 탈출 버튼을 `fixed` 위치 + 최상위 z-index로 구현. 최소 터치 타겟 56px. 색상 대비 WCAG AA 준수. 모든 페이지에서 항상 노출.

**Phase address:** Phase 1

---

### Pitfall N-4: 법제처 API 검색어 미스매치

"양육권"으로 검색했을 때 법제처 API가 관련 판례를 반환하지 않거나 다른 키워드("친권", "면접교섭권")로 검색해야 하는 경우가 있다. 법령 용어와 일반 언어 사이의 간극.

**Prevention:** 법률 용어 동의어 사전(synonym map) 구현. 사용자 입력 키워드를 법제처 API에 맞는 법률 용어로 변환하는 레이어. 검색 결과 0건일 때 대체 키워드 자동 시도.

**Phase address:** Phase 1 API 래퍼, Phase 2 개선

---

## Phase-Specific Warnings

| Phase Topic | 해당 Pitfall | 우선 완화 방법 |
|-------------|-------------|---------------|
| AI 분석 엔진 (Phase 1) | C-1 법적 결론 출력 | 시스템 프롬프트 하드 가드레일 + 출력 후처리 필터 |
| AI 분석 엔진 (Phase 1) | C-2 환각 | 법제처 API가 source of truth, Claude는 언어 변환만 |
| DV 안전 UX (Phase 1) | C-3 탈출 버튼 불완전 | sessionStorage 초기화 + 히스토리 replace + 분석 쿠키 최소화 |
| 데이터 저장 설계 (Phase 1) | C-4 PIPA 민감정보 | 저장 최소화 아키텍처 + 별도 동의 플로우 |
| 법제처 API 래퍼 (Phase 1) | M-1, N-1, N-2, N-4 | 캐싱 + 타임아웃 + HTML 파싱 + 동의어 사전 |
| 면책 고지 UI (Phase 1) | M-2 | 가시성 높은 면책 + 출력 상단 고정 |
| 출시 전 규제 검토 | M-3 AI기본법 | 투명성 UI + 법률 자문 |
| UX 설계 전반 | M-4 과잉 의존 | "상담 준비" 포지셔닝 언어 + 변호사 CTA 강화 |
| 모바일 UI (모든 Phase) | N-3 탈출 버튼 가시성 | Fixed 위치 + 최상위 z-index |

---

## Sources

- 대법원 로폼 판결 2025.2: [법률신문 보도](https://www.lawtimes.co.kr/news/articleView.html?idxno=218004)
- 변호사법 109조 AI 법률서비스 논의: [법률신문 — AI법률상담 변호사법 위반 소지](https://news.koreanbar.or.kr/news/articleView.html?idxno=30452)
- Claude 환각 법정 사례: [Fortune — Claude hallucinated citation in legal filing](https://fortune.com/2025/05/18/anthropic-claude-lawyer-mistake-citation-legal-filing-large-language-model-llm-latham-watkins/)
- AI 허위 판례 한국 법원 대응: [법률신문 — AI 환각 가짜 판례 법원 대책](https://www.lawtimes.co.kr/news/articleView.html?idxno=218596)
- DV 탈출 버튼 보안 감사 연구: [ACM — Click Here to Exit: An Evaluation of Quick Exit Buttons](https://dl.acm.org/doi/fullHtml/10.1145/3544548.3581078)
- DV 피해자 AI 챗봇 위험: [NNEDV — OpenAI Court Order AI Privacy Safety for Survivors](https://nnedv.org/latest_update/new-openai-court-order-raises-serious-concerns-about-ai-privacy-and-safety-for-survivors-of-abuse/)
- DV 사이트 트래킹 쿠키 문제: [Ethical Implications of AI-Driven Chatbots in DV Support](https://www.cogitatiopress.com/socialinclusion/article/viewFile/9998/4604)
- AI기본법 고영향 AI 의무: [피카부랩스 — AI 기본법 완전 정리](https://peekaboolabs.ai/blog/ai-basic-law-guide)
- AI기본법 기업 의무: [헬프미 블로그](https://www.help-me.kr/blog/article/korea-ai-act-2026-compliance-guide/)
- AI 면책 고지 법적 한계: [McGuireWoods — When AI Goes Wrong](https://www.mcguirewoods.com/client-resources/alerts/2025/12/when-ai-allegedly-goes-wrong-what-area-of-law-are-plaintiffs-using/)
- AI hallucination 가족법 사례: [Canadian Lawyer — Ko v Li family law AI hallucination](https://www.canadianlawyermag.com/practice-areas/family/superior-court-says-family-law-case-factum-may-have-fake-legal-citations-due-to-ai-hallucinations/392433)
- 법제처 Open API 가이드: [국가법령정보 공동활용](https://open.law.go.kr/LSO/openApi/guideList.do)
- GATE 검증 결과: `.planning/GATE-VERIFICATION.md`
