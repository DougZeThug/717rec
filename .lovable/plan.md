

## Fix: Include Current Season Playoff Matches in Career W-L

### Problem
The career stats code in `calculateCareerMatchStats` intentionally excludes the current season's `team_season_stats` row to avoid stale data, then recounts from the `matches` table. But the `matches` table only has regular season data -- playoff results live in `playoff_matches`. So current-season playoff wins/losses are missing from career totals.

The `team_season_stats` view correctly includes playoff data (14-0 for Offdogs), but the code never reads it for the active season.

### Solution
Add current-season playoff match counting to `calculateCareerMatchStats`, matching how archived seasons already include them via `team_season_stats`.

### Changes (3 files)

**1. `src/hooks/career/useCareerData.ts`**
- When fetching bracket division weights for playoff matches, also store each bracket's `season_id` in a new map: `bracketSeasonMap: Record<string, string>`
- Export this map as part of the `CareerData` interface
- The data is already being fetched from the `brackets` table -- just need to also read `season_id` from the existing query

**2. `src/utils/career/calculateCareerMatchStats.ts`**
- Add two new optional parameters to the input interface:
  - `playoffMatches: PlayoffMatchData[] | null`
  - `bracketSeasonMap: Record<string, string>` (bracket_id to season_id)
- After the existing `currentMatches` loop, add a new loop over `playoffMatches` that:
  - Skips matches where the bracket's season doesn't match `currentSeasonId` (historical ones are already in `seasonStats`)
  - Skips matches with no `winner_id` (pending)
  - Counts wins/losses and game scores from `team1_score`/`team2_score`

**3. `src/hooks/career/useTeamTotalsComputed.ts`**
- Pass the new `bracketSeasonMap` from career data into the `calculateCareerMatchStats` call
- Pass `playoffMatches` into the call

**Also update `src/hooks/useTeamTotals.ts`** (backward compat wrapper) with the same parameter additions.

### Why No Double-Counting
- Historical seasons: `seasonStats` rows already include playoffs (from `v_team_season_agg`). The new code only counts playoff matches where `bracketSeasonMap[bracket_id] === currentSeasonId`, so historical playoffs are skipped.
- Current season: `currentSeasonId` is filtered out of `seasonStats`, so the current season's `team_season_stats` row (which includes playoffs) is never used. Instead, we count from `matches` (regular) + `playoffMatches` (playoffs) -- no overlap since they're separate tables.
- After archival: The season is no longer active, so it won't match `currentSeasonId`. It gets read entirely from `seasonStats` (which includes playoffs). The new playoff loop won't fire for it.

### No Database Changes Required
All data is already correct in the database. This is purely a frontend calculation fix.

