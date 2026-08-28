# Shared AI Handoff

active_agent: none
status: READY_FOR_NEXT_TASK
current_branch: main
latest_checkpoint: 6600a9e56872b546528809b8664fe719494d3d40

## Current Goal
No active task. This file is the shared checkpoint between Claude and ChatGPT/Codex.

## Completed
- Added bidirectional Claude ↔ ChatGPT/Codex collaboration rules in `AI_WORKFLOW.md`.

## In Progress
- None.

## Next Steps
1. Next agent reads `README.md`, `AI_WORKFLOW.md`, and this file.
2. On task start, update `active_agent`, `status`, `current_branch`, and `Current Goal`.
3. Keep this file current at meaningful checkpoints and before handoff.

## Blockers / Known Bugs
- None recorded here.

## Files Touched
- `AI_WORKFLOW.md`
- `HANDOFF.md`

## Tests
- Not applicable; collaboration metadata only.

## Important Decisions
- GitHub is shared memory.
- Either Claude or ChatGPT/Codex may take over when the other lacks tokens/context.
- Small pushed commits are preferred.
