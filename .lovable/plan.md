# Lower the Power Score floor without moving the top

## The problem

Today every team gets **45 free points** for strength of schedule, no matter how they play.
A team that wins 21% of its matches still collects about 29 of those 45 points, so it lands near 41 PWR
while a solid team lands near 66. Bad records look close to good records because most of the score
is not earned — it is given for showing up against a normal schedule.

## The fix

Make the schedule points **earned**, not free.

- Match win rate (40 points) and game win rate (15 points) stay exactly as they are.
- The 45 schedule points get multiplied by how much of those 55 performance points the team earned.
- Teams at or above **65% performance keep the full 45 points**, so the top of the table does not move.
- Below that line the schedule credit shrinks in proportion, so weak teams fall away.

```text
performance    = (40 x match win rate + 15 x game win rate) / 55
schedule credit= min(1, performance / 0.65)
Power Score    = 40 x match win rate
               + 15 x game win rate
               + 45 x SOS x schedule credit
```

## What it does to real teams (career scores, live data)

| Team | Now | After |
|---|---|---|
| Cuzzo's Clinic | 86.7 | 86.7 |
| Offdogs | 83.7 | 83.7 |
| Degeneration X | 81.3 | 81.3 |
| Jager Bombers | 78.1 | 76.6 |
| Pepperoni Cheesers | 69.5 | 62.6 |
| Buttery Nips | 64.5 | 62.4 |
| Here for Fireball | 46.1 | 34.1 |
| Killa Queens | 41.3 | 27.2 |
| The Great Cornholios | 41.6 | 21.2 |
| Smacked | 29.6 | 8.2 |

Top three do not move. The bottom drops from a 30-40 cluster to a real 8-30 spread.
A hard schedule still helps — it just no longer carries a losing team.

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