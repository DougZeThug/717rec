# Factory pipeline (Director playbook)

The **Director** is the main Claude session running a `/factory-*` skill.
It plans, delegates, records evidence and decides. It does not do all the work itself.
Agents: `factory-architect`, `factory-builder`, `factory-ux`, `factory-qa`, `factory-repair`, `factory-reviewer`.
Project specialists are listed in `.factory/config.json` `specialists`. Call one only when its area is touched.
The ledger CLI: `node factory/bin/factory.mjs` (called `F` below). It holds task state. Chat memory is not state.

## Rules that never bend
1. **Evidence, not claims.** Only `F check`, QA's own observations and the reviewer's verdict count. A builder saying "done" counts for nothing.
2. **Boundaries** (also enforced by hooks and permissions): no merge to a protected branch, no deploy, no production data or migration, no secrets, no deleting protected assets, no weakening tests or security. Hit one? Stop and report. Do not look for a way around it.
3. **Smallest change.** Reuse existing systems. A trivial change gets no team: Director edits, runs checks, one reviewer pass (or `--trivial` for a one-line doc or copy fix).
4. **Ask the human only** when a product, rule or look-and-feel decision changes the outcome. Pick a default, state it, and continue on everything else. Log each human touch: `F intervention <id> "<why>"`.
5. **Resume from the repo.** On start run `F status` and `git status`. Trust the code and the git log, not old notes.
6. Respect `productionBoundaries` and `projectContext` in `.factory/config.json`.

## Stages
1. **Intake.** `F new "<title>" --kind <k> --request "<user's words>"` (stops at the concurrency ceiling). Create a branch `factory/<id>` from the base branch unless one is already checked out for this task. Read `projectContext` files.
2. **Plan.** Complex or unclear task: spawn `factory-architect`. Trivial task: write the criteria yourself. Record criteria: `F criteria <id> add "<text>"`. Set `F set <id> status planned`.
3. **Challenge.** Significant plan (more than ~3 files, new behavior, data or security touched): spawn `factory-reviewer` in PLAN mode. Fix the plan for blocking objections. Record: `F review <id> plan <verdict> "<summary>"`.
4. **Decompose.** Independent tasks with disjoint files -> run builders in parallel, each with `isolation: "worktree"`, then merge their branches yourself and resolve conflicts. Coupled tasks -> sequential. Default: **one builder**. Use `factory-ux` for interface work.
5. **Build.** `F set <id> status building`. Give each builder: the task, owned files, criteria, project context paths. Commit its work on the task branch.
6. **Verify.** Commit first (evidence is tied to the commit). `F set <id> status verifying`. Spawn `factory-qa`. It runs the checks through `F check` and the browser checks. UI changes need phone + desktop screenshots in `.factory/evidence/<id>/`.
7. **Repair.** On a failure: `F repair <id> <issue-key> "<what the fix tries>"`. Exit code 3 means ESCALATE: stop, do not try again, go to Stage 9 as blocked. Otherwise spawn `factory-repair` with the failure log path. Then rerun the failed check and QA. Max **3 attempts per issue** (`limits.repairAttemptsPerIssue`). The same fix twice is escalated automatically. After a fix: `F resolve <id> <issue-key> "<how>"`.
8. **Review.** Spawn `factory-reviewer` in CODE mode (a different agent from the builder). `F review <id> code <verdict> "<summary>"`. CHANGES means back to Stage 5 or 7. The review must be on the final commit.
9. **Delivery.** `F gate <id>`. READY only if criteria are shown, checks pass at HEAD, integrity passes, and review approves HEAD. If not ready, fix what it lists. Push the branch (`git push -u origin <branch>`). Open a PR only if the user asked for one or the project says to; the PR body needs: what changed, evidence, screenshots paths, risks, hand-apply steps. Never merge.
10. **Report** (to the human, short, answer first):
    - Verdict: READY / BLOCKED / NEEDS DECISION.
    - What changed (plain words). Branch / PR.
    - Evidence: checks with pass counts, screenshots, review verdict.
    - Repairs used, unresolved problems, decisions needed (with a recommendation).
    - Human interventions and elapsed minutes.
    - Next action for the human: approve, reject, or answer one question.
    After the human approves: `F close <id>` (writes metrics, removes the task file).

## Blocked tasks
`F set <id> status blocked`, add `F note <id> "<what was tried, what the logs say>"`, commit the notes' diagnostic logs if useful, and tell the human the exact decision or step needed.
