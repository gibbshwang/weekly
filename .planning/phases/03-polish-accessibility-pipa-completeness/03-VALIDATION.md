---
phase: 3
slug: polish-accessibility-pipa-completeness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + @testing-library/react 16.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --config ./vitest.config.ts --root .` |
| **Full suite command** | `npx vitest run --config ./vitest.config.ts --root .` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --config ./vitest.config.ts --root .`
- **After every plan wave:** Run `npx vitest run --config ./vitest.config.ts --root .`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | UI-01 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | UI-02 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | UI-03 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | UI-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | UI-05 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | PRIV-03 | — | Firebase user + data deleted on request | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | PRIV-05 | — | PIPA consent gate blocks step progression | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for responsive layout assertions (UI-01, UI-02)
- [ ] Test stubs for keyboard navigation and ARIA assertions (UI-03, UI-04, UI-05)
- [ ] Test stubs for data deletion API (PRIV-03)
- [ ] Test stubs for PIPA consent gate (PRIV-05)

*Existing Vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 375px visual layout | UI-01 | Visual rendering requires browser | Open dev tools → 375px viewport → check wizard + results |
| Color contrast ratio | UI-04 | Computed styles need browser | Use axe DevTools or contrast checker on deployed site |
| Screen reader flow | UI-05 | Requires assistive tech | Test with VoiceOver/NVDA on wizard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
