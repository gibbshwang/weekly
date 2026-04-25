# auto-claude-watcher.ps1 — 시그널 파일 감시 및 claude.exe 강제 종료
#
# auto-claude.ps1이 별도 PowerShell 프로세스로 spawn하는 watcher.
# Start-Job 패턴을 대체하기 위해 도입 — Job worker가 silent fail해서
# 시그널 감지/Stop-Process가 누락되던 P0 이슈 (SESSION-HANDOFF.md 참조).
#
# 인자:
#   -WrapperPid : wrapper PowerShell의 PID (claude.exe 식별용 — wrapper 자손만 죽임)
#   -SigRotate  : /tmp/claude-exit-signal 절대 경로 (재시작용)
#   -SigStop    : /tmp/claude-stop-signal 절대 경로 (완전 종료용)
#
# 동작:
#   - 1초마다 polling
#   - wrapper가 살아있는지 확인 (죽었으면 watcher도 종료)
#   - 시그널 파일 감지 시 wrapper 자손 claude.exe + bun.exe(claude 매치) 강제 종료
#   - 디버그 로그: %TEMP%\claude-watcher.log

param(
    [Parameter(Mandatory=$true)][int]$WrapperPid,
    [Parameter(Mandatory=$true)][string]$SigRotate,
    [Parameter(Mandatory=$true)][string]$SigStop
)

$logFile = Join-Path $env:TEMP 'claude-watcher.log'

function Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    "[$ts] $msg" | Out-File -Append -FilePath $logFile -Encoding utf8
}

Log "=== watcher started ==="
Log "WrapperPid=$WrapperPid SigRotate=$SigRotate SigStop=$SigStop"

while ($true) {
    if (-not (Get-Process -Id $WrapperPid -ErrorAction SilentlyContinue)) {
        Log "wrapper PID $WrapperPid no longer running — watcher exiting"
        exit 0
    }

    $rotate = Test-Path $SigRotate
    $stop = Test-Path $SigStop

    if ($rotate -or $stop) {
        $kind = if ($stop) { 'STOP' } else { 'ROTATE' }
        Log "$kind signal detected"

        # wrapper 자손 claude.exe만 골라 죽임 (Claude Desktop App 등 다른 claude.exe는 보호)
        $targets = Get-CimInstance Win32_Process |
            Where-Object {
                $_.Name -eq 'claude.exe' -and $_.ParentProcessId -eq $WrapperPid
            }

        if ($targets) {
            foreach ($t in $targets) {
                Log "killing claude.exe PID=$($t.ProcessId) (parent=$WrapperPid)"
                $tk = & taskkill /T /F /PID $t.ProcessId 2>&1
                Log "taskkill output: $tk"
            }
        } else {
            Log "WARN: no claude.exe child of wrapper PID $WrapperPid found"
            # fallback: 이름만으로 매칭 (Claude Desktop App은 권한 보호로 어차피 못 죽임)
            Get-CimInstance Win32_Process |
                Where-Object {
                    $_.Name -eq 'claude.exe' -and $_.CommandLine -match '@anthropic-ai|claude-code'
                } |
                ForEach-Object {
                    Log "fallback kill claude.exe PID=$($_.ProcessId)"
                    & taskkill /T /F /PID $_.ProcessId 2>&1 | Out-Null
                }
        }

        # bun.exe (telegram plugin) 도 함께 정리
        Get-CimInstance Win32_Process |
            Where-Object {
                $_.Name -eq 'bun.exe' -and $_.CommandLine -match 'claude'
            } |
            ForEach-Object {
                Log "killing bun.exe PID=$($_.ProcessId)"
                Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            }

        Log "watcher done — exit"
        exit 0
    }

    Start-Sleep -Seconds 1
}
