## Goal
Add a new "Division Matchups" card to the Insights panel on the Stats page that shows aggregate head-to-head records between division tiers across all seasons. Each team's division is resolved as of the season the match was played in (historical snapshot, not their current division).

## Output format
Six rows, one per unique tier pairing:

```text
Competitive  vs  Competitive       112 – 112
Competitive  vs  Intermediate       70 –  20
Competitive  vs  Recreational       40 –   1
Intermediate vs  Intermediate       55 –  55
Intermediate vs  Recreational       30 –   5
Recreational vs  Recreational       22 –  22
```

- Same-tier rows are intrinsically symmetric (one team's win is another's loss within the same tier).
- Cross-tier rows are oriented "higher tier vs lower tier" with wins on each side (e.g. "Competitive vs Intermediate 70 – 20" means competitive teams won 70 of those matchups, intermediate teams won 20).

## Data sources (all exist today)
- `matches` (current regular season) and `matches_archive` (past regular seasons) — both expose `winner_id`, `loser_id`, `season_id`.
- `playoff_matches` joined to `brackets` for the bracket's display division.
- `season_team_participation` — historical `(team_id, season_id) → division_name` snapshot. Same source used by `calculateDivisionRecords` via the `teamDivisionMap` keyed `${teamId}_${seasonId}`.
- Tier classification: reuse `categorizeDivision()` from `src/utils/career/calculateDivisionRecords.ts` (handles competitive / intermediate + cuspers / recreational and excludes hidden divisions).

## Files to add
1. `src/services/insights/LeagueDivisionMatchupsService.ts` — `fetchLeagueDivisionMatchups()` that bulk-fetches:
   - winner/loser/season from `matches`, `matches_archive`, `playoff_matches`
   - all rows of `season_team_participation` (team, season, division)
   - `brackets` (id, display_division) for playoff classification
   Returns raw rows; uses explicit column lists and `handleDatabaseError`.

2. `src/hooks/useLeagueDivisionMatchups.ts` — TanStack Query hook. For each match: look up winner tier and loser tier from the season-participation map (playoff matches fall back to bracket display division), then increment the right pairing's `winnerTierWins` / `loserTierWins`. Skips any match where either side can't be classified (hidden division or missing snapshot).

3. `src/components/insights/DivisionMatchupsCard.tsx` — presentational card. Uses the project's standard division tier colors (Competitive=Red, Intermediate=Amber, Recreational=Green). Six fixed rows in the order shown above.

4. Tests:
   - `src/hooks/__tests__/useLeagueDivisionMatchups.test.ts` — aggregation logic: same-tier symmetry, cross-tier orientation, hidden-division exclusion, missing-snapshot skip.
   - `src/services/insights/__tests__/LeagueDivisionMatchupsService.test.ts` — query shape and error handling using the standard supabase mock.

## Files to modify
- `src/components/insights/LeagueInsightsContainer.tsx` — render `<DivisionMatchupsCard />` between the charts row and Top Performers.

## Notes
- Each match is counted exactly once (winner_id / loser_id), not double-counted from both perspectives.
- Matches with no winner_id (incomplete) are skipped naturally.
- No DB migration, no schema change, no edits to existing services or hooks.
- Read-only; respects existing RLS.
- Architecture follows the repo convention: Component → Hook (TanStack Query) → Service → Supabase.
