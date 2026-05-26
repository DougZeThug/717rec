## Fix Playoff Finish React Key Collision in TeamTotals

### Problem
`TeamTotals` renders playoff finish chips with a React key that uses `finish.season_id`, but `PlayoffFinish` only has `rank`, `season_name`, and `division_name`. Since `season_id` is always `undefined`, the key falls back to `${division_name}-${rank}`, which collides when a team has the same rank in the same division across multiple seasons. This causes React duplicate-key warnings and potential reconciliation bugs.

### Changes

1. **Fix the key in `src/components/teams/TeamTotals.tsx`**
   - Line 319: change `key={\`${finish.season_id ?? finish.division_name}-${finish.rank}\`}` to `key={\`${finish.season_name}-${finish.division_name}-${finish.rank}\`}`
   - This guarantees uniqueness because `season_name` is present on the type and each season has a distinct name.

2. **Add regression test in `src/components/teams/__tests__/TeamTotals.playoffFinishes.test.tsx`**
   - Render `TeamTotals` with two playoff finishes that have the same `division_name` and `rank` but different `season_name`
   - Assert that no duplicate-key console warning is emitted
   - Verify both chips render correctly

### Verification
- Run the new test with `npm run test:file -- src/components/teams/__tests__/TeamTotals.playoffFinishes.test.tsx`
- Confirm it passes after the fix (and would fail before it)