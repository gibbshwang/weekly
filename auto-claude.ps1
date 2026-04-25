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

    # 시그널 파일 감시를 백그라운드 job으로 실행
    # Claude 프로세스 시작 전에 job을 먼저 띄움
    $watcherJob = Start-Job -ScriptBlock {
        param($sigRotate, $sigStop)
        while ($true) {
            if ((Test-Path $sigRotate) -or (Test-Path $sigStop)) {
                # 시그널 감지 — Claude Code 프로세스를 찾아서 종료
                # Windows에서는 ``claude.exe`` 로 직접 실행됨
                # (이전 버전은 node.exe만 찾아서 kill이 안 됐던 버그)
                # node.exe도 fallback으로 매칭 — 다른 OS / 변형 install layout 대비
                Get-CimInstance Win32_Process |
                    Where-Object {
                        $_.Name -eq 'claude.exe' -or
                        ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'claude-code|@anthropic-ai')
                    } |
                    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
                # 텔레그램 플러그인 (bun) 도 함께 종료
                Get-CimInstance Win32_Process |
                    Where-Object { $_.Name -eq 'bun.exe' -and $_.CommandLine -match 'claude' } |
                    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
                return 'signal-detected'
            }
            Start-Sleep -Seconds 3
        }
    } -ArgumentList $sigRotate, $sigStop

    # Claude를 현재 콘솔에서 직접 실행 (포그라운드)
    # Start-Process 대신 & 연산자를 사용해야 터미널 I/O가 정상 동작
    & claude --channels 'plugin:telegram@claude-plugins-official' `
        --dangerously-skip-permissions `
        --disallowedTools 'AskUserQuestion,EnterPlanMode' `
        --append-system-prompt $autoRecoveryPrompt

    # Claude 종료 후 백그라운드 watcher 정리
    Stop-Job -Job $watcherJob -ErrorAction SilentlyContinue
    Remove-Job -Job $watcherJob -Force -ErrorAction SilentlyContinue

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
