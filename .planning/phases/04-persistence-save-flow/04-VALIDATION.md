---
phase: 4
slug: persistence-save-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | AUTH-02 | T-04-01 | PIPA consent modal blocks save without consent | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | AUTH-02 | T-04-02 | linkWithCredential preserves anonymous UID | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | AUTH-02 | T-04-03 | Firestore write requires valid auth token | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | AUTH-02 | T-04-04 | Session deletion removes Firestore docs | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/api/sessions/__tests__/route.test.ts` — stubs for session CRUD
- [ ] `src/components/results/__tests__/SaveConsentDialog.test.tsx` — consent modal tests
- [ ] `src/components/results/__tests__/SaveButton.test.tsx` — save button flow tests

*Existing vitest infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth popup flow | AUTH-02 | Requires real Google OAuth in browser | Click "저장하기" → consent → Google popup → verify Firestore write |
| linkWithCredential UID preservation | AUTH-02 | Requires real Firebase Auth | Verify anonymous UID matches authenticated UID after linking |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
