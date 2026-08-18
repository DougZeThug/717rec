# Put the power score floor back on Career only

## What you asked for

- The **30% earned-schedule floor** should stay for **Career** rankings.
- **Current standings** should go back to the old, softer formula. A single bad season should not crush a team.

## What is happening now

One SQL function, `power_score_100()`, feeds **both** places:

```text
matches -> v_team_details      -> Standings (current season)
        -> v_team_season_agg   -> team_season_stats -> History + Career
```

The floor was added inside that one function, so it hit Standings too.

## The fix: two formulas, one per audience

1. **Restore `power_score_100()`** to the additive form (no floor). Standings, History and season records go back to the numbers you had before 13 Aug.

   ```text
   Power Score = 40 x match win rate + 15 x game win rate + 45 x SOS
   ```

2. **Add a new `power_score_100_career()`** with the floor exactly as it works today.

   ```text
   performance     = (40 x match win rate + 15 x game win rate) / 55
   schedule credit = min(1, performance / 0.30)
   Career Score    = 40 x match win rate + 15 x game win rate + 45 x SOS x schedule credit
   ```

3. **Carry both numbers per season.** Add a `career_power_score` column beside the existing `power_score` in the season views and the season stats table, so Career reads the floored value and every other page reads the plain one. Career numbers stay exactly as they are today.

## What changes on screen

| Page | Before this fix | After |
|---|---|---|
| Standings (current season) | floored, weak teams near 0 | back to pre-floor values |
| Team page / History season rows | floored | back to pre-floor values |
| Career rankings | floored | unchanged (still floored) |

## Technical changes

1. **Migration**
   - Snapshot `team_season_stats` again before any write (same backup pattern as `20260813165602`).
   - `CREATE OR REPLACE public.power_score_100(...)` back to the additive form.
   - `CREATE FUNCTION public.power_score_100_career(p_weighted_win_pct, p_sos, p_weighted_game_win_pct)` with the `LEAST(1.0, performance / 0.30)` credit.
   - Add `career_power_score` to `v_team_season_agg` and `v_team_details` (recreate the views, `security_invoker = on` preserved).
   - `ALTER TABLE public.team_season_stats ADD COLUMN career_power_score numeric`.
   - Update `upsert_team_season_stats(boolean)` to write `career_power_score`, using the same archived-season freeze rules as `power_score`.
   - Backfill both columns for every season, then re-run `admin_recompute_season_power()` per season.
2. **Career read path** — select and use `career_power_score` (fall back to `power_score` when null) in:
   - `src/services/career/CareerQueryService.ts`
   - `src/services/career/CareerBulkFetchService.ts`
   - `src/utils/career/calculateCareerPowerScore.ts` (both the historical seasons loop and the current-season term)
3. **Types** — regenerate `src/integrations/supabase/types.ts`.
4. **Colors** — recheck `src/utils/colors/powerScoreColors.ts`; standings bands go back to the old spread, Career keeps the wider low end.
5. **Docs** — update `src/utils/powerScore/README.md` to describe the two formulas and where each is used.
6. **Tests** — cases for: standings formula unchanged by a poor record, career formula still applies the credit, career and standings differ for a sub-30% team and match for a strong team.

## Not changing

- Career playoff bonuses, the division-squared cap and division weights.
- Win-loss records, SOS values, and the 40/15/45 weights themselves.
