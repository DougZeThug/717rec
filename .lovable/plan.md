## What
Fix the three lint errors causing CI failure:
1. `src/hooks/useChallongeFallback.ts:89` — missing trailing newline (prettier)
2. `src/hooks/useDivisionMutations.ts:1` — imports out of order (simple-import-sort)
3. `src/hooks/useDivisionMutations.ts:63` — missing trailing newline (prettier)

## How
Run ESLint with `--fix` on both files. The autofixer handles both import sorting and Prettier formatting in one pass.

## Verify
Check that `npm run lint` (or equivalent) reports zero errors for these files.