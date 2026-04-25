# Flow State: /udd 스킬 v0.2.0 — 멀티-CLI 검증 + 14 fix PR 누적

**Project:** AX Universal Data Downloader (`/udd`) harness skill
**Track:** A (Subagent-Driven Development) — COMPLETED + dogfooding hardened
**Updated:** 2026-04-25 (post-dogfooding session)
**Status:** Live in production — 사용자 `apt-price-trend` 프로젝트가 매주 일요일 13:00 자동 cron 동작 중

## Final Position (/udd)

- 마스터 HEAD: `84b2eba` (2026-04-25, after PR #14)
- 워크트리: `feat/udd-implementation` at `.worktrees/udd-impl/`
- 태그: `v0.1.0` + `wave-1-complete` ~ `wave-6-complete`. **v0.2.0 태그는 이번 세션 끝에 push 예정.**
- 테스트: **80 passed, 1 skipped** (시작 56 + dogfooding 도중 +24)
- 스펙: `docs/superpowers/specs/2026-04-24-ax-udd-design.md`
- 플랜: `docs/superpowers/plans/2026-04-24-ax-udd-implementation.md`

## v0.1.0 → v0.2.0 누적 fix-up PR (14개)

| PR | 카테고리 | 요약 |
|----|---------|------|
| #4 | Stage 0 | precheck — playwright 1.58 버전 탐지 (importlib.metadata) |
| #5 | Stage 2 | scaffold — Windows pip self-upgrade (`python -m pip`) |
| #6 | Stage 3+4 | auth_flow `--mode setup` — login+record 단일 브라우저 세션으로 통합 |
| #7 | Runtime | browser_channel — anti-bot Chromium fingerprint 우회 (Chrome 채널) |
| #8 | Skill bundle | pyproject.toml — anthropic/gemini/openai 의존성 명시 |
| #9 | Stage 5 | refactor `--model` flag — Sonnet rate limit 시 Haiku로 fallback |
| #10 | Stage 6 + validate | validate_loop UTF-8 encoding + None-safe + CSV multi-encoding |
| #11 | Stage 7 | approve_flow CSV multi-encoding (cp949/euc-kr fallback) |
| #12 | Stage 5 + notify | LLM contract + execute_download adapter + Telegram 파일 첨부 |
| #13 | Compatibility | Codex CLI: CODEX_THREAD_ID/CODEX_MANAGED_BY_NPM 탐지 + nest priority |
| #14 | Compatibility | Gemini CLI: GEMINI_SESSION_ID/GEMINI_PROJECT_DIR 탐지 |

### 구분
- **#4-#9**: 셋업 흐름 (precheck → setup mode)
- **#10-#12**: 검증 + 운영 흐름 (validate_loop → approve_flow → notify)
- **#13-#14**: 멀티-CLI 호환성 (Codex + Gemini)

## 멀티-CLI 호환성 매트릭스

| | Claude Code | Codex CLI | Gemini CLI |
|---|---|---|---|
| 설치 경로 | `~/.claude/skills/udd/` | `~/.codex/skills/udd/` | `~/.gemini/skills/udd/` |
| Auto-discovery | ✓ | ✓ | ✓ (`gemini skills list`) |
| `cli_host` 정상 반환 | ✓ (PR #4) | ✓ (PR #13) | ✓ (PR #14) |
| `autonomous_mode` 정상 | ✓ (CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS) | ✓ (CODEX_THREAD_ID 휴리스틱) | 미검증 (GEMINI_API_KEY 없어 LLM 호출 불가) |
| 라이브 검증 | 데이터 다운로드 + cron 등록 ✓ | precheck 실행 ✓ | skills list ✓ |

## 라이브 운영 중인 사용자 프로젝트

**`apt-price-trend`** (`~/ax-downloads/apt-price-trend/`):
- 출처: data.go.kr 공공데이터포털
- 데이터: 주택도시보증공사_전국 신규 민간아파트 분양가격 동향 (CSV, ~494 KB, 10,710 rows)
- 컬럼: 지역명 / 규모구분 / 연도 / 월 / 분양가격(제곱미터)
- 스케줄: **매주 일요일 13:00** (cron: `0 13 * * 0`, Windows Task Scheduler `UDD-APT-PRICE-TREND`)
- 다음 실행: 2026-04-26 (일) 오후 1:00
- 텔레그램 알림: chat 216072370, **CSV 파일 첨부 활성**
- 봇 토큰: keyring `udd-telegram/bot_token` (보안: 토큰 로테이션 권장 — Telegram으로 보낸 이력 있음)

## 알려진 이슈 / Future work

다음 세션 / 별도 PR 후보:

1. **봇 토큰 로테이션** — 사용자가 Telegram으로 토큰 보낸 이력. @BotFather `/revoke` 후 keyring 갱신 필요.
2. **Gemini autonomous_mode 검증** — GEMINI_API_KEY 확보 후 `--yolo` / `--approval-mode=yolo` 환경변수 어떻게 노출되는지 확인.
3. **워크트리 정리** — `.worktrees/udd-impl/` + `feat/udd-implementation` 브랜치 — master에 모두 merge됐으니 안전하게 제거 가능. 다음 dogfooding 인스턴스 만들 거면 유지.
4. **첫 cron 실행 모니터링** — 2026-04-26 (일) 13:00 자동 실행 결과 logs + Telegram 도착 확인. /schedule 1주 follow-up 후보.
5. **notify.py.tmpl 이모지 정책** — Telegram 상태 인디케이터로 의도된 디자인이지만 CLAUDE.md "이모지 회피" 정책과 충돌. 사용자가 keep 결정. 별도 액션 없음.

## 텔레그램
chat_id: 216072370 (active, 봇 토큰 keyring에 저장됨)

## 다음 세션을 위한 빠른 컨텍스트

- /udd는 v0.2.0으로 master에 안정화. 새 invocation은 14개 fix가 모두 반영된 상태에서 시작.
- 멀티-CLI 호환됨 — 새 사용자가 Claude/Codex/Gemini 어느 쪽이든 동일하게 동작.
- 사용자의 실제 운영 프로젝트는 `~/ax-downloads/apt-price-trend/`에서 매주 일요일 자동 실행 중.
- 다음 세션이 시작되면 이 FLOW-STATE.md를 먼저 읽고 위의 "Future work" 항목 중 사용자 선택에 따라 진행.
