# 5-Minute Supervision Cron Templates

이 문서는 Claude Code와의 협업 작업이 끊기지 않도록 관리/감독하기 위한 작업별 cron 템플릿 모음이다.

핵심 원칙:
- heartbeat는 가벼운 순찰용이다.
- 실제 장기 작업 감독은 **작업별 전용 cron**으로 한다.
- cron의 역할은 단순 리마인더가 아니라 **진행 상태 점검 + 재지시 + 보고 트리거**다.
- 작업이 끝나면 해당 cron은 반드시 제거한다.

---

## 운영 원칙

### 언제 5분 감독 cron을 켜는가
다음 조건 중 하나라도 해당하면 전용 5분 감독 cron을 건다.

- Claude Code와 협업하는 다단계 작업이 시작됨
- 30분 이상 이어질 가능성이 있는 작업임
- 중간 산출물 검수와 재지시가 중요함
- 마일스톤 완료 시점마다 보고가 필요함
- 사용자가 “흐름 끊기지 않게 관리하라”고 명시함

### cron이 해야 하는 일
각 5분 감독 cron은 아래를 점검해야 한다.

1. 작업이 실제로 진행 중인지
2. 최근 산출물/응답/상태 변화가 있는지
3. 막힘이 발생했는지
4. 내가 새 지시를 내려야 하는지
5. 중요한 마일스톤이 끝났는지
6. CEO에게 보고할 시점인지
7. 작업이 완료되었는지

### CEO 보고 시간 창

- CEO 사용자 가시 보고는 기본적으로 **Asia/Seoul 기준 08:00~23:00** 사이에만 보낸다.
- 그 외 시간에는 supervision, 재지시, 검수, 후속 준비 작업은 계속 수행할 수 있다.
- 야간에 의미 있는 진척이 생겨도 긴급하지 않다면 다음 허용 보고 시간까지 보류한다.
- 각 supervision cron 프롬프트에는 이 시간 규칙을 명시해서 야간에도 일이 계속되되, 인간의 수면 시간은 존중하도록 한다.

### cron이 하지 말아야 하는 일
- 이전 작업의 오래된 맥락을 끌고 와 새 작업처럼 굴지 말 것
- 단순히 “아직 진행 중”만 반복 보고하지 말 것
- 의사결정이 필요한데도 무의미한 자동 진행을 하지 말 것
- 작업 완료 후에도 cron을 방치하지 말 것

---

## 표준 상태 분류

각 점검 시 상태를 아래 중 하나로 분류한다.

- **ON_TRACK**: 정상 진행 중, 개입 불필요
- **NEEDS_NUDGE**: 작업이 느슨해짐, 가벼운 재지시 필요
- **BLOCKED**: 중요한 막힘 발생, 추가 정보/결정/우회 필요
- **MILESTONE_DONE**: 의미 있는 중간 산출물 완료, 보고 가치 있음
- **DONE**: 작업 완료, 최종 보고 후 cron 제거

---

## 표준 점검 프롬프트 템플릿

아래 템플릿은 작업별 cron의 핵심 프롬프트 골격이다.

```text
This is a 5-minute supervision check for an active workstream.

Task:
[작업명]

Goal:
[최종 목표]

Expected artifact or completion condition:
[완료 조건]

Current phase:
[현재 단계]

Supervision instructions:
1. Check whether the work is still moving.
2. Check whether Claude Code (or the active execution agent) produced meaningful progress since the last check.
3. If progress stalled, determine why.
4. If clarification or a tighter instruction is needed, issue it.
5. If a milestone has completed, prepare a concise report for the CEO.
6. If the task is complete, send the final update and remove this cron.
7. If no intervention is needed, do not create noise.

Output:
- status: ON_TRACK / NEEDS_NUDGE / BLOCKED / MILESTONE_DONE / DONE
- summary: one short paragraph
- next action: what I should do now
- report_needed: yes/no
```

---

## Template A — Monday candidate discovery supervision

### 목적
월요일 3-agent 리서치/기획/비판 검토 흐름이 멈추지 않도록 감독

### 권장 스케줄
- every 5 minutes
- sessionTarget: isolated
- payload.kind: agentTurn

### cron용 프롬프트 템플릿

```text
This is a 5-minute supervision check for Monday opportunity selection.

Workstream:
Run and supervise the Monday 3-agent flow:
- Agent One: market / AI news / monetizable opportunity research
- Agent Two: generate 10 launchable web-app candidates
- Agent Three: critically review and pressure-test the candidates

CEO expectation:
A concise Telegram report with the final 10 candidates, top recommendations, and a manager recommendation.

Your supervision job right now:
- Check whether the research/planning/review flow is still progressing.
- Identify which stage the workstream is currently in.
- If Agent Two or Three needs correction, clarification, tighter constraints, or re-research, issue it.
- If the final candidate list is ready, prepare the CEO report and mark the workstream complete.
- If the flow is blocked by a real decision, summarize the decision needed.
- If complete, stop monitoring cleanly.

Classify the current state as:
ON_TRACK / NEEDS_NUDGE / BLOCKED / MILESTONE_DONE / DONE

Return:
- current state
- what changed since last meaningful checkpoint
- next intervention
- whether the CEO should be updated now
```

---

## Template B — Tuesday PRD supervision

### 목적
선택된 아이템의 PRD 작성/수정/재검토가 끊기지 않도록 감독

### cron용 프롬프트 템플릿

```text
This is a 5-minute supervision check for Tuesday PRD development.

Workstream goal:
Produce a strong PRD for the CEO's selected weekly app idea.

The PRD must include:
- problem definition
- target user
- user flow
- MVP scope
- feature priorities
- monetization approach
- launch criteria
- initial data model outline

Supervision job:
- Check whether Claude Code is actively refining the PRD.
- Check whether the latest draft improved meaningfully.
- If the CEO gave feedback, ensure those revisions are actually being incorporated.
- If the draft is vague, bloated, or unfocused, force a tighter revision.
- If the PRD is strong enough for review, prepare a CEO report.
- If the CEO has requested revisions, keep the revision loop moving until approval.
- If the final PRD is approved, mark the workstream complete and stop monitoring.

Return:
- state classification
- strongest current progress point
- weakest unresolved area
- immediate next action
- whether to report upward now
```

---

## Template C — Wednesday UI supervision

### 목적
더미 데이터 기반 UI 구현이 멈추지 않도록 감독

```text
This is a 5-minute supervision check for Wednesday UI implementation.

Workstream goal:
Build the user-facing surface of the approved product using dummy data if needed.

Supervision job:
- Check whether the UI/screens/flows are being built.
- Check whether the visible product experience is becoming reviewable.
- If the output is visually inconsistent, incomplete, or off-PRD, correct it.
- Push toward a believable, reviewable user-facing prototype quickly.
- If a reviewable milestone is done, prepare a concise CEO update.
- If complete, stop the cron cleanly.

Return:
- state classification
- current UI milestone
- biggest weakness
- next managerial action
- whether a CEO update is warranted
```

---

## Template D — Thursday logic supervision

### 목적
핵심 로직, 상태 전이, API/동작 연결 구현이 끊기지 않도록 감독

```text
This is a 5-minute supervision check for Thursday logic implementation.

Workstream goal:
Make the approved UI actually function through core application logic and integration behavior.

Supervision job:
- Check whether the key actions and flows are being implemented behind the UI.
- Identify whether state handling, action flow, and integration assumptions are coherent.
- If work is drifting into overengineering, cut scope.
- If the main user journey is not yet functioning, push work back to the shortest path to a working flow.
- If a meaningful logic milestone is complete, prepare a CEO update.
- If complete, stop monitoring.

Return:
- state classification
- what logic path is now working
- what remains broken or unimplemented
- next action
- whether to report now
```

---

## Template E — Friday DB/stabilization supervision

### 목적
DB 스키마/데이터 레이어/안정화/배포 준비 흐름이 끊기지 않도록 감독

```text
This is a 5-minute supervision check for Friday data-layer and stabilization work.

Workstream goal:
Implement the DB schema and data layer required by the MVP, stabilize the product, and prepare it for release.

Supervision job:
- Check whether the persistence layer and schema work are progressing.
- Check whether integration bugs or structural mismatches were found.
- Prioritize launch stability over unnecessary feature additions.
- If critical blockers exist, identify the shortest viable workaround.
- If release readiness is reached, prepare the final CEO update and stop monitoring.

Return:
- state classification
- current release-readiness level
- top blocker or risk
- immediate next action
- whether a report is needed now
```

---

## Cron Job JSON Templates

아래는 등록 시 참고할 수 있는 예시 구조다.
실제 job 추가 시에는 해당 주간 작업 문맥에 맞게 문구를 채운다.

기본 주간 시작 규칙:
- 주간 운영은 기본적으로 **매주 월요일 06:00 (Asia/Seoul)** 에 시작한다.
- 이 시점에 Monday 후보 발굴 workstream을 시작하는 kick-off job 또는 그에 준하는 자동화 체인을 설계한다.

### 예시 1 — Monday supervision job

```json
{
  "name": "weekly-launch-monday-supervision",
  "schedule": {
    "kind": "every",
    "everyMs": 300000
  },
  "payload": {
    "kind": "agentTurn",
    "message": "[여기에 Monday supervision prompt 삽입]",
    "timeoutSeconds": 240
  },
  "delivery": {
    "mode": "announce"
  },
  "sessionTarget": "isolated",
  "enabled": true
}
```

### 예시 2 — Tuesday PRD supervision job

```json
{
  "name": "weekly-launch-tuesday-prd-supervision",
  "schedule": {
    "kind": "every",
    "everyMs": 300000
  },
  "payload": {
    "kind": "agentTurn",
    "message": "[여기에 Tuesday PRD supervision prompt 삽입]",
    "timeoutSeconds": 240
  },
  "delivery": {
    "mode": "announce"
  },
  "sessionTarget": "isolated",
  "enabled": true
}
```

---

## Manager Runbook

작업 시작 시:
- 작업명 확정
- 목표/완료조건 명시
- 현재 단계 명시
- 전용 5분 supervision cron 생성

작업 진행 중:
- 상태를 ON_TRACK / NEEDS_NUDGE / BLOCKED / MILESTONE_DONE / DONE으로 분류
- BLOCKED면 원인 분류: 정보 부족 / 범위 과다 / 구현 난이도 / 의사결정 필요
- 필요 시 Claude Code에 재지시
- 보고 필요 시 CEO에게 짧게 보고

작업 완료 시:
- 최종 산출물 확인
- CEO 최종 보고
- cron 제거
- 다음 단계용 새 cron 필요 시 교체 생성

---

## CEO 보고 한줄 포맷

짧은 중간 보고는 아래 포맷을 기본으로 쓴다.

```text
[상태 보고]
- 작업: 
- 현재 상태: 
- 완료된 마일스톤: 
- 남은 핵심 이슈: 
- 다음 액션: 
- CEO 결정 필요 여부: 예/아니오
```

---

## 중요 메모

- 5분 감독은 “자주 보고”가 목적이 아니라 **흐름 유지**가 목적이다.
- 아무 변화가 없는데도 불필요한 보고를 계속 보내지 않는다.
- 중요한 순간에만 CEO에게 올리고, 나머지는 내가 현장에서 해결한다.
- 작업이 끝났는데 cron을 안 지우는 실수를 하지 않는다.
