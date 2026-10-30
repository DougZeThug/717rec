---
name: factory-status
description: Show a short, verified overview of factory work - open tasks, what passed, failures, blockers and the next action. Reads the real repo state, not old notes.
disable-model-invocation: true
allowed-tools: Bash(node factory/bin/factory.mjs *) Bash(git status*) Bash(git log*) Bash(git branch*) Bash(git diff*)
---

# /factory-status

1. Run `node factory/bin/factory.mjs status`.
2. Run `git status --short`, `git branch --show-current`, and `git log --oneline -8`.
3. For each open task, check the claim against the repo: does the task's branch exist, are its commits there, does the evidence log exist (`.factory/evidence/<id>/`), is the latest check on the current commit?
4. Report in this shape, max 15 lines:
   - **Now:** open tasks and their real state (say where a note and the repo disagree).
   - **Failing / blocked:** with the one thing needed to unblock.
   - **Done recently:** from the ledger.
   - **Next:** one recommended action.
Do not change anything.
