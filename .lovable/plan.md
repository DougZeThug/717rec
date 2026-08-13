# Lower the Power Score floor without moving the top

## The problem

The Great Cornholios win 21% of their matches and still collect about 29 of those 45 points, so they
land at 41.6 PWR — right next to teams with a far better record. Strength of schedule is meant to be
45% of the rating, not 45 free points for showing up.

## How "performance" is measured

"Performance" is a 0-to-1 blend of the two parts of the score that come from actual wins:

```text
performance = (40 x match win rate + 15 x game win rate) / 55
```

A .500 team with a normal game win rate is at 0.50. The Cornholios, at 21% match wins and 21% game wins,
sit around 0.21. The threshold is set at 0.30, so teams clearly below 30% of the possible win performance
lose some of their schedule credit, but teams above 30% keep it all.

## The fix

Make the schedule points **earned**, not free.

Match win rate (40 points) and game win rate (15 points) stay exactly as they are. The 45 schedule points
are multiplied by a schedule credit. The schedule credit is 1.0 for any team at or above 30% performance,
and it shrinks proportionally below that. Teams above 30% are unchanged. Teams with a terrible record lose
the free schedule points.

```text
performance    = (40 x match win rate + 15 x game win rate) / 55
schedule credit= min(1, performance / 0.30)
Power Score    = 40 x match win rate
               + 15 x game win rate
               + 45 x SOS x schedule credit
```

## What it does to real teams (career scores, live data)

| Team | Now | After |
|---|---|---|
| Cuzzo's Clinic | 86.7 | 86.7 |
| Jager Bombers | 78.1 | 78.1 |
| Pepperoni Cheesers | 69.6 | 69.6 |
| Buttery Nips | 64.9 | 64.9 |
| Zoo Pals | 62.1 | 62.1 |
| Miracle @ Marion | 59.3 | 59.3 |
| Here for Fireball | 46.1 | 43.9 |
| The Cornholy Trinity | 47.3 | 47.0 |
| Jerm | 42.2 | 30.9 |
| Killa Queens | 42.0 | 35.1 |
| The Great Cornholios | 43.3 | 37.1 |
| Corn Kitties | 34.2 | 18.4 |
| Smacked | 29.6 | 12.0 |

Teams above the 30% performance line are unchanged or within a point. The worst teams drop from a 30-45
cluster to a real 10-35 range, with the very bottom falling below 20. A hard schedule still helps — it just
no longer carries a team that never wins.

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
