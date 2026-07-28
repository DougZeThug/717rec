## Goal
Make `_fetchHotStreaks` in `src/services/WeeklyRecapService.ts` handle a `divisions` query failure the same way `_fetchUpsets` does — surface the error via `handleDatabaseError` instead of silently treating every team as hidden.

## Why
Today the query at lines 296–299 destructures only `data`, drops any `error`, and defaults `visibleDivisionIds` to an empty set. If the divisions query fails, every team fails the `visibleDivisionIds.has(team.division_id)` check and the hot-streaks section silently disappears from the weekly recap. `_fetchUpsets` already treats this as a must-surface error (see the comment at line 176).

## Change
In `src/services/WeeklyRecapService.ts`, `_fetchHotStreaks`:

- Capture `error` from the divisions query.
- If present, call `handleDatabaseError(error, 'Failed to fetch visible divisions for hot streaks')` — matching the wording pattern used in `_fetchUpsets`.

That's the only code change. No behavior change on the happy path.

## Verification
- `npm run test:file -- src/services/__tests__/WeeklyRecapService.test.ts`
- `npm run typecheck`

## Notes / trade-off
This intentionally converts a silent degrade into a thrown error, which is what the reviewer flagged as the reason it wasn't done in the original PR. The weekly recap hook (`useWeeklyRecap`) uses standard TanStack Query error handling, so the failure will bubble to the UI's error state instead of showing an empty Hot Streaks section — consistent with how Upsets already behaves.
