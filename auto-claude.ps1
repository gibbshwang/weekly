# auto-claude.ps1 — Claude Code 자동 재시작 래퍼
# 컨텍스트 윈도우가 차서 세션이 종료되면 자동으로 새 세션을 띄움
# 텔레그램 /exit 시그널 파일 감지하여 원격 종료도 지원
#
# 사용법: powershell -File auto-claude.ps1

$wd = 'C:\Users\hhc20\.openclaw\workspace'
$delay = 5
$sigRotate = Join-Path $env:TEMP 'claude-exit-signal'
$sigStop = Join-Path $env:TEMP 'claude-stop-signal'

Remove-Item -Path $sigRotate -ErrorAction SilentlyContinue
Remove-Item -Path $sigStop -ErrorAction SilentlyContinue

Write-Host '=== Claude Code Auto-Restart Wrapper ===' -ForegroundColor Cyan
Write-Host "Work Dir: $wd"
Write-Host "Auto-restart after ${delay}s"
Write-Host 'Remote exit: Telegram /exit'
Write-Host 'Stop: Ctrl+C twice'
Write-Host '=========================================' -ForegroundColor Cyan

Set-Location -Path $wd

while ($true) {
    $t = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Write-Host "[$t] Starting Claude Code session..." -ForegroundColor Green

    # --append-system-prompt로 auto-recovery 지시를 시스템 프롬프트에 주입
    $autoRecoveryPrompt = @'
## AUTO-RECOVERY PROTOCOL (CRITICAL)
이 세션의 첫 번째 메시지를 받으면, 응답하기 전에 반드시 다음을 확인하세요:
1) 시스템 컨텍스트에 [AUTO-RECOVERY]가 있는지 확인
2) 있으면: 텔레그램 알림 전송 (chat_id: 216072370) → 핸드오프 상태 파악 → 이전 작업 자동 이어하기
3) 사용자 메시지에 대한 응답은 auto-recovery 실행 후에 처리
이것은 CLAUDE.md의 자동 복구 프로토콜입니다. 사용자 확인 없이 즉시 실행하세요.
'@

    # 시그널 파일 감시를 별도 PowerShell 프로세스로 spawn
    # 이전 버전은 Start-Job을 썼는데, Job worker가 silent fail하여
    # 시그널 감지/Stop-Process가 누락되는 P0 이슈가 있었음. (SESSION-HANDOFF.md 참고)
    # 별도 process로 띄우면 디버깅 가능 + 누락 위험 제거.
    $watcherScript = Join-Path $wd 'auto-claude-watcher.ps1'
    $watcherProc = Start-Process powershell.exe -PassThru -WindowStyle Hidden `
        -ArgumentList @(
            '-NoProfile', '-NonInteractive',
            '-File', $watcherScript,
            '-WrapperPid', $PID,
            '-SigRotate', $sigRotate,
            '-SigStop', $sigStop
        )

    # Claude를 현재 콘솔에서 직접 실행 (포그라운드)
    # Start-Process 대신 & 연산자를 사용해야 터미널 I/O가 정상 동작
    & claude --channels 'plugin:telegram@claude-plugins-official' `
        --dangerously-skip-permissions `
        --disallowedTools 'AskUserQuestion,EnterPlanMode' `
        --append-system-prompt $autoRecoveryPrompt

    # Claude 종료 후 watcher process 정리 (시그널 감지로 이미 죽었을 수도 있음)
    if ($watcherProc -and -not $watcherProc.HasExited) {
        Stop-Process -Id $watcherProc.Id -Force -ErrorAction SilentlyContinue
    }

    # 세션 종료 후 시그널 확인
    # claude-stop-signal = 완전 종료
    if (Test-Path $sigStop) {
        $t = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        Write-Host ''
        Write-Host "[$t] Stop signal detected — shutting down." -ForegroundColor Red
        Remove-Item -Path $sigStop -ErrorAction SilentlyContinue
        Remove-Item -Path $sigRotate -ErrorAction SilentlyContinue
        break
    }

    # claude-exit-signal = 세션 교체 (재시작)
    if (Test-Path $sigRotate) {
        $t = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        Write-Host ''
        Write-Host "[$t] Session rotate signal detected — restarting immediately." -ForegroundColor Cyan
        Remove-Item -Path $sigRotate -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        continue
    }

    $t = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Write-Host "[$t] Session ended" -ForegroundColor Yellow
    Write-Host "Restarting in ${delay}s... (Ctrl+C to stop)" -ForegroundColor Yellow
    Start-Sleep -Seconds $delay
}
