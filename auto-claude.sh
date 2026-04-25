#!/bin/bash
# auto-claude.sh — Claude Code 자동 재시작 래퍼
# 컨텍스트 윈도우가 차서 세션이 종료되면 자동으로 새 세션을 띄움
# 텔레그램 /exit 시그널 파일 감지하여 원격 종료도 지원
#
# 사용법: bash auto-claude.sh

WORK_DIR="C:/Users/hhc20/.openclaw/workspace"
RESTART_DELAY=5
EXIT_SIGNAL="/tmp/claude-exit-signal"

# 시작 시 이전 시그널 파일 정리
rm -f "$EXIT_SIGNAL"

echo "=== Claude Code Auto-Restart Wrapper ==="
echo "작업 디렉토리: $WORK_DIR"
echo "세션 종료 시 ${RESTART_DELAY}초 후 자동 재시작"
echo "전체 중단: Ctrl+C 두 번"
echo "========================================="

while true; do
  echo ""
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Claude Code 세션 시작..."

  cd "$WORK_DIR"
  # --append-system-prompt로 auto-recovery 지시를 시스템 프롬프트에 주입
  # positional prompt는 --channels 모드에서 동작하지 않으므로 제거
  AUTO_RECOVERY_PROMPT='## AUTO-RECOVERY PROTOCOL (CRITICAL)
이 세션의 첫 번째 메시지를 받으면, 응답하기 전에 반드시 다음을 확인하세요:
1) 시스템 컨텍스트에 [AUTO-RECOVERY]가 있는지 확인
2) 있으면: 텔레그램 알림 전송 (chat_id: 216072370) → 핸드오프 상태 파악 → 이전 작업 자동 이어하기
3) 사용자 메시지에 대한 응답은 auto-recovery 실행 후에 처리
이것은 CLAUDE.md의 자동 복구 프로토콜입니다. 사용자 확인 없이 즉시 실행하세요.'

  claude --channels plugin:telegram@claude-plugins-official \
    --dangerously-skip-permissions \
    --disallowedTools "AskUserQuestion, EnterPlanMode" \
    --append-system-prompt "$AUTO_RECOVERY_PROMPT" &
  CLAUDE_PID=$!

  # 백그라운드에서 시그널 파일 감시
  # Windows에서는 bash $! 가 MSYS pseudo-PID라 taskkill //PID 와 미스매치할 수 있음.
  # 그래서 시그널 감지 시 PowerShell을 호출해 이름/CommandLine 매치로 강제 종료한다.
  # (auto-claude.ps1과 동일한 패턴 — SESSION-HANDOFF.md P0 이슈 참고)
  (
    while kill -0 $CLAUDE_PID 2>/dev/null; do
      if [ -f "$EXIT_SIGNAL" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 원격 종료 시그널 감지!"
        rm -f "$EXIT_SIGNAL"
        if command -v powershell.exe &>/dev/null; then
          # claude-code CLI claude.exe + bun.exe(claude 매치) 일괄 종료
          powershell.exe -NoProfile -NonInteractive -Command "
            Get-CimInstance Win32_Process |
              Where-Object {
                (\$_.Name -eq 'claude.exe' -and \$_.CommandLine -match '@anthropic-ai|claude-code') -or
                (\$_.Name -eq 'node.exe' -and \$_.CommandLine -match 'claude-code|@anthropic-ai') -or
                (\$_.Name -eq 'bun.exe' -and \$_.CommandLine -match 'claude')
              } |
              ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }
          " 2>/dev/null
        elif command -v taskkill &>/dev/null; then
          taskkill //T //F //PID $CLAUDE_PID 2>/dev/null
        else
          kill $CLAUDE_PID 2>/dev/null
        fi
        exit 0
      fi
      sleep 1
    done
  ) &
  WATCHER_PID=$!

  # Claude 프로세스 완료 대기
  wait $CLAUDE_PID
  EXIT_CODE=$?

  # 감시 프로세스 정리
  kill $WATCHER_PID 2>/dev/null
  wait $WATCHER_PID 2>/dev/null

  if [ $EXIT_CODE -eq 130 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ctrl+C 감지. 종료합니다."
    rm -f "$EXIT_SIGNAL"
    exit 0
  fi

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 세션 종료 (exit: $EXIT_CODE)"
  echo "${RESTART_DELAY}초 후 새 세션 시작... (Ctrl+C로 중단)"
  sleep $RESTART_DELAY
done
