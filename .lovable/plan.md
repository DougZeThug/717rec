# Lower the Power Score floor without moving the top

## The problem

Today every team gets **45 free points** for strength of schedule, no matter how they play.
The Great Cornholios win 21% of their matches and still collect about 29 of those 45 points, so they
land at 41.6 PWR — right next to teams with a far better record. Strength of schedule is meant to be
45% of the rating, not 45 free points for showing up.

## The fix

Make the schedule points **earned**, not free.

- Match win rate (40 points) and game win rate (15 points) stay exactly as they are.
- The 45 schedule points get multiplied by how much of those 55 performance points the team earned,
  but the multiplier tops out early so only the bottom is affected.
- Any team at or above **35% performance keeps the full 45 points** — everyone from mid-table up is
  unchanged, or moves less than a point.
- Below that line the schedule credit shrinks in proportion. A team with a godawful record no longer
  gets a free 29 points for playing a normal schedule.

```text
performance    = (40 x match win rate + 15 x game win rate) / 55
schedule credit= min(1, performance / 0.35)
Power Score    = 40 x match win rate
               + 15 x game win rate
               + 45 x SOS x schedule credit
```

## What it does to real teams (career scores, live data)

| Team | Now | After |
|---|---|---|
| Team | Now | After |
|---|---|---|
| Cuzzo's Clinic | 86.7 | 86.7 |
| Jager Bombers | 78.1 | 78.1 |
| Pepperoni Cheesers | 69.5 | 69.5 |
| Buttery Nips | 64.5 | 64.3 |
| Zoo Pals | 62.1 | 62.1 |
| Miracle @ Marion | 59.3 | 59.3 |
| Here for Fireball | 46.1 | 42.9 |
| Jerm | 42.0 | 30.2 |
| Killa Queens | 41.3 | 32.6 |
| The Great Cornholios | 41.6 | 29.5 |
| Corn Kitties | 34.3 | 17.3 |
| Smacked | 29.6 | 11.0 |

Everything from mid-table up is unchanged or within a point. The bottom stops sitting in a
30-45 cluster next to decent teams and spreads out from about 10 to 30.
A hard schedule still helps — it just no longer carries a team that never wins.

## Technical changes

1. **Migration** — replace `public.power_score_100()` with the earned-schedule form above.
   The signature and the three inputs stay the same, so every dependent view
   (`v_team_details`, `v_team_season_agg`, `get_season_team_power_scores`) picks it up with no other edit.
2. **Backfill** — take a backup snapshot table first (same pattern as the earlier power-score
   rollouts), then run `admin_recompute_season_power()` per season so archived seasons,
   `team_season_stats`, History and Career all show the new numbers.
3. **Colors** — review `src/utils/colors/powerScoreColors.ts` bands (85/70/60/50/40/30/20).
   With a real floor more teams land in the red bands; confirm the standings rings still read well.
4. **Docs** — update the formula section of `src/utils/powerScore/README.md`.
5. **Tests** — add power-score cases: full credit at high performance, reduced credit at low
   performance, unchanged output for a perfect team.

## Not changing

- Career bonuses, caps and division weighting stay as they are.
- Win-loss records, SOS values and the division-weight resolution chain are untouched.