-- Make the Standings record and power score cover the same games.
--
-- v_team_details showed a power score next to a W-L record drawn from a
-- different set of matches, and neither counted the playoffs. Both now read the
-- shared current-season match source, so a team's record and its rating describe
-- the same games.
--
-- Two visible consequences, both intended:
--   * Records include playoff games. A team that went 10-2 in the regular season
--     and 1-2 in the bracket now reads 11-4.
--   * The power score counts playoff results.
--
-- The formula itself is unchanged for teams with no playoff games:
-- v_power_score_components_current reproduces the definitions the inline
-- power_calc subquery used, and power_score_100 carries the same 40/45/15 weights
-- v_team_details already used.

-- v_team_details depends on v_team_match_stats, and v_team_strength_of_schedule
-- depends on both, so everything comes down and goes back up in order.
DROP VIEW IF EXISTS public.v_team_details CASCADE;
DROP VIEW IF EXISTS public.v_team_match_stats CASCADE;

-- ---------------------------------------------------------------------------
-- Record columns, now over the shared source rather than public.matches.
-- Every expression is otherwise identical to the baseline definition.
-- ---------------------------------------------------------------------------
CREATE VIEW public.v_team_match_stats
WITH (security_invoker = on)
AS
SELECT
  t.id AS team_id,
  COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0) AS wins,
  COALESCE(SUM(CASE WHEN m.loser_id = t.id THEN 1 ELSE 0 END), 0) AS losses,
  COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                    WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                    ELSE 0 END), 0) AS game_wins,
  COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                    WHEN m.team2_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                    ELSE 0 END), 0) AS game_losses,
  CASE WHEN COUNT(m.id) = 0 THEN 0
       ELSE COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0)::numeric
            / NULLIF(COUNT(m.id), 0)
  END AS win_percentage,
  CASE WHEN COALESCE(SUM(COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0)), 0) = 0 THEN 0
       ELSE COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                              WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                              ELSE 0 END), 0)::numeric
            / NULLIF(SUM(COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0)), 0)
  END AS game_win_percentage,
  COALESCE(SUM(CASE WHEN m.loser_id = t.id
                    AND CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                             ELSE COALESCE(m.team2_game_wins, 0) END > 0
                    THEN 1 ELSE 0 END), 0) AS close_match_losses,
  CASE WHEN COALESCE(SUM(d_opp.division_weight), 0) = 0 THEN 0
       ELSE COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN d_opp.division_weight ELSE 0 END), 0)
            / NULLIF(SUM(d_opp.division_weight), 0)
  END AS weighted_win_percentage,
  CASE WHEN COALESCE(SUM((COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0))
                         * d_opp.division_weight), 0) = 0 THEN 0
       ELSE COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                              WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                              ELSE 0 END * d_opp.division_weight), 0)
            / NULLIF(SUM((COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0))
                         * d_opp.division_weight), 0)
  END AS weighted_game_win_percentage
FROM public.teams t
LEFT JOIN public.v_power_score_match_source_current m
  ON (m.team1_id = t.id OR m.team2_id = t.id)
LEFT JOIN public.teams t_opp
  ON t_opp.id = CASE WHEN m.team1_id = t.id THEN m.team2_id
                     WHEN m.team2_id = t.id THEN m.team1_id END
LEFT JOIN public.divisions d_opp ON d_opp.id = t_opp.division_id
GROUP BY t.id;

COMMENT ON VIEW public.v_team_match_stats IS
  'Live-season team records, playoff games included, from v_power_score_match_source_current.';

-- ---------------------------------------------------------------------------
-- v_team_details, with the inline power_calc subquery replaced by the shared
-- components view. Column list and ordering unchanged.
-- ---------------------------------------------------------------------------
CREATE VIEW public.v_team_details
WITH (security_invoker = on)
AS
SELECT
    t.id AS team_id,
    t.name,
    t.logo_url,
    t.image_url,
    t.players,
    t.created_at,
    t.division_id,
    COALESCE(d.display_division, 'Recreational') AS divisionname,
    COALESCE(stats.win_percentage, 0) AS win_percentage,
    COALESCE(stats.game_win_percentage, 0) AS game_win_percentage,
    COALESCE(stats.wins, t.wins::bigint) AS wins,
    COALESCE(stats.losses, t.losses::bigint) AS losses,
    COALESCE(stats.game_wins, t.game_wins::bigint) AS game_wins,
    COALESCE(stats.game_losses, t.game_losses::bigint) AS game_losses,
    COALESCE(stats.close_match_losses, 0) AS close_match_losses,
    COALESCE(comp.weighted_win_pct, 0) AS weighted_win_percentage,
    COALESCE(comp.weighted_game_win_pct, 0) AS weighted_game_win_percentage,
    COALESCE(comp.sos, 0.5) AS sos,
    -- NULL for a team that has not played, exactly as the previous
    -- "COUNT(m.*) = 0 THEN NULL" branch did.
    CASE
      WHEN comp.team_id IS NULL OR comp.matches_played = 0 THEN NULL
      ELSE public.power_score_100(comp.weighted_win_pct, comp.sos, comp.weighted_game_win_pct)
    END AS power_score
FROM teams t
LEFT JOIN divisions d ON t.division_id = d.id
LEFT JOIN public.v_team_match_stats stats ON t.id = stats.team_id
LEFT JOIN public.v_power_score_components_current comp ON t.id = comp.team_id
ORDER BY t.name;

-- ---------------------------------------------------------------------------
-- Dependents, recreated verbatim.
-- ---------------------------------------------------------------------------
CREATE VIEW public.v_team_details_with_season
WITH (security_invoker = on)
AS
SELECT
    t.team_id,
    t.name,
    t.logo_url,
    t.image_url,
    t.players,
    t.wins,
    t.losses,
    t.game_wins,
    t.game_losses,
    t.created_at,
    t.division_id,
    t.divisionname,
    t.win_percentage,
    t.game_win_percentage,
    t.close_match_losses,
    t.weighted_win_percentage,
    t.weighted_game_win_percentage,
    t.sos,
    t.power_score,
    s.id as season_id
FROM v_team_details t
CROSS JOIN (SELECT id FROM seasons WHERE is_active = true LIMIT 1) s;

CREATE VIEW public.v_team_power_scores
WITH (security_invoker = on)
AS
SELECT
    team_id,
    name as team_name,
    division_id,
    wins,
    losses,
    game_wins,
    game_losses,
    win_percentage,
    game_win_percentage,
    close_match_losses,
    sos,
    power_score
FROM v_team_details;

-- Dropped by the cascade above. Recreated only when its own dependency exists;
-- nothing in the app reads it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_team_sos') THEN
    EXECUTE $v$
      CREATE VIEW public.v_team_strength_of_schedule AS
      SELECT
        t.id AS team_id,
        t.name AS team_name,
        t.division_id,
        s.wins,
        s.losses,
        s.game_wins,
        s.game_losses,
        s.win_percentage,
        s.game_win_percentage,
        s.close_match_losses,
        sos.sos
      FROM public.teams t
      LEFT JOIN public.v_team_match_stats s ON s.team_id = t.id
      LEFT JOIN public.v_team_sos sos ON sos.team_id = t.id
    $v$;
  END IF;
END $$;

GRANT SELECT ON public.v_team_match_stats TO anon, authenticated;
GRANT SELECT ON public.v_team_details TO anon, authenticated;
GRANT SELECT ON public.v_team_details_with_season TO anon, authenticated;
GRANT SELECT ON public.v_team_power_scores TO anon, authenticated;
