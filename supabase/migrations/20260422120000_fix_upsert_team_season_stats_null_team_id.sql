-- ============================================================
-- Fix upsert_team_season_stats() to skip NULL team_id / season_id rows
--
-- v_team_season_agg can emit rows where team_id is NULL (e.g. from
-- playoff bye advancements where winner_id is set but one team slot
-- is NULL). Those rows caused archive_season, partial_archive_season,
-- and finalize_playoffs to crash with:
--   null value in column "team_id" of relation "team_season_stats"
--   violates not-null constraint
--
-- Minimal fix: filter NULL team_id / season_id out of the INSERT
-- source. The view itself is left untouched because other read paths
-- (standings, insights, rankings) consume it.
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_team_season_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     sos, power_score, division_name, recorded_at)
  SELECT
    season_id, team_id, match_wins::integer, match_losses::integer,
    game_wins::integer, game_losses::integer, sos, power_score,
    division_name,
    now()
  FROM v_team_season_agg
  WHERE team_id IS NOT NULL
    AND season_id IS NOT NULL
  ON CONFLICT (season_id, team_id) DO UPDATE
  SET
    match_wins = EXCLUDED.match_wins,
    match_losses = EXCLUDED.match_losses,
    game_wins = EXCLUDED.game_wins,
    game_losses = EXCLUDED.game_losses,
    sos = EXCLUDED.sos,
    power_score = EXCLUDED.power_score,
    -- Only update division_name if the season is NOT archived
    division_name = CASE
      WHEN EXISTS (
        SELECT 1 FROM public.seasons s
        WHERE s.id = EXCLUDED.season_id AND s.is_archived = true
      ) THEN team_season_stats.division_name
      ELSE EXCLUDED.division_name
    END,
    recorded_at = now();
END;
$$;
