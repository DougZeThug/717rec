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

There are two SQL definitions. Standings, team pages and per-season records use
`power_score_100()`. Career rankings use `power_score_100_career()`.

**Standings / season — `power_score_100()`** (no floor):

```
Power Score = (weighted match win rate × 40)
            + (weighted game win rate   × 15)
            + (strength of schedule     × 45)
```

**Career — `power_score_100_career()`** (earned schedule credit):

```
performance = (weighted match win rate × 40 + weighted game win rate × 15) / 55
scheduleCredit = min(1, performance / 0.30)

Career Power Score = (weighted match win rate × 40)
                   + (weighted game win rate   × 15)
                   + (strength of schedule     × 45 × scheduleCredit)
```

A single rough season should not crush a live standing, so the floor applies only
to the long-run career rating. `v_team_details` and `v_team_season_agg` expose both
numbers: `power_score` (plain) and `career_power_score` (floored). `team_season_stats`
stores both per season.

| Term | Meaning |
|------|---------|
| **Weighted match win rate** | `SUM(win × opponent division weight) / SUM(opponent division weight)`. A true weighted average on a 0-1 scale. Beating a strong opponent counts more than beating a weak one, but winning every match still reads as 1.0 whoever you played. |
| **Strength of schedule (SOS)** | Average `division_weight` of the opponents faced, clamped to `[0.1, 1.0]`. This is the term that rewards a harder schedule. It is **not** the average power score of opponents. |
| **Weighted game win rate** | `SUM(game wins × opponent weight) / SUM(total games × opponent weight)`. Same weighted-average shape as the match term. |
| **Performance** (career only) | The blend of the two win-rate terms on a 0-1 scale. A team at 0.30 performance keeps 100% of its SOS credit; a team at 0.15 performance keeps 50%. This lowers the career floor for teams with very poor long-run records without touching teams above the threshold. |

### Division weights

> **Never copy weight values into code, tests, or documentation.** `divisions`
> is edited through the admin UI (`src/services/DivisionService.ts`), so it holds
> rows and values no migration ever created. The values seeded in the migrations
> are **not** the live ones. Always resolve a `division_id` and read
> `divisions.division_weight`. The live table is the only source of truth, and
> the admin Divisions screen is the place to see it.

Weights are versioned in `division_weight_history`, written by a trigger on
`divisions`. A match is rated with the weight that was in effect **on the match
date**, so re-weighting a division no longer rewrites finished seasons. That
history starts at the migration that introduced it — earlier weight edits were
never recorded.

No division carries weight `1.0`, so the SOS term caps below 45 points and a
perfect team lands short of 100. The exact ceiling is
`100 × (top division weight)` and moves if you re-weight.

### Which division a team counts as

An opponent is rated by the division they were in **when the match was played**,
not the division they sit in today. This matters because there is no "withdrawn"
flag: a team that drops out is moved to the `Hidden` division, which overwrites
their real division with no history.

`v_power_score_team_matches_rated` resolves this through a chain, and **every
step returns a real `divisions.id`** — no step turns a division *name* into a
weight. Names cannot be reversed: `division_name` has several writers with
different meanings, and for a season with two brackets in one display division
it holds synthetic strings like `'Intermediate 1'` that match no row in
`divisions` at all.

| Priority | Source | `resolved_by` |
|---|---|---|
| 1 | newest weekly snapshot at or before the match date | `snapshot_at_date` |
| 2 | earliest snapshot that season | `snapshot_earliest_in_season` |
| 3 | `team_details_archive.division_id`, cross-checked against `divisionname` | `archive_division_id` |
| 4 | playoff bracket participation | `bracket_division_id` |
| 5 | current `teams.division_id` | `current_division` |
| 6 | last division ever observed for that team | `last_known_division` |
| 7 | nothing resolves → dropped from the weighted terms only | `unresolved` |

Hidden and weightless divisions are filtered out by `v_division_rateable`, so
the chain can never resolve to one. Seasons listed in
`division_archive_distrust` skip step 3.

Coverage is inspectable:

```sql
SELECT resolved_by, count(*) FROM v_power_score_team_matches_rated GROUP BY 1;
```

**W-L records are never affected** — `matches_played`, `wins`, `losses`,
`game_wins` and `game_losses` count every match, including unresolved ones.
Only the three weighted terms filter.

Keeping Hidden teams out of public listings is a separate, read-layer concern:
the frontend skips them in `src/utils/teamGrouping.ts` and the MCP
`get_standings` / `list_teams` tools skip them via `isHiddenDivision()`. A
Hidden team still gets a rating of its own, because
`useCareerRankingsWithHidden` and the admin power-migration comparison fetch
them deliberately and expect a number.

### Archived seasons are frozen

Once `seasons.is_archived` is true, `upsert_team_season_stats()` stops updating
that season's `power_score`, `sos` and `division_name`. Nothing you edit
afterwards — a division, a weight, a team — can move a finished season. Use
`admin_recompute_season_power(season_id)` for a deliberate repair.

## Career Power Score

Career score is a **different** number, computed client-side in
`src/utils/career/calculateCareerPowerScore.ts`. It is not the season formula.

```
Career = weighted average of season Power Scores   (weighted by matches played)
       + playoff bonuses                            (capped by division strength)
```

Bonuses:

| Bonus | Value |
|---|---|
| Championship | `7 × weight²` |
| Runner-up | `4 × weight²` |
| Playoff record over .500 | `(winRate − 0.5) × 4 × weight` |
| Competitive playoff win | `+0.5` each |

`weight` is the **live** `divisions.division_weight` of the division the result
happened in — resolved in `src/utils/career/divisionBonusWeight.ts`, never
hardcoded. Only the *name* mapping lives in code, because
`team_season_stats.division_name` holds synthetic labels ("Intermediate 1",
"Intermediate 2") that match no row in `divisions`.

The title and runner-up bonuses are **squared** on purpose. The base career
score already carries schedule strength through the season SOS term, so a
linear bonus let a team that dominated a soft division out-earn a mid-pack
Competitive team. Squaring keeps a Competitive title at full value while
shrinking a soft-field title toward the schedule it was won against.

The total bonus cap is also **scaled by division strength**:

```
Cap = 15 × (max weight of divisions where bonuses were earned)²
```

A team that won three titles in Intermediate (weight 0.7) can gain at most
`15 × 0.7² = 7.35` bonus points, while a team that earned its bonuses in
Competitive (weight 1.0) can gain the full 15. This prevents a pile of soft-
division titles from saturating the same ceiling as a strong-division record.

If no title, runner-up, or playoff division is provided, the cap falls back to
`15 × (current division weight)²`, so the limit is always tied to a real division.

## Data Flow

```
matches + playoff_matches
        ↓
v_power_score_match_source            (shared match set; byes excluded)
        ↓
v_power_score_team_matches            (one row per team per match, + match_date)
        ↓
v_power_score_team_matches_rated      (+ opponent division AS OF match_date,
                                         its weight as of the same date,
                                         and resolved_by)
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
`team_season_stats`. It takes no season parameter — it re-derives every season
on every call, so a formula change propagates broadly at once. **Archived
seasons are exempt**: their `power_score`, `sos` and `division_name` are frozen
(see above).

## Utilities in This Directory

| File | Purpose |
|------|---------|
| `normalizePowerScore.ts` | Converts between 0-1 and 0-100 scales |
| `formatPowerScore.ts` | Renders a score to 1 decimal, `—` when null |
| `getTrendingTeams.ts` | Finds teams with biggest recent power score gains |

## Related Code

- `src/utils/colors/powerScoreColors.ts` — color bands and the `stroke-*` ring
  variant. Both share one set of thresholds (85/70/60/50/40/30/20). The bands
  did not need to change when the floor was lowered; they already cover the full
  0-100 range and now bottom-tier teams will simply fall into the red/purple
  bands they previously could not reach.
- `supabase/migrations/20260809120000_power_score_shared_match_source.sql` —
  `power_score_100()` and the component views
- `supabase/migrations/20260811210000_power_score_weighted_denominators.sql` —
  weighted denominators
- `supabase/migrations/20260812130000_power_score_historical_opponent_division.sql`
  — the resolution chain, `division_weight_history`, and the archived-season
  freeze
- `supabase/migrations/20260813000000_earned_schedule_power_score.sql` — the
  earned-schedule floor adjustment (this change)
- `src/integrations/supabase/types.ts` — auto-generated, never edit by hand
