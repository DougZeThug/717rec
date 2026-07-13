# PR-01 — Remove 3 orphaned seasonBreakdown files to un-block the CI dead-code gate

| | |
|---|---|
| **Phase** | 1 — Baseline verification and urgent fixes |
| **Tier** | 1 — Critical (CI is red on `main`) |
| **Priority** | Highest — do this first |
| **Recommended agent** | Codex or Claude Code (trivial, mechanical) |
| **Difficulty** | Trivial (~15 min) |
| **Risk** | Very low |
| **Expected score improvement** | +0.6 overall (Production readiness 80→90) |
| **Parallel-safe?** | Yes — touches only 3 dead files |
| **Depends on** | Nothing |

## Background and problem statement

- **Current behavior:** The `Quality, tests, and coverage` job in `.github/workflows/ci.yml` fails on `main` at commit `98e8c6a` at its final step, `Check dead code` (`npm run knip`). Verified two ways: GitHub Actions run `29264074537` (step 9 `failure`, all prior steps green) and a local `npm run knip` (exit 1).
- **Cause:** Commit `22a1943` ("Refactor season breakdown helpers into services") moved season-breakdown logic into the services layer but left three files behind that nothing imports anymore.
- **Who is affected:** Every PR against `main` shows a red check; the dead-code gate can no longer catch *new* dead code because it is already failing.
- **Status:** **Confirmed defect** (reproduced locally and in CI).
- **Preserve:** The season-breakdown feature itself (team page "Seasons" tab) works — it now uses the service-layer implementation. Do not touch the live implementation.

## Objective

`npm run knip` exits 0 and the CI Quality job goes green, with no behavior change anywhere in the app.

## Exact scope

1. Delete exactly these files:
   - `src/hooks/teams/seasonBreakdown/calculateSeasonStats.ts`
   - `src/hooks/teams/seasonBreakdown/processSeasonMatches.ts`
   - `src/hooks/teams/seasonBreakdown/types.ts`
2. Check `src/hooks/teams/seasonBreakdown/__tests__/` for test files that only exercise the deleted files; delete those too (a test of a deleted file is dead weight). Tests of the *surviving* files (`fetchTeamSeasonBreakdown.ts`, `useTeamSeasonBreakdown.ts`, `index.ts`) stay.
3. If `index.ts` re-exports anything from the deleted files, remove those export lines.
4. **Out of scope:** any other knip findings, any refactoring of the surviving season-breakdown code, the ~285 knip-ignored unused exports (that's PR-13).

## Likely files and systems affected

- `src/hooks/teams/seasonBreakdown/` (deletions only, plus possibly `index.ts` and `__tests__/`)
- No routes, services, migrations, or policies.

## Implementation instructions

1. Run `npm run knip` first and confirm the 3 files above are exactly what it reports as "Unused files".
2. `grep -rn "calculateSeasonStats\|processSeasonMatches" src/` — confirm the only hits are the files themselves, their `__tests__`, and possibly `index.ts` re-exports. If you find a real importer, STOP and report instead of deleting.
3. Delete the files, fix `index.ts` re-exports if any, delete orphaned tests.
4. Re-run the validation commands below.

## Database requirements

None. No migration, no schema change, no type regeneration.

## UI and UX requirements

None visible. Manual check only that the team page still renders its season breakdown (see checklist).

## Testing requirements

- No new tests needed. The deletion is validated by:
  - `npm run knip` exiting 0 (the gate this PR exists to fix),
  - the existing season-breakdown tests still passing,
  - typecheck confirming nothing imported the deleted files.

## Required validation commands

```bash
npm ci
npm run knip          # must exit 0
npm run typecheck     # must exit 0
npm run lint
npm run test:file -- src/hooks/teams
npm run test:coverage # full gate
npm run build
```

## Manual verification checklist (for Doug)

1. Open the site → Teams → click any team → open its stats/seasons section. **Expect:** per-season records display as before. **Must not:** show a blank section or console error.
2. On GitHub → Actions → latest CI run on the PR. **Expect:** "Quality, tests, and coverage" is green, including "Check dead code".

## Acceptance criteria

- [ ] `npm run knip` exits 0 locally and in CI.
- [ ] All 5 CI jobs green on the PR.
- [ ] `git diff --stat` shows only deletions under `src/hooks/teams/seasonBreakdown/` (plus at most `index.ts` export-line removals).
- [ ] Full test suite passes with no snapshot/coverage regressions.

## Non-goals and guardrails

- Do NOT refactor the surviving season-breakdown service or hook.
- Do NOT touch `knip.json` to silence the failure — the files must actually be deleted.
- Do NOT batch other cleanup into this PR.

## Rollback

`git revert` of the single commit restores the files; zero data or schema involvement.

## Deliverables from the implementing agent

Summary of what was deleted and why; knip/typecheck/test/build outputs; confirmation of the grep in step 2; any unexpected importer found (which would change the plan).
