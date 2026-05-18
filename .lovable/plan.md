## Plan: Fix 9 failing tests after dependency bump

The failures group into 5 distinct root causes. None require source/business-logic changes — all are test-side fixes (mocks, snapshots, fixtures).

### Group A — `SupabaseSqlStorage.test.ts` (3 failures)
**Root cause:** Source uses `.maybeSingle()` (per project standard), but the test mocks expose `.single()`. Mock chain returns `undefined` for `maybeSingle`.

**Fix:** In the two affected tests, replace the `single` mock with `maybeSingle` so the chain becomes `select().eq().maybeSingle()`. Rename the `single` variable to `maybeSingle` (or alias both).

Files: `src/services/brackets/manager/__tests__/SupabaseSqlStorage.test.ts`

### Group B — `blossomPairingAlgorithm.test.ts` (2 failures)
**Root cause:** Two 2-team tests trigger validation that demands `targetMatchesPerTeam = 2`, which is infeasible with only 2 teams (max 1 unique pair). Algorithm now strictly validates.

**Fix (test-only):** Pass `targetMatchesPerTeam: 1` in `baseConfig` for the 2-team tests, or bump those fixtures to 3 teams. Prefer adding the explicit override on the two failing tests to keep scope minimal.

Files: `src/utils/autoSchedule/__tests__/blossomPairingAlgorithm.test.ts`

### Group C — Snapshot drift (3 failures)
`HelpQuickLinks`, `AnnouncementHeroCard`, `Navbar` — snapshots failed. Likely caused by `lucide-react` 1.14 → 1.16 changing SVG output, or react-router 7.15.1 markup tweak.

**Fix:** Inspect each snapshot diff. If the only change is icon SVG path data or router-internal attributes, update the snapshots with `npx vitest run <file> -u`. If a real regression appears, stop and report before updating.

Files: `src/components/help/__tests__/__snapshots__/HelpQuickLinks.test.tsx.snap`, `src/components/hero/__tests__/__snapshots__/AnnouncementHeroCard.test.tsx.snap`, `src/components/layout/__tests__/__snapshots__/Navbar.test.tsx.snap`.

### Group D — `usePairingOperations.test.ts` (1 failure)
Likely related to the same blossom validation tightening (test fixture has too few teams or wrong target). Read the test, identify the assertion, and apply the same fixture/config fix as Group B.

File: `src/hooks/useAutoSchedule/__tests__/usePairingOperations.test.ts`

### Group E — `parseMetadata.test.ts` (1 failure)
`parses a valid JSON array string`. Investigate diff — possibly the test's expected shape drifted from current util output. Fix by aligning the expected value if the current util behavior is the intended contract.

File: `src/utils/__tests__/parseMetadata.test.ts`

### Steps
1. Inspect each failing file/diff (read snapshots, mocks, fixtures).
2. Apply minimal test-only fixes per group above.
3. Run each fixed file in isolation with `npm run test:file -- <path>` to confirm green.
4. Run full `npm test` to confirm 0 failures.

### Risks / out of scope
- No source code or scheduler logic changes.
- If Group C snapshots reveal a real visual regression (not just icon SVG), pause and surface before `-u`.
- If Group E reveals a util behavior bug, pause and ask whether to fix the util or the test.
