## Problem
`useMatchDelete.handleDeleteMatch` runs `deleteMatch` then `reverseTeamStats` as two separate client-side calls. If the delete succeeds and the stats reversal fails, the match is gone but `teams.wins/losses` remain inflated, corrupting standings.

## Fix Strategy
Create a single Postgres RPC `delete_match_with_stats_reversal(p_match_id uuid)` that, inside one transaction:
1. Verifies admin access (matches existing `approve_match_result` pattern).
2. Locks and reads the match row (`team1_id`, `team2_id`, `winner_id`, `loser_id`, `team1_game_wins`, `team2_game_wins`, `iscompleted`).
3. Deletes the match.
4. If `iscompleted = true` and winner/loser are set, applies the same `GREATEST(0, ...)` stat reversal inline (same logic as existing `reverse_team_stats` function) to `teams.wins/losses/game_wins/game_losses`.
5. Calls `upsert_team_season_stats()` to refresh season stats.
6. Returns a JSON summary.

Because it all runs in one transaction, a failure rolls back the delete — no more orphaned stats.

## Files

1. **New migration** — define `public.delete_match_with_stats_reversal(p_match_id uuid)` as `SECURITY DEFINER`, `search_path = pg_catalog, public`. Mirror admin guard and `RAISE EXCEPTION` patterns from `approve_match_result`. Grant execute to `authenticated` (the existing pattern relies on admin guard inside the function).

2. **`src/services/matches/MatchWriteService.ts`** — add `deleteMatchWithStatsReversal(matchId)` that wraps the RPC and uses `handleDatabaseError`. Keep the old `deleteMatch` / `reverseTeamStats` exports for non-completed flows and tests.

3. **`src/hooks/matches/updates/useMatchDelete.ts`** — replace the sequential `deleteMatch` + `reverseTeamStats` + `upsertTeamSeasonStats` calls with a single `await deleteMatchWithStatsReversal(deleteMatchId)`. Keep UI flow (toast, state update, query invalidation) the same. Remove unused imports.

4. **Tests** — update or add a unit test in `src/hooks/matches/updates/__tests__/` (if present) to assert the hook calls the new RPC wrapper once. Keep tests narrow.

## Verification
- Run `npm run test:file -- src/hooks/matches/updates/...` for any affected tests.
- Manually verify in preview: deleting a completed match still updates standings; the operation is now atomic.

## Out of Scope
- Other call sites of `reverseTeamStats` (edit-match flows) — they have their own ordering and are not part of this bug.
- Changing the `reverse_team_stats` SQL function itself.