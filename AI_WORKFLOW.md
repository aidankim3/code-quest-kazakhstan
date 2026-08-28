# AI Collaboration Workflow

This repository is designed for bidirectional work between Claude and ChatGPT/Codex. Neither agent permanently owns the project. The agent with available tokens/context may resume from the latest pushed checkpoint.

## Shared source of truth
1. Git history and current branch
2. `HANDOFF.md`
3. `README.md` and project docs
4. Open issues / pull requests when present

Do not rely on private chat history unavailable to the other agent.

## Before starting
1. Pull/fetch the latest remote state.
2. Read `README.md`, `AI_WORKFLOW.md`, and `HANDOFF.md`.
3. Inspect recent commits and relevant branches/PRs.
4. Continue from the latest checkpoint instead of redoing completed work.

## Shared ownership
- Either Claude or ChatGPT/Codex may start or resume any task.
- `active_agent` in `HANDOFF.md` means who last worked on the task, not exclusive ownership.
- If one agent is rate-limited, out of tokens/context, or otherwise unavailable, the other may immediately take over from the latest pushed checkpoint.
- Prefer small, frequent commits.
- Never assume the other agent can see uncommitted local changes.

## Branches
For non-trivial changes, prefer:
- Claude: `ai/claude/<task-slug>`
- ChatGPT/Codex: `ai/codex/<task-slug>`

When taking over, continue the existing pushed branch when safe. If unknown local work may exist, branch from the latest pushed commit instead of overwriting work.

## Checkpoints
At meaningful milestones, and especially before stopping or when token/context budget is low:
1. Save a working state when practical.
2. Run relevant tests/checks.
3. Commit changes descriptively.
4. Push the branch.
5. Update `HANDOFF.md`.
6. Commit and push the handoff update.

## `HANDOFF.md` must contain
- active agent
- status
- current branch
- current goal
- completed work
- work in progress
- exact next steps
- blockers / known bugs
- files touched
- tests and results
- important design decisions
- latest checkpoint commit when known

Keep it concise and current; replace stale status rather than appending chat logs.

## Takeover procedure
1. Read `HANDOFF.md`.
2. Inspect recent commits and the latest diff.
3. Verify the current code.
4. Run the most relevant quick check if feasible.
5. Change `active_agent` to yourself and continue.

Do not ask the user to repeat information recoverable from the repository.

## Finish procedure
When complete, run relevant checks, commit/push all intended changes, set `status: READY_FOR_NEXT_TASK` in `HANDOFF.md`, summarize completion and remaining caveats, then merge/open a PR according to the user's workflow.

## Conflict avoidance
- Do not have both agents independently edit the same files on `main` at the same time.
- Use branches for parallel work.
- Check whether the remote moved before writing.
- Prefer a clean handoff over duplicate implementation.

Goal: either agent can stop at any checkpoint and the other can resume with minimal user explanation.
