---
phase: 2
slug: wizard-ui-analysis-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | sentiment-pulse/vitest.config.ts |
| **Quick run command** | `cd sentiment-pulse && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd sentiment-pulse && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd sentiment-pulse && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd sentiment-pulse && npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | INTAKE-01 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | INTAKE-02 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | INTAKE-03 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | INTAKE-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | ANALYSIS-01 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | ANALYSIS-02 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | ANALYSIS-03 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 1 | ANALYSIS-04 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-05 | 02 | 1 | ANALYSIS-05 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-06 | 02 | 1 | ANALYSIS-06 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | LEGAL-01 | — | 법적 결론 차단 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | LEGAL-02 | — | 출처 표시 필수 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 2 | LEGAL-03 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-03-04 | 03 | 2 | LEGAL-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 1 | SAFE-04 | — | DV 안전 분기 표시 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `sentiment-pulse/src/__tests__/wizard/` — wizard component test stubs
- [ ] `sentiment-pulse/src/__tests__/results/` — results display test stubs
- [ ] react-hook-form + @hookform/resolvers 설치

*Existing infrastructure covers test framework (vitest already configured in Phase 1).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 스트리밍 UI 실시간 표시 | ANALYSIS-01 | SSE 스트리밍은 브라우저 환경 필요 | 위저드 제출 후 결과가 순차 표시되는지 확인 |
| 모바일 터치 상호작용 | INTAKE-01 | 실 디바이스 필요 | 375px 뷰포트에서 위저드 단계 이동 테스트 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
