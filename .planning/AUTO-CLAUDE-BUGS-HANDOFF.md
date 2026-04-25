# auto-claude.ps1 + Telegram MCP — 두 가지 버그 진단

**Reported:** 2026-04-25, 사용자 텔레그램 메시지로 보고
**Source file:** `C:\Users\hhc20\.openclaw\workspace\auto-claude.ps1`

## 버그 1: 텔레그램 /exit 시 세션 종료/재시작 안 됨

### 근본 원인
auto-claude.ps1의 watcher job (line 40-57)이 `node.exe` 프로세스를 찾고 있는데, **Windows의 Claude Code는 `claude.exe`로 실행됨**.

확인된 실제 프로세스 (PID 35360):
```
Name: claude.exe
CL: "C:\Users\hhc20\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe" --channels plugin:telegram@claude-plugins-official ...
```

watcher의 현재 필터 (auto-claude.ps1 line 47):
```powershell
Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'claude-code|@anthropic-ai' }
```

→ `node.exe` 프로세스만 매칭 → `claude.exe`는 절대 잡히지 않음 → Stop-Process 안 됨 → 세션 살아있음

### Fix
watcher를 `claude.exe` 또는 OR 패턴으로 변경:

```powershell
$procs = Get-CimInstance Win32_Process | Where-Object {
    ($_.Name -eq 'claude.exe') -or
    ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'claude-code|@anthropic-ai')
}
$procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
```

또는 더 robust하게 — 부모-자식 관계까지 잡아서 자식까지 다 죽이기 (claude.exe가 spawn한 bun.exe 등).

### 부수 발견: 좀비 process 누적
`gemini skills link` 백그라운드 호출이 cleanup 안 돼서 4개 PID 누적 (23780, 18664, 29616, 15760 = `node.exe ... gemini.js skills link`). cleanup 로직 검토 필요.

## 버그 2: 텔레그램 MCP 통신이 끊김

### 증상
- 세션 중간에 plugin:telegram MCP가 disconnect
- 한 번 끊기면 세션 종료까지 복구 안 됨
- 이번 세션 끝에 시스템 알림: "MCP servers have disconnected: plugin:telegram:telegram"

### 가능한 원인
1. **Plugin (bun.exe) 프로세스 자체가 죽음** — 메모리/exception/timeout
2. **Stdio pipe 끊김** — Claude Code가 plugin과 통신하는 stdio가 깨짐
3. **장시간 idle** — 일정 시간 메시지 없으면 plugin이 자동 종료
4. **PowerShell wrapper의 watcher job이 잘못 죽임** — 버그 1의 watcher가 `bun.exe ... claude` 매칭하는 라인이 있음 (line 51). 시그널 파일이 *우연히* 존재하거나 detection 시점이 어긋나면 정상 plugin을 죽일 수도 있음.

### 진단 단계 (다음 세션)
1. 현재 bun.exe 프로세스가 실행 중인지 체크 (이번 세션에서는 disconnect 시점에 죽었는지 살아있었는지 모름)
2. plugin의 로그 확인: `~/.claude/plugins/` 또는 `~/.claude/channels/` 아래 stderr 파일
3. 마지막 healthy 시점 로그 vs disconnect 시점 로그 비교
4. plugin 프로세스를 외부에서 모니터링 — 죽으면 자동 재기동하는 supervisor 추가 검토

### Fix 후보
A. **Plugin auto-restart**: auto-claude.ps1에 plugin-watch 또는 별도 supervisor job 추가. bun.exe ... claude가 죽으면 즉시 재시작.
B. **Heartbeat probe**: Claude가 주기적으로 plugin에 ping 보내고 timeout이면 reconnect 시도.
C. **Plugin 자체 안정화**: openclaw telegram plugin source 검토 — exception handling 보강.

## 다음 세션 작업 우선순위

1. **버그 1 fix** (auto-claude.ps1 watcher 패턴): 작은 수정, 즉시 테스트 가능. 5분 작업.
2. **버그 2 진단** (Telegram disconnect): plugin log + bun.exe lifecycle 추적 필요. 30분~ 작업.
3. **PR 만들어 master에 반영** — auto-claude.ps1은 메인 워크스페이스 파일이라 PR 흐름 동일.

## 검증 방법

버그 1 fix 후:
1. `powershell -File auto-claude.ps1`로 새 세션 시작
2. Claude Code 안에서 텔레그램 /exit 흐름 트리거 (시그널 파일 생성)
3. watcher가 `claude.exe` 잡아서 kill → 세션 종료 → 5초 후 자동 재시작 확인
4. 새 세션에서 auto-recovery 정상 동작 확인 (FLOW-STATE 읽기)

버그 2 진단:
1. plugin/channel log path 찾기
2. 의도적으로 idle 1시간 두고 disconnect 재현
3. 그 시점 log + 프로세스 상태 캡처 → 원인 분류
