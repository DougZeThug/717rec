---
name: factory-review
description: Independent review of the current branch, a PR number, or the whole app area you name. Reads the diff, runs the checks, and looks at the real app in a browser. Reports findings with evidence. Makes no code changes. Use for "review this", "is this ready", "check PR 123".
argument-hint: "[PR number | branch | area]  (empty = current branch vs base)"
disable-model-invocation: true
---

# /factory-review

Target: **$ARGUMENTS** (empty means the current branch against the base branch.)

1. Read `factory/PIPELINE.md` rules. This skill **does not edit code**.
2. Find the diff: a PR number via the GitHub tools, a branch via `git diff <base>...<branch>`, or the current branch. State which.
3. Spawn `factory-reviewer` in CODE mode. Add project specialists from `.factory/config.json` only for the areas the diff touches (for example data, scoring, security).
4. Spawn `factory-qa` in parallel: run `typecheck`, `lint`, and the unit tests that cover the changed files. For UI changes, run `factory/bin/shoot.mjs` and read the screenshots. Run these on a clean checkout of the target, not on uncommitted edits.
5. Merge the reports. Drop any finding without a `path:line` or output as evidence. Rank: blocking, should fix, suggestion.
6. Report: verdict (APPROVE / CHANGES / REJECT), top findings, checks with results, screenshot paths. If reviewing a PR and the user asked for comments, post them with the footer rule from the session instructions. Otherwise do not post anything.
