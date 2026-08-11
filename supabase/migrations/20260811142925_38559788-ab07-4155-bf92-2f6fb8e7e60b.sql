-- Move get_season_team_power_scores onto the canonical formula and match source.
--
-- This function feeds power_score_snapshots, which is what the homepage Movers
-- section diffs week to week. Two things change:
--
--   1. Playoff results now count. Previously the function joined public.matches
--      only, so once the regular season ended nothing moved and every mover
--      showed +0.0.
--   2. The weights go from 40/40/20 to the canonical 40/45/15, so the Movers
--      number and the Standings number are finally on the same scale.
--
-- The component definitions are unchanged -- v_power_score_components reproduces
-- what this function already computed -- so a team with no playoff games sees a
-- change only from the weight correction.
--
-- The four repeated LEFT JOIN subqueries the function used to carry are gone;
-- the components view computes all of them once.

CREATE OR REPLACE FUNCTION public.get_season_team_power_scores(p_season_id uuid)
RETURNS TABLE(
  team_id uuid,
  power_score numeric,
  sos numeric,
  wins bigint,
  losses bigint,
  game_wins bigint,
  game_losses bigint,
  division_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS team_id,
    public.power_score_100(c.weighted_win_pct, c.sos, c.weighted_game_win_pct) AS power_score,
    COALESCE(c.sos, 0.5) AS sos,
    COALESCE(c.wins, 0) AS wins,
    COALESCE(c.losses, 0) AS losses,
    COALESCE(c.game_wins, 0) AS game_wins,
    COALESCE(c.game_losses, 0) AS game_losses,
    t.division_id
  FROM public.teams t
  JOIN public.v_power_score_components c
    ON c.team_id = t.id
   AND c.season_id = p_season_id
  -- Filter out teams that opted out
  LEFT JOIN public.team_season_opt_out tso
    ON t.id = tso.team_id AND tso.season_id = p_season_id
  WHERE tso.team_id IS NULL
    AND c.matches_played > 0;
END;
$function$;

COMMENT ON FUNCTION public.get_season_team_power_scores(uuid) IS
  'Season power scores from the canonical formula and match source, playoffs '
  'included. Feeds power_score_snapshots via the capture-power-snapshots function.';