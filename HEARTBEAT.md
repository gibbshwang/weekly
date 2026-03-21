# HEARTBEAT.md

# Lightweight periodic checks only. Task-specific 5-minute supervision for active Claude Code workstreams
# should be handled with dedicated cron jobs, not by relying on heartbeat alone.

- Check whether there is any active weekly-launch workstream currently in progress.
- If there is an active workstream, verify that its dedicated 5-minute supervision cron exists and is still appropriate.
- If there is no active workstream, do not invent one from old context.
- If a meaningful milestone completed and the CEO has not been informed yet, prepare a concise status update.
- If there is nothing that needs attention, reply HEARTBEAT_OK.
