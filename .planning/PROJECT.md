# AI 이혼 법률 가이드 플랫폼

## What This Is

이혼을 고려하는 일반인이 변호사 상담(20만원+) 전에 자신의 법적 상황을 파악할 수 있는 "상담 준비 워크스페이스". 상황 입력 → 쟁점 체크리스트 + 관련 법령/판례 + 변호사에게 물어볼 질문 목록을 제공하는 웹 서비스. 법률 자문이 아닌 "법률 정보 제공 도구"로 포지셔닝.

## Core Value

이혼 고민자가 자신의 상황에 맞는 쟁점과 관련 법령/판례를 한눈에 파악하여 변호사 상담을 효과적으로 준비할 수 있어야 한다.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 상황 입력 위저드: 일상 언어로 결혼 기간, 자녀, 재산, 이혼 사유 등 단계별 질문
- [ ] AI 분석 엔진: 법제처 API로 법령/판례 검색 → Claude가 구조화된 분석 생성
- [ ] 쟁점 체크리스트: 협의이혼/재판이혼 판단, 재산분할/양육권/위자료 관련 쟁점 목록
- [ ] 법률 근거 보고서: 관련 법령 조문 + 유사 판례 요약 (원문 검색·표시만, 해석 금지)
- [ ] 변호사 질문 목록: 상황에 맞는 "변호사에게 물어볼 질문" 생성
- [ ] 면책 고지: 모든 페이지에 "법률 자문 아님" 명시 + 변호사 상담 권유 CTA
- [ ] DV 안전 UX: 긴급 탈출 버튼, 중립 타이틀, 1366 연결, abuse 감지 시 안전 브랜치
- [ ] PIPA 준수: 익명 기본, 저장 시에만 동의, 즉시 전체삭제, AI 학습 미활용 명시
- [ ] Firebase Auth: 익명 + Google 로그인
- [ ] 반응형 UI: Mobile-first 375px, 48px 터치타겟, WCAG AA

### Out of Scope

- 재산분할/위자료 숫자 예측 — Eng Review에서 제거. 법적 추론/결론은 변호사법 위반 소지
- AI 이혼 소장 작성 — 규제 리스크 최대 (변호사법 109조)
- PDF 다운로드 — v1.1 이후 검토 (브라우저 인쇄로 대체)
- 변호사 연결/중개 기능 — 로톡과 경쟁 불필요, MVP 범위 초과
- 이혼 외 다른 법률 영역 — MVP는 이혼 특화만

## Context

- **법률 데이터:** 법제처 Open API (OC: oneday24n1) 직접 호출. korean-law-mcp fly.dev 서버 404로 자체 래퍼 필요
- **이혼 판례:** 683건 검색 가능 (대법원, 가정법원). 2026년 최신 판례 포함
- **GATE 검증 완료 (2026-04-12):** API 테스트 PASS, 규제 리스크 CONDITIONAL PASS
- **규제 환경:** 변호사법 109조 (비변호사 법률사무 7년↓ 징역), AI기본법 (2026.1.22 시행), 대법원 로폼 판결 (2025.2)
- **경쟁:** NexusAI, 로앤서치, 빅케이스 (범용), Law&Bot (이혼 특화 but 얕음)
- **차별화:** 법제처 API 직접 호출 = 항상 최신 법령, "챗봇"이 아닌 "상담 준비 도구"

## Constraints

- **규제**: 법적 추론/결론 생성 절대 차단. "법률 정보 제공"만 허용 — 변호사법 109조 위반 방지
- **스택**: Next.js 15 + React 19 + TypeScript + Tailwind CSS — 기존 기술 스택 통일
- **AI**: Claude API (claude-sonnet-4-6) — 법률 분석 및 쉬운 말 변환
- **DB**: Firebase Firestore (단일 컬렉션) — 사용자 상황 데이터, 분석 결과
- **배포**: Vercel — 자동 배포, 스트리밍 응답으로 타임아웃 회피
- **디자인**: warm gray #F5F3F0, deep teal #1B6B5A, Pretendard 16px+, 보라색/카드그리드 금지
- **접근성**: WCAG AA, Mobile-first 375px, 48px 터치타겟

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 시뮬레이션 숫자 예측 제거 | 변호사법 위반 소지 + Eng Review 지적 | ✓ Good |
| "상담 준비 워크스페이스"로 프레이밍 | Design Review: 대시보드 → 공감 + 신뢰 강조 | ✓ Good |
| 법제처 API 직접 호출 | MCP fly.dev 서버 불안정. API는 정상 작동 확인 | — Pending |
| 익명 기본 + 저장 시에만 동의 | PIPA 민감정보 최소 수집 원칙 | — Pending |
| DV 안전 브랜치 (abuse 감지) | 가정폭력 상황에서 사용자 안전 최우선 | — Pending |
| faultParty 필드 제거 | Claude가 상황에서 분석 — Design Review 결정 | ✓ Good |
| 스트리밍 응답 | Vercel 타임아웃 회피 + 점진적 UX | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-12 after GATE verification & GSD initialization*
