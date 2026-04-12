# Feature Landscape: AI 이혼 법률 가이드 플랫폼

**Domain:** AI legal information / divorce consultation preparation workspace
**Researched:** 2026-04-12
**Regulatory frame:** 변호사법 109조 — "법률 정보 제공"만 허용, 법적 결론/추론 생성 금지

---

## Competitive Landscape Summary

| Service | Target | Model | Boundary |
|---------|--------|-------|----------|
| 빅케이스 (LawCompany) | 법조인 | 판례/법령 검색 DB | 정보 검색만 |
| 슈퍼로이어 (LawCompany) | 변호사 유료 SaaS | RAG + 서면 초안 | B2B 전용 |
| NexusAI (ailawbot) | 일반인 | 챗봇 Q&A | 답변에 출처 명시, 변호사 상담 권유 |
| Law&Bot (Law&Good) | 일반인 | 이혼 특화 챗봇 | 자유 질문 → AI 응답 (얕음) |
| 법제처 Lawbot | 일반인 | 법령 검색 | 공공 서비스, UI 취약 |
| 로폼 | 일반인 | 자동 서식 작성 | 대법원 2025.2 판결로 적법 확정 |

**핵심 격차:** 이혼에 특화된 "상담 준비 워크스페이스"는 시장에 없음. 기존 서비스는 자유 질문 챗봇(얕음) 또는 법조인 전용 리서치 도구.

---

## Table Stakes

사용자가 없으면 이탈하는 기능. 경쟁 서비스 모두 갖춤.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 상황 입력 인터페이스 | 모든 분석의 진입점. 없으면 서비스 자체가 성립 안 됨 | Medium | 단계별 위저드 (결혼 기간, 자녀, 재산, 이혼 사유) |
| AI 쟁점 분석 | 상황 입력 후 결과 없으면 가치 0 | High | 협의/재판이혼 판단 + 재산분할/양육권/위자료 쟁점 목록 |
| 관련 법령 표시 | 법률 정보 서비스의 최소 단위. 빅케이스·NexusAI 모두 제공 | Medium | 법제처 API 직접 호출 — 항상 최신 조문 보장 |
| 유사 판례 표시 | 사용자 신뢰의 핵심. "근거가 있는 정보"임을 증명 | Medium | 683건 이혼 판례 검색 가능 (2026 최신 포함) |
| 면책 고지 (Disclaimer) | 규제 요건 + 사용자 신뢰. 없으면 변호사법 위반 리스크 | Low | 모든 페이지, 분석 결과 상단에 고정 노출 |
| 변호사 상담 CTA | NexusAI·Law&Bot 모두 "변호사 상담 권유" 포함 | Low | 로톡·법률구조공단 링크 등 외부 연결 |
| 모바일 반응형 UI | 이혼 고민자는 PC보다 모바일에서 검색. 경쟁 서비스 전부 모바일 지원 | Medium | 375px min-width, 48px 터치타겟 |
| 익명 사용 (비로그인) | 민감 정보 입력 거부감 해소. PIPA 민감정보 최소 수집 원칙 | Low | Firebase 익명 인증. 저장 시에만 동의 요청 |
| 출처 명시 | NexusAI 주요 차별화 포인트. "AI가 만들어낸 말"이 아님을 증명 | Low | 법령 조문 번호 + 판례 번호 직접 링크 |

---

## Differentiators

경쟁 서비스에 없거나 약한 기능. 이 플랫폼의 실제 가치 제안.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 변호사 질문 목록 생성 | 가장 명확한 "상담 준비 도구" 차별화. 법적 결론 없이 순수 준비 지원 | Medium | "변호사에게 꼭 물어봐야 할 질문 5가지" 형태. 상황 맞춤 생성 |
| DV 안전 UX (긴급 탈출) | Law&Bot·NexusAI 모두 없음. 가정폭력 상황 사용자 안전 보호 | Low-Medium | 상단 고정 "사이트 나가기" 버튼 → 날씨 페이지로 redirect + 탭 교체. 1366 연결 링크 |
| 학대 감지 → 안전 브랜치 | 업계 전례 없음. 사용자가 DV 피해자임을 암시하는 입력 시 안전 정보 우선 노출 | High | Claude가 상황 입력 텍스트에서 위험 신호 감지. 별도 안전 정보 화면으로 분기 |
| 위저드형 상황 수집 | 자유 질문 챗봇(Law&Bot) 대비 구조화된 입력. 더 정확한 분석 가능 | Medium | 단계별 진행: 결혼 기간 → 자녀 → 재산 → 이혼 사유 → 폭력 여부. faultParty 필드 제거 (Claude가 상황에서 분석) |
| 즉시 전체삭제 기능 | PIPA 민감정보 특성상 사용자 통제권 강조. 경쟁 서비스 없음 | Low | 1클릭으로 모든 입력/분석 데이터 삭제 |
| 세션 저장 + 재방문 | 이혼 결정은 즉각적이지 않음. 여러 세션에 걸쳐 준비 | Medium | Google 로그인 시 저장. 익명이면 로컬 스토리지만 |
| AI 쉬운 말 변환 | 법령·판례는 어려운 한자어. 일반인이 이해할 수 있는 요약 | Medium | Claude API — 원문 보존 + 쉬운 말 요약 병렬 제공 |
| 쟁점 우선순위 표시 | "이 상황에서 가장 중요한 쟁점 순서" — 준비 집중도 향상 | Medium | 단순 나열 아닌 중요도 순 정렬. 복잡도에 따른 추가 설명 |

---

## Anti-Features

의도적으로 만들지 않을 기능. 규제 위반 또는 포지셔닝 훼손.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| 재산분할/위자료 금액 예측 | 변호사법 109조 위반 최고 리스크. "○○만원 받을 수 있습니다"는 법적 결론 | "재산분할 관련 쟁점이 있습니다 → 변호사 상담 필요" 형태로 쟁점만 제시 |
| "이혼 가능성 %" 또는 승소율 | 법적 추론 생성 = 변호사법 위반. 대법원 로폼 판결은 "표준 서식 제공"에 한정 | 관련 판례 경향 요약 (통계 아닌 정보) |
| AI 이혼 소장 자동 작성 | 변호사법 109조 위반 소지 최대. "사건에 관한 법률 관계 문서 작성" 직접 해당 | 법원 제출 서류 종류 안내 + 법률구조공단 연결 |
| 변호사 매칭/중개 | 로톡과 직접 경쟁. MVP 범위 초과. 법무사법·변호사법 중개업 규정 복잡 | 로톡 외부 링크 CTA로 대체 |
| 챗봇 자유 질문 답변 | Law&Bot과 동일해짐. "챗봇이 아닌 워크스페이스" 포지셔닝 훼손 | 구조화된 위저드 입력 → 분석 리포트 형태 유지 |
| 배우자 정보 입력 요구 | PIPA — 제3자 개인정보는 별도 동의 필요. 수집 자체가 법적 위험 | 배우자 상황은 사용자 관점에서만 수집 ("배우자가 어떻게 행동했나요?" 형태) |
| AI 학습에 사용자 데이터 활용 | 이혼 상황 = PIPA 민감정보. AI 학습 미활용 명시 필수 | 명시적 "AI 학습에 사용되지 않습니다" 고지 |
| PDF 다운로드 (v1) | 개인 법률 정보 파일화 → PIPA 부담 증가. 브라우저 인쇄로 충분 | 브라우저 인쇄 (Ctrl+P) 유도. v1.1 이후 재검토 |
| 이혼 외 법률 영역 확장 (v1) | 포커스 분산. MVP 완성도 희생 | 이혼 특화 완성 후 v2에서 확장 |

---

## Feature Dependencies

```
상황 입력 위저드
  └→ AI 쟁점 분석 엔진 (블로킹 의존성 — 입력 없으면 분석 불가)
       ├→ 쟁점 체크리스트 (분석 결과 기반)
       ├→ 관련 법령 표시 (법제처 API 호출)
       ├→ 유사 판례 표시 (대법원 판례 검색)
       ├→ 변호사 질문 목록 (분석 결과 기반)
       └→ AI 쉬운 말 변환 (법령/판례 텍스트 → Claude 변환)

Firebase 익명 인증
  └→ 세션 저장 (익명: 로컬스토리지 / 로그인: Firestore)

DV 안전 UX (독립 기능 — 다른 기능과 병렬)
  ├→ 긴급 탈출 버튼 (페이지 로드 즉시 노출)
  └→ 학대 감지 → 안전 브랜치 (상황 입력 위저드에서 분기)

면책 고지 (독립 UI 컴포넌트 — 전 페이지 공통)
```

---

## MVP Recommendation

### Must-Ship (Phase 1-2)
이 없으면 제품이 성립하지 않는 최소 단위:

1. **상황 입력 위저드** — 결혼 기간, 자녀, 재산 현황, 이혼 사유 단계별 수집
2. **AI 쟁점 분석** — 협의/재판 이혼 판단 + 주요 쟁점 목록 (재산분할/양육권/위자료)
3. **관련 법령 + 판례 표시** — 법제처 API + 쉬운 말 변환
4. **변호사 질문 목록** — 핵심 차별화 기능
5. **면책 고지 + 변호사 CTA** — 규제 요건, 모든 페이지
6. **DV 안전 UX** — 긴급 탈출 버튼 + abuse 감지 브랜치 (사용자 안전)
7. **익명 사용 + 즉시 삭제** — PIPA 준수

### Defer Post-MVP
- 세션 저장 + 재방문 (Google 로그인) — v1.1
- 쟁점 우선순위 세부 조정 — v1.1
- PDF 다운로드 — v1.1 이후 재검토

---

## Complexity Reference

| Level | Definition |
|-------|-----------|
| Low | 1-2일 이내 구현 가능. 표준 React 컴포넌트 |
| Medium | 3-7일. API 통합 또는 상태 관리 필요 |
| High | 1-2주+. 설계 의사결정 필요, 엣지케이스 많음 |

---

## Sources

- 빅케이스 기능: https://bigcase.ai/ (HIGH — 공식 사이트 직접 확인)
- 슈퍼로이어 기능: https://www.etnews.com/20240701000024 (MEDIUM — 출시 공식 발표)
- NexusAI ailawbot: https://ailawbot.kr/ (HIGH — 공식 사이트 직접 확인)
- Law&Bot (Law&Good): https://www.legalbusinessonline.com/other-news/south-korea%E2%80%99s-dr-aju-launches-legal-ai-qa-chatbot (MEDIUM)
- 대법원 로폼 판결 2025.2: https://www.lawtimes.co.kr/news/articleView.html?idxno=218044 (HIGH — 법률신문 공식 보도)
- 변호사법 109조 AI 서비스 경계: https://www.lawtimes.co.kr/news/197014 (MEDIUM)
- DV Quick Exit UX: https://www.oomphinc.com/insights/user-safety-quick-exit-best-practices/ (HIGH)
- PIPA 민감정보: https://pandectes.io/blog/an-overview-of-south-koreas-personal-information-protection-act-pipa/ (HIGH)
- 이혼 상담 준비 항목: https://www.expatkidskorea.com/article/이혼전문변호사-선임절차-및-비용-총정리 + 법무법인 대륜 상담 정보 (MEDIUM)
- 빅케이스 출처: ZDNet https://zdnet.co.kr/view/?no=20220125095204 (HIGH)
