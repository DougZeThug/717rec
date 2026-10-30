---
name: factory-build
description: Build a feature or improvement end to end. Plans it, delegates to specialist agents, tests it in a browser, gets an independent review, repairs failures (max 3 tries), and hands back a ready branch with evidence. Use for "add X", "improve Y", "make Z work".
argument-hint: "<what you want, in plain words>"
disable-model-invocation: true
---

# /factory-build

Request from the human: **$ARGUMENTS**

If the request is empty, ask for it in one line and stop.

1. Read `factory/PIPELINE.md` completely. Follow it as the Director, with `--kind build`.
2. Run `node factory/bin/factory.mjs status` and `git status` first. If an open task already covers this request, resume it instead of creating a new one.
3. Plan with `factory-architect` unless the change is trivial. Include in the plan the existing code to reuse.
4. Challenge significant plans with `factory-reviewer` (PLAN mode) before building.
5. Build, verify, repair, review and deliver exactly as the pipeline says. Do not stop after the code is written: a feature is done only when `factory.mjs gate` says READY.
6. End with the short report from Stage 10.
