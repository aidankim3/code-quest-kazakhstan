# ChatGPT / Codex Instructions

Before doing any work:
1. Read `README.md`.
2. Read `AI_WORKFLOW.md`.
3. Read `HANDOFF.md`.
4. Inspect the latest relevant commits/branch state.

Treat GitHub as shared memory with Claude. Resume from the latest pushed checkpoint and do not ask the user to restate repository-recoverable context.

Before stopping, especially when context/token budget is low: run relevant checks, commit, push, and update `HANDOFF.md` with exact next steps and current status.

Follow `AI_WORKFLOW.md` for takeover, branches, checkpoints, and conflict avoidance.
