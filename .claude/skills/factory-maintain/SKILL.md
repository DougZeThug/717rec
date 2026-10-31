---
name: factory-maintain
description: Run a maintenance audit (checks, dependency and security alerts, dead code, flaky or failing tests, docs drift), investigate what it finds, and prepare repair branches or pull requests for the safe fixes. Never merges or deploys.
argument-hint: "[focus: deps | tests | security | docs | all]"
disable-model-invocation: true
---

# /factory-maintain

Focus: **$ARGUMENTS** (empty means all).

1. Read `factory/PIPELINE.md`. Start from a clean base-branch checkout. Create one task per distinct finding (`--kind maintain`); they are not limited by the feature ceiling, but work them **one at a time**.
2. Audit with real commands from `.factory/config.json`: `typecheck`, `lint`, `unit`, `knip`, `build`. Also: `npm outdated`, `npm audit --omit=dev`, open GitHub issues labeled for the factory, and failing CI on the base branch (GitHub tools).
3. Triage. Fix automatically only: failing checks, dead code, lint, safe patch/minor updates, docs drift. **Report only** (do not touch): security boundaries, migrations, data, scoring rules, major version upgrades, anything in `productionBoundaries`.
4. For each fix, run the normal pipeline (Stages 5-9) on its own branch `factory/<id>`. Dependency changes must update every lock file the project documents.
5. Open at most `limits.concurrentFeatures` PRs per run. Do not merge.
6. Report: audit table (check, result), fixes prepared (branch/PR), findings left for the human with a recommendation each.
