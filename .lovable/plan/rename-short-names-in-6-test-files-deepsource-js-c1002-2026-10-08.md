# Rename short names in 6 test files (DeepSource JS-C1002)

All 13 warnings are still in the code. All are in **test files only**. The app does not change.

## Renames
- `submit-score-report/index.test.ts`: `u` -> `requestUrl`
- `usePairingOperations.test.ts`: `d` -> `dateValue`, `y` -> `year`, `m` -> `month`
- `calculateStreak.test.ts`: `T` -> `TEAM_ID`, `m` -> `incompleteMatch`
- `calculateHeadToHead.test.ts`: `T` -> `TEAM_ID`
- `createRankingObject.test.ts`: `t` -> `team` (6 tests)
- `rematchRepair.test.ts`: `d` -> `division`

Rename every use of each name inside its own scope only.

## Checks
- Run the 5 changed vitest files with `npm run test:file`.
- Run the Deno test for `submit-score-report` if Deno is available; else confirm with typecheck/lint.
- `npm run typecheck` and `npm run lint`.
- Search again for the flagged names.

No publish needed. DeepSource clears the warnings on its next scan.
