# Power Score System

The Power Score is 717REC's team rating. It combines how often you win, how
strong your opponents were, and how many individual games you take, into a
single 0-100 number.

## Scale and Storage

| Context | Scale | Example |
|---------|-------|---------|
| Database (`team_season_stats`) | 0-1 | `0.858` |
| View (`v_team_details`) | 0-100 | `85.8` |
| UI Display | 0-100 | `85.8` |

The `normalizePowerScore()` utility handles conversion between these scales.

`power_score` is **nullable**. The view returns `NULL` for a team that has not
played a match, and for teams in the Hidden division. Always handle null —
`formatPowerScore()` renders `—` for it.

## Calculation Formula

There is exactly one definition, the `power_score_100()` SQL function:

```
Power Score = (weighted match win rate × 40)
            + (strength of schedule     × 45)
            + (weighted game win rate   × 15)
```

| Term | Meaning |
|------|---------|
| **Weighted match win rate** | `SUM(win × opponent division weight) / SUM(opponent division weight)`. A true weighted average on a 0-1 scale. Beating a strong opponent counts more than beating a weak one, but winning every match still reads as 1.0 whoever you played. |
| **Strength of schedule (SOS)** | Average `division_weight` of the opponents faced, clamped to `[0.1, 1.0]`. This is the term that rewards a harder schedule. It is **not** the average power score of opponents. |
| **Weighted game win rate** | `SUM(game wins × opponent weight) / SUM(total games × opponent weight)`. Same weighted-average shape as the match term. |

### Division weights

Set per division in the `divisions` table. Opponents with no division default
to `0.85` (mirrored client-side as `DEFAULT_DIVISION_WEIGHT` in
`src/utils/rankingUtils/divisionWeightsCache.ts`).

| Division | Weight |
|---|---|
| Competitive Low | 0.925 |
| cuspers | 0.90 |
| Intermediate High | 0.85 |
| Hidden2 | 0.75 |
| Intermediate Low | 0.60 |
| Recreational High | 0.50 |
| Hidden | -1.0 (sentinel — excluded from all rating maths) |

Because no division reaches weight 1.0, the SOS term caps below 45 points, so a
perfect Competitive team lands near 97 rather than exactly 100. The realistic
league range is roughly 22 to 97.

### Hidden teams

Matches against Hidden-division teams are excluded from all three weighted
terms, in both numerator and denominator, so they neither help nor hurt. W-L
records are unaffected — `matches_played`, `wins`, `losses`, `game_wins` and
`game_losses` still count every match.

The exclusion is one-directional: a Hidden team still gets a rating of its own
from whoever it played, because `useCareerRankingsWithHidden` and the admin
power-migration comparison fetch Hidden teams deliberately and expect a number.
Keeping them out of public listings is a read-layer concern — the frontend
skips them in `src/utils/teamGrouping.ts`, and the MCP `get_standings` /
`list_teams` tools skip them via `isHiddenDivision()`.

## Data Flow

```
matches + playoff_matches
        ↓
v_power_score_match_source            (shared match set; byes excluded)
        ↓
v_power_score_team_matches            (one row per team per match)
        ↓
v_power_score_components              (weighted_win_pct, sos, weighted_game_win_pct)
        ↓
power_score_100()                     ← the only place the 40/45/15 weights live
        ↓
   ┌────┴─────────────────────┬──────────────────────────┐
v_team_details (0-100)   v_team_season_agg (0-1)   get_season_team_power_scores
   ↓                          ↓                          ↓
Standings UI            team_season_stats          power_score_snapshots
                        (History, Career)          (trends, movers)
```

`upsert_team_season_stats()` copies `v_team_season_agg.power_score` into
`team_season_stats`. It takes no season parameter — it re-derives **every**
season on every call, so a formula change propagates to all history at once.

## Utilities in This Directory

| File | Purpose |
|------|---------|
| `normalizePowerScore.ts` | Converts between 0-1 and 0-100 scales |
| `formatPowerScore.ts` | Renders a score to 1 decimal, `—` when null |
| `getTrendingTeams.ts` | Finds teams with biggest recent power score gains |

## Related Code

- `src/utils/colors/powerScoreColors.ts` — color bands and the `stroke-*` ring
  variant. Both share one set of thresholds (85/70/60/50/40/30/20).
- `supabase/migrations/20260809120000_power_score_shared_match_source.sql` —
  `power_score_100()` and the component views
- `supabase/migrations/20260811210000_power_score_weighted_denominators.sql` —
  weighted denominators and the Hidden exclusion
- `src/integrations/supabase/types.ts` — auto-generated, never edit by hand
