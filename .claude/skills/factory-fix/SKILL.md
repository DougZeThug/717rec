---
name: factory-fix
description: Investigate and fix a bug. Reproduces it first, finds the root cause, applies a targeted fix with a regression test, verifies, checks nearby behavior, and gets an independent review. Use for "X is broken", "why does Y happen", error messages, failing tests.
argument-hint: "<bug description, error text, or failing test>"
disable-model-invocation: true
---

# /factory-fix

Bug report: **$ARGUMENTS**

If the report is empty, ask for it in one line and stop.

1. Read `factory/PIPELINE.md`. Create the task with `--kind fix`.
2. **Reproduce before you change anything.** Use a failing test, a command, or a browser check (`factory/bin/shoot.mjs` or a Playwright spec). Save the output to `.factory/evidence/<id>/repro.log`. If you cannot reproduce it, check production boundaries: never read live data to investigate. Report what you tried and stop.
3. Write acceptance criteria: (a) the repro now passes, (b) a regression test exists that failed before the fix, (c) neighbouring checks still pass.
4. Root cause: spawn `factory-repair` with the repro evidence (it finds the cause and fixes it). For a wide or unclear bug, spawn `factory-architect` first.
5. Prove the new regression test **fails on the old code and passes on the new code** (stash or checkout the old file to show it). Record it in the criterion evidence.
6. Run Stage 6 (verify), Stage 8 (review) and Stage 9 (gate). Repair limit is 3 attempts per issue.
7. Report per Stage 10. Include the root cause in one sentence.
