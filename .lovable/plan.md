## Goal

Bring the denormalized `playoff_team_records` rows for the 4 affected teams back in sync with the corrected `playoff_matches` data, so the Final Standings card on the Playoffs page shows the correct per-team W/L/GW/GL. Keep `placement` values as-is so the standings still reflect how far each team actually advanced on the court.

## Data update (insert tool, single SQL batch)

Bracket: Competitive Spring 2026 (`43fca940-1e6e-450e-9992-b05e7c61ec6b`).

| Team | wins | losses | game_wins | game_losses | placement |
|---|---|---|---|---|---|
| Pepperoni Cheesers (`c9d6…`) | 2 | 2 | 4 | 4 | 8 (unchanged) |
| Bumbleweed (`37bf…`) | 1 | 3 | 3 | 5 | 6 (unchanged) |
| Hole Burners (`a882…`) | 1 | 2 | 3 | 4 | 9 (unchanged) |
| Hole Violators (`f243…`) | 1 | 3 | 5 | 5 | 4 (unchanged) |

Four `UPDATE` statements against `playoff_team_records`, scoped to the bracket id + each team id.

## Verification

After the update I'll run a quick SELECT to confirm the four rows match the table above, then you can refresh the Playoffs page to spot-check the Final Standings card.

## Out of scope

- No changes to `placement` values (Bumbleweed/Violators keep their higher slots since they actually played and lost those later games).
- No changes to `team_season_stats.playoff_rank` (matches placements, also unchanged).
- No code changes.
