# auto-claude.ps1 — Claude Code 자동 재시작 래퍼
# 컨텍스트 윈도우가 차서 세션이 종료되면 자동으로 새 세션을 띄움
# 텔레그램 /exit 시그널 파일 감지하여 원격 종료도 지원
#
# 사용법: powershell -File auto-claude.ps1

$wd = 'C:\Users\hhc20\.openclaw\workspace'
$delay = 5
$sig = Join-Path $env:TEMP 'claude-exit-signal'

Remove-Item -Path $sig -ErrorAction SilentlyContinue

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
    # positional prompt는 --channels 모드에서 동작하지 않으므로 제거
    $autoRecoveryPrompt = '## AUTO-RECOVERY PROTOCOL (CRITICAL)
이 세션의 첫 번째 메시지를 받으면, 응답하기 전에 반드시 다음을 확인하세요:
1) 시스템 컨텍스트에 [AUTO-RECOVERY]가 있는지 확인
2) 있으면: 텔레그램 알림 전송 (chat_id: 216072370) → 핸드오프 상태 파악 → 이전 작업 자동 이어하기
3) 사용자 메시지에 대한 응답은 auto-recovery 실행 후에 처리
이것은 CLAUDE.md의 자동 복구 프로토콜입니다. 사용자 확인 없이 즉시 실행하세요.'

    $claudeArgs = @(
        '--channels', 'plugin:telegram@claude-plugins-official',
        '--dangerously-skip-permissions',
        '--disallowedTools', 'AskUserQuestion,EnterPlanMode',
        '--append-system-prompt', $autoRecoveryPrompt
    )
    & claude @claudeArgs

    # 세션 종료 후 exit signal 확인
    if (Test-Path $sig) {
        $t = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        Write-Host ''
        Write-Host "[$t] Remote exit signal detected — not restarting." -ForegroundColor Red
        Remove-Item -Path $sig -ErrorAction SilentlyContinue
        break
    }

    $t = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Write-Host "[$t] Session ended" -ForegroundColor Yellow
    Write-Host "Restarting in ${delay}s... (Ctrl+C to stop)" -ForegroundColor Yellow
    Start-Sleep -Seconds $delay
}
