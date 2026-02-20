

## Fix: Link Winter 1 2026 Brackets to Season (No Code Changes Needed)

### Root Cause
The three Winter 1 2026 playoff brackets have `season_id = NULL`. The database view `v_team_season_agg` -- which feeds `team_season_stats` -- joins `playoff_matches` to `brackets` and filters on `season_id IS NOT NULL`. Because the brackets aren't linked to a season, playoff results are invisible to the career stats pipeline.

### Why Double-Counting Won't Happen (Already Handled)

The existing architecture already prevents double-counting at every stage:

1. **`v_team_season_agg` view** combines regular season + archived + playoff matches into one total per team per season. This is the single source of truth written into `team_season_stats`.

2. **Career calculation (`calculateCareerMatchStats`)** excludes the current active season's `team_season_stats` row (via the `currentSeasonId` filter) and instead counts current-season data directly from the `matches` table. This avoids stale/double data during an active season.

3. **After archival**, the season is no longer active, so `currentSeasonId` won't match it. The career code reads it purely from `team_season_stats` (which already includes playoffs from step 1).

4. **The `matches` table only contains regular season matches** -- playoff results live exclusively in `playoff_matches`. So there's no overlap between the two tables.

### The Fix (Data Only -- No Code Changes)

**Step 1: Set `season_id` on the three brackets**

Update the `brackets` table to link each Winter 1 2026 bracket to the active season (`4b90a1d8-b90a-4e47-8e8c-b89a7b54e106`):

- Competitive Winter 1 2026 (`428f974f-...`)
- Intermediate Winter 1 2026 (`dbf640b8-...`)
- Recreational Winter 1 2026 (`29a823d8-...`)

**Step 2: Re-run `upsert_team_season_stats()`**

This refreshes `team_season_stats` from the `v_team_season_agg` view, which will now include playoff matches because the brackets have a `season_id`.

**Step 3: Verify**

Confirm that teams with completed playoff matches (e.g., Miracle @ Marion) now show updated career W-L totals that include their playoff results.

### What This Means for Career Records

After this fix, career W-L will include playoff results for the current season -- matching the behavior of all archived seasons. When the season is eventually archived, nothing changes because the data pipeline is already consistent.

