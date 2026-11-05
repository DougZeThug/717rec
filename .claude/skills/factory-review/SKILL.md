---
name: factory-review
description: Independent review of the current branch, a PR number, or the whole app area you name. Reads the diff, runs the checks, and looks at the real app in a browser. Reports findings with evidence. Makes no code changes. Use for "review this", "is this ready", "check PR 123".
argument-hint: "[PR number | branch | area]  (empty = current branch vs base)"
disable-model-invocation: true
---

# /factory-review

Target: **$ARGUMENTS** (empty means the current branch against the base branch.)

1. Read `factory/PIPELINE.md` rules. This skill **does not edit code**.
2. Create a review task so both agents have a ledger id: `node factory/bin/factory.mjs new "Review: <target>" --kind review --request "<user's words>"`, then add criteria with `criteria <id> add` (for example "no blocking findings"). Pass the id to both agents.
3. Find the diff: a PR number via the GitHub tools, a branch via `git diff <base>...<branch>`, or the current branch. State which.
4. Spawn `factory-reviewer` in CODE mode. Add project specialists from `.factory/config.json` only for the areas the diff touches (for example data, scoring, security).
5. Spawn `factory-qa` in parallel: run the checks named in `verify.checks` of `.factory/config.json` (at least the `verify.required` ones) through `node factory/bin/factory.mjs check <id> <name>`. Only `check` output counts as evidence (PIPELINE rule 1). For UI changes, run `factory/bin/shoot.mjs` and read the screenshots. Run these on a clean checkout of the target, not on uncommitted edits: for a PR use `git fetch origin pull/<n>/head:review-<n>`, for a branch use the branch name, then `git worktree add <tmp-dir> <ref>` and run the checks inside it.
6. Merge the reports. Drop any finding without a `path:line` or output as evidence. Rank: blocking, should fix, suggestion.
7. Report: verdict (APPROVE / CHANGES / REJECT), top findings, checks with results, screenshot paths. If reviewing a PR and the user asked for comments, post them with the footer rule from the session instructions. Otherwise do not post anything.
