
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
    -- 40/40/20 POWER SCORE FORMULA - NULL for teams with no matches in this season
    CASE 
      WHEN match_counts.total_matches = 0 THEN NULL
      ELSE (
        (COALESCE(weighted_match_stats.weighted_win_percentage, 0) * 40.0) +
        (COALESCE(sos_component.sos, 0.5) * 40.0) +
        (COALESCE(weighted_game_stats.weighted_game_win_percentage, 0) * 20.0)
      )
    END AS power_score,
    COALESCE(sos_component.sos, 0.5) AS sos,
    COALESCE(match_counts.win_count, 0) AS wins,
    COALESCE(match_counts.loss_count, 0) AS losses,
    COALESCE(match_counts.gw_count, 0) AS game_wins,
    COALESCE(match_counts.gl_count, 0) AS game_losses,
    t.division_id
  FROM public.teams t
  -- Filter out teams that opted out
  LEFT JOIN public.team_season_opt_out tso ON t.id = tso.team_id AND tso.season_id = p_season_id
  -- Match counts for this season
  LEFT JOIN (
    SELECT 
      sub_t.id AS tid,
      COUNT(m.*)::bigint AS total_matches,
      SUM(CASE WHEN m.winner_id = sub_t.id THEN 1 ELSE 0 END)::bigint AS win_count,
      SUM(CASE WHEN m.iscompleted = true AND m.winner_id IS NOT NULL AND m.winner_id != sub_t.id THEN 1 ELSE 0 END)::bigint AS loss_count,
      SUM(CASE WHEN m.team1_id = sub_t.id THEN COALESCE(m.team1_game_wins, 0)
               WHEN m.team2_id = sub_t.id THEN COALESCE(m.team2_game_wins, 0)
               ELSE 0 END)::bigint AS gw_count,
      SUM(CASE WHEN m.team1_id = sub_t.id THEN COALESCE(m.team2_game_wins, 0)
               WHEN m.team2_id = sub_t.id THEN COALESCE(m.team1_game_wins, 0)
               ELSE 0 END)::bigint AS gl_count
    FROM public.teams sub_t
    LEFT JOIN public.matches m ON (sub_t.id = m.team1_id OR sub_t.id = m.team2_id) 
      AND m.iscompleted = true 
      AND m.season_id = p_season_id
    GROUP BY sub_t.id
  ) match_counts ON t.id = match_counts.tid
  -- Weighted match win percentage
  LEFT JOIN (
    SELECT 
      sub_t.id AS tid,
      CASE 
        WHEN COUNT(m.*) = 0 THEN 0
        ELSE (
          SUM(CASE WHEN m.winner_id = sub_t.id THEN d_opp.division_weight ELSE 0 END) / 
          NULLIF(COUNT(m.*), 0)
        )
      END AS weighted_win_percentage
    FROM public.teams sub_t
    LEFT JOIN public.matches m ON (sub_t.id = m.team1_id OR sub_t.id = m.team2_id) 
      AND m.iscompleted = true 
      AND m.season_id = p_season_id
    LEFT JOIN public.teams t_opp ON (
      CASE 
        WHEN m.team1_id = sub_t.id THEN m.team2_id 
        WHEN m.team2_id = sub_t.id THEN m.team1_id 
      END = t_opp.id
    )
    LEFT JOIN public.divisions d_opp ON t_opp.division_id = d_opp.id
    GROUP BY sub_t.id
  ) weighted_match_stats ON t.id = weighted_match_stats.tid
  -- SOS
  LEFT JOIN (
    SELECT 
      sub_t.id AS tid,
      CASE 
        WHEN COUNT(DISTINCT opp.id) = 0 THEN 0.5
        ELSE GREATEST(0.1, LEAST(1.0, AVG(COALESCE(d_opp.division_weight, 0.85))))
      END AS sos
    FROM public.teams sub_t
    LEFT JOIN public.matches m ON (sub_t.id = m.team1_id OR sub_t.id = m.team2_id) 
      AND m.iscompleted = true 
      AND m.season_id = p_season_id
    LEFT JOIN public.teams opp ON (
      CASE 
        WHEN m.team1_id = sub_t.id THEN m.team2_id 
        WHEN m.team2_id = sub_t.id THEN m.team1_id 
      END = opp.id
    )
    LEFT JOIN public.divisions d_opp ON opp.division_id = d_opp.id
    GROUP BY sub_t.id
  ) sos_component ON t.id = sos_component.tid
  -- Weighted game win percentage
  LEFT JOIN (
    SELECT 
      sub_t.id AS tid,
      CASE 
        WHEN SUM(CASE WHEN m.team1_id = sub_t.id THEN COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0)
                      WHEN m.team2_id = sub_t.id THEN COALESCE(m.team2_game_wins, 0) + COALESCE(m.team1_game_wins, 0)
                      ELSE 0 END) = 0 THEN 0
        ELSE (
          SUM(CASE WHEN m.team1_id = sub_t.id THEN COALESCE(m.team1_game_wins, 0) * d_opp.division_weight
                   WHEN m.team2_id = sub_t.id THEN COALESCE(m.team2_game_wins, 0) * d_opp.division_weight
                   ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN m.team1_id = sub_t.id THEN COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0)
                         WHEN m.team2_id = sub_t.id THEN COALESCE(m.team2_game_wins, 0) + COALESCE(m.team1_game_wins, 0)
                         ELSE 0 END), 0)
        )
      END AS weighted_game_win_percentage
    FROM public.teams sub_t
    LEFT JOIN public.matches m ON (sub_t.id = m.team1_id OR sub_t.id = m.team2_id) 
      AND m.iscompleted = true 
      AND m.season_id = p_season_id
    LEFT JOIN public.teams t_opp ON (
      CASE 
        WHEN m.team1_id = sub_t.id THEN m.team2_id 
        WHEN m.team2_id = sub_t.id THEN m.team1_id 
      END = t_opp.id
    )
    LEFT JOIN public.divisions d_opp ON t_opp.division_id = d_opp.id
    GROUP BY sub_t.id
  ) weighted_game_stats ON t.id = weighted_game_stats.tid
  WHERE tso.team_id IS NULL
    AND match_counts.total_matches > 0;
END;
$function$;
