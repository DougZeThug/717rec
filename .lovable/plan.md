## Problem

In `supabase/migrations/00000000000000_baseline.sql`, the `v_team_match_stats.weighted_game_win_percentage` expression (lines 1169–1172) is an exact copy of `weighted_win_percentage` above it. Both compute:

```
SUM(match_wins * opp_division_weight) / SUM(opp_division_weight)
```

So the "game" variant returns the same number as the match variant. Whenever match wins and game wins diverge (e.g. a team loses a match 1–2, or wins 2–1), the reported weighted game-win percentage is wrong. The baseline also seeds `ranking_snapshots` from this view (lines 1496–1502), so a fresh CI rebuild persists the bad value.

The live project's later migrations (`20250610175740…`, `20251002122723…`, `20260330152902…`) already compute this correctly inside `v_team_details` using game-win totals weighted by opponent division. The baseline view just wasn't updated to match.

## Fix

Rewrite the `weighted_game_win_percentage` branch in `v_team_match_stats` so numerator and denominator both come from per-side game-win totals, weighted by `d_opp.division_weight`:

- Numerator: for each completed match, add `team_game_wins_for_t * d_opp.division_weight`.
- Denominator: for each completed match, add `(team1_game_wins + team2_game_wins) * d_opp.division_weight` (total games in the match, weighted by opponent strength).
- Keep the `NULLIF` / `COALESCE` guards and the outer `CASE WHEN … = 0 THEN 0` so teams with no completed matches still return `0`.
- No other columns, joins, or grouping change. `weighted_win_percentage` stays as-is.

### SQL sketch (single hunk inside the existing `CREATE VIEW` DO block)

```sql
CASE WHEN COALESCE(SUM((COALESCE(m.team1_game_wins,0) + COALESCE(m.team2_game_wins,0))
                       * d_opp.division_weight), 0) = 0 THEN 0
     ELSE COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins,0)
                            WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins,0)
                            ELSE 0 END * d_opp.division_weight), 0)
          / NULLIF(SUM((COALESCE(m.team1_game_wins,0) + COALESCE(m.team2_game_wins,0))
                       * d_opp.division_weight), 0)
END AS weighted_game_win_percentage
```

## Safety / scope

- Change is confined to one CASE expression inside the guarded `CREATE VIEW public.v_team_match_stats` block in the baseline. The block is still gated by the existing `IF NOT EXISTS` check, so live production (where the view already exists) remains a no-op.
- No later migration recreates `v_team_match_stats`, so this is the definition CI uses end-to-end.
- Verification: `npm run knip` / `npm run lint` unaffected; the Supabase CI workflow's `db-apply-and-smoke` job will replay migrations against a fresh Postgres and exercise the view — that's the signal to watch after the change.
