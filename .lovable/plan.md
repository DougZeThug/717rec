## Fix pre-existing lint failures

All 11 errors in the two test files are **auto-fixable** formatting issues (Prettier indentation + import sort). No logic changes needed.

### Files
- `src/components/admin/__tests__/admin-score-tools.test.tsx` — 1 import-sort error
- `src/components/playoffs/__tests__/playoffBracketCreationAndAdvancement.integration.test.tsx` — 10 Prettier indentation errors

### Steps
1. Run `npx eslint --fix` scoped to just those two files.
2. Run `npx eslint` on the same files to confirm 0 errors.
3. Run `npm run lint` to confirm the full repo is clean.
4. Run `npm run typecheck` to confirm the indentation changes didn't shift any TS-significant code.

### Deliverable
A single small commit, formatting-only, that unblocks `npm run lint` on the stats branch.