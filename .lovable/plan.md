

## Plan: Create `archive_season` RPC Function for Full Admin Panel Archival

The goal is to replace the current incomplete archival flow (which only flips `is_active`/`is_archived` on `seasons`) with a single Postgres RPC function that performs the entire 6-step archival process. The admin dialog will call this function instead of a simple table update.

### Why an RPC Function?

All 6 steps must happen atomically in a single transaction. A Postgres function guarantees this — if any step fails, everything rolls back. It also keeps the logic server-side, matching the existing `activate_season` RPC pattern.

### Database Change: New `archive_season` RPC Function

Create a `SECURITY DEFINER` function `archive_season(p_season_id uuid, p_champion_team_id uuid, p_runner_up_team_id uuid, p_third_place_team_id uuid)` that performs:

1. **Refresh `team_season_stats`** — Call `upsert_team_season_stats()` to ensure stats are current before snapshotting.

2. **Update division names** on `team_season_stats` — Sync `division_name` from `divisions` table for all teams in this season.

3. **Record playoff finishing positions** — Read from `brackets` table for this season. For each bracket with a `wb_champion_id`, find the champion/runner-up/3rd from `playoff_matches` and set `champion = true`, `runner_up = true`, `playoff_rank` on `team_season_stats`. This auto-detects divisions and placements from bracket data rather than hardcoding team IDs.

4. **Snapshot to `team_details_archive`** — INSERT INTO `team_details_archive` from `team_season_stats` joined with `teams`, calculating win/game percentages. Uses `ON CONFLICT (season_id, team_id) DO UPDATE` for idempotency.

5. **Archive matches** — Delete `match_comments` for this season's matches, then copy completed matches to `matches_archive` (setting `archived_at = now()`, `season_id`), then delete from `matches`.

6. **Update `seasons` row** — Set `is_active = false`, `is_archived = true`, `end_date = now()`, `champion_team_id`, `runner_up_team_id`, `third_place_team_id`, `updated_at = now()`.

The function returns the updated season row.

### How Playoff Rankings Are Auto-Detected

For each bracket in this season:
- Champion = `wb_champion_id` from `brackets` → `playoff_rank = 1, champion = true`
- Runner-up = the `loser_id` from the Grand Final match (highest round in `winners` type) → `playoff_rank = 2, runner_up = true`
- Third place = the `loser_id` from the Losers Final match (highest round in `losers` type) → `playoff_rank = 3`

This eliminates the need to hardcode team IDs or pick them manually per division.

### Frontend Changes

**`useSeasonMutations.ts`** — Change `archiveSeason` mutation to call `supabase.rpc('archive_season', { ... })` instead of a direct table update. Add broader cache invalidation (matches, teams, rankings, season-data, etc.).

**`SeasonArchivalDialog.tsx`** — The dialog already collects champion/runner-up/third-place selections for the **overall season** (Competitive division winners). These get passed to the RPC as before. The per-division playoff rankings are now auto-detected from bracket data, so no UI change needed for that. Add a progress indicator and more descriptive warning text explaining what the archival does (archives matches, snapshots stats, records playoff results).

### Summary of Changes

| What | Type |
|---|---|
| `archive_season()` RPC function | New DB migration |
| `useSeasonMutations.ts` | Edit: call RPC, broader invalidation |
| `SeasonArchivalDialog.tsx` | Edit: updated warning text, loading state |

