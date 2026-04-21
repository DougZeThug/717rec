

## Plan: Add tests for the overlapping-seasons playoff workflow

### Why this matters

The new "Keep playoffs active" / "Finalize Playoffs" workflow is the most complex season change you've shipped recently. It touches three database functions, two UI dialogs, one mutation hook, and the season activation flow. None of it has tests yet. Per `TESTING.md`, services and hooks are explicitly the highest-priority areas to raise coverage, and this new code is in both.

Recommended: yes, add tests. They're cheap to write, will catch regressions if any of these pieces shift, and match the pattern your existing season tests already follow.

### What to test (and at what level)

**1. `SeasonService` — unit tests** (`src/services/__tests__/SeasonService.test.ts`, extend existing file)
   - `partialArchiveSeason(id)` → calls `supabase.rpc('partial_archive_season', { p_season_id })`, returns the season row, throws via `handleDatabaseError` on RPC error.
   - `activateSeasonWithPartialArchive(id)` → calls `supabase.rpc('activate_season_with_partial_archive', ...)`, returns the new active season, throws on error.
   - `finalizePlayoffs({ seasonId, championTeamId, runnerUpTeamId, thirdPlaceTeamId })` → calls `supabase.rpc('finalize_playoffs', ...)` with all four args mapped to the right `p_*` keys, returns the archived season, throws on error.
   - `fetchPlayoffActiveSeason()` → returns the row where `playoffs_active = true`, returns `null` when none, throws on real error.
   - Verify `fetchSeasons` and `fetchHistoricalSeasons` now include `playoffs_active` in the select string.

**2. `useSeasonMutations` — hook tests** (`src/hooks/__tests__/useSeasonMutations.test.ts`, new file)
   - `activateSeasonWithPartialArchive.mutateAsync(id)` invalidates the full set of query keys (seasons, matches, teams, rankings, v_team_details, teamStats, standings, careerRankings, bracket-data, playoff-matches).
   - `finalizePlayoffs.mutateAsync(...)` invalidates the same set.
   - Both surface service errors so the dialogs' `try/catch` toasts work.

**3. `SeasonActivationDialog` — component tests** (`src/components/admin/seasons/__tests__/SeasonActivationDialog.test.tsx`, new file)
   - "Keep playoffs active" checkbox is **hidden** when there's no active season, **hidden** when activating the already-active season, **shown** otherwise.
   - Checkbox unchecked → clicking Activate calls `activateSeason` (existing path), success toast says "is now the active season".
   - Checkbox checked → clicking Activate calls `activateSeasonWithPartialArchive`, success toast mentions "playoffs remain in progress".
   - The conditional bullet list updates correctly when the checkbox toggles.
   - Service rejection → error toast, dialog stays open.

**4. `SeasonFinalizePlayoffsDialog` — component test** (`src/components/admin/seasons/__tests__/SeasonFinalizePlayoffsDialog.test.tsx`, new file)
   - Confirm button calls `finalizePlayoffs.mutateAsync` with `{ seasonId, championTeamId: null, runnerUpTeamId: null, thirdPlaceTeamId: null }`.
   - Success → toast + `onClose()`.
   - Failure → error toast, dialog stays open, button re-enables.
   - Cancel button does not call the mutation.

**5. SQL safety — leave to manual verification**
   The three new RPCs (`partial_archive_season`, `finalize_playoffs`, `activate_season_with_partial_archive`) and the `ensure_single_playoffs_active_season` trigger run in Postgres. The project doesn't have a Postgres test harness today. Don't add one for this — instead, document a 4-step manual smoke test in `TESTING.md` under a new "Manual checks" subsection (activate season normally, activate with partial-archive, run trigger by manually flipping two seasons to `playoffs_active = true`, finalize).

### Testing patterns to follow

- **Supabase mock**: use the existing `src/test/mocks/supabaseMock.ts` factory (per your testing memory).
- **Hooks**: wrap with the standard TanStack Query test wrapper (the same one `useSeasonMutations` neighbors already use).
- **Components**: mock `useSeasonMutations` and `useSeasons`, assert on user-visible text and on `mutateAsync` call args. Use `userEvent` for the checkbox + button interactions. Mock the toast helper.
- **No new dependencies** needed — everything's already in `package.json`.

### Files touched

- New: `src/hooks/__tests__/useSeasonMutations.test.ts`
- New: `src/components/admin/seasons/__tests__/SeasonActivationDialog.test.tsx`
- New: `src/components/admin/seasons/__tests__/SeasonFinalizePlayoffsDialog.test.tsx`
- Edit: `src/services/__tests__/SeasonService.test.ts` (extend, don't replace)
- Edit: `TESTING.md` (add the 4 new test files to the "What's tested today" list; add a short "Manual checks: overlapping seasons" subsection)

### Verification

1. `npm test` — all new tests pass.
2. `npm run test:coverage` — `src/services/SeasonService.ts` and `src/hooks/useSeasonMutations.ts` line coverage should jump (these are currently ~0% per your baseline).
3. No production code changes, so no behavior risk.

### What I will NOT do

- Won't add a Postgres SQL test framework — out of scope for one fix.
- Won't refactor existing season tests — additive only.
- Won't change `vitest.config.ts`.

### Rollback

Delete the three new test files and revert the two edited ones. One step.

