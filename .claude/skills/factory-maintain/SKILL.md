---
name: factory-maintain
description: Run a maintenance audit (checks, dependency and security alerts, dead code, flaky or failing tests, docs drift), investigate what it finds, and prepare repair branches or pull requests for the safe fixes. Never merges or deploys.
argument-hint: "[focus: deps | tests | security | docs | all]"
disable-model-invocation: true
---

# /factory-maintain

Focus: **$ARGUMENTS** (empty means all).

1. Read `factory/PIPELINE.md`. Start from a clean base-branch checkout. Create one task per distinct finding (`--kind maintain`); they are not limited by the feature ceiling, but work them **one at a time**.
2. Use the focus. `deps`: only the dependency audit commands. `tests`: only `typecheck`, `lint`, `unit`, flaky or failing tests. `security`: only `npm audit` and security alerts. `docs`: only docs drift. Empty or `all`: everything below. Audit with real commands from `.factory/config.json`: `typecheck`, `lint`, `unit`, `knip`, `build`. Also: `npm outdated`, `npm audit --omit=dev`, open GitHub issues labeled for the factory, and failing CI on the base branch (GitHub tools).
3. Triage (only the focus area). Fix automatically only: failing checks, dead code, lint, safe patch/minor updates, docs drift. **Report only** (do not touch): security boundaries, migrations, data, scoring rules, major version upgrades, anything in `productionBoundaries`.
4. For each fix, work on its own branch, in this order. First make the branch from the base branch: `git switch -c factory/<id> <base>` (`<base>` is `baseBranch` in `.factory/config.json`). Then tell the ledger: `node factory/bin/factory.mjs set <id> branch factory/<id>`. (`new` recorded the base branch, because step 1 ran there.) Then run the normal pipeline (Stages 5-9) on that branch. Dependency changes must update every lock file the project documents. If a change touches a path in `protectedPaths` (for example `bun.lock`), the guard hook blocks the edit: do not work around it. Report it as a finding for the human instead.
5. Open at most `limits.concurrentFeatures` PRs per run. Do not merge.
6. Report: audit table (check, result), fixes prepared (branch/PR), findings left for the human with a recommendation each.
