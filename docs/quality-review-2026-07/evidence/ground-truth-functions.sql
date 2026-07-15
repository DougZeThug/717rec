CREATE OR REPLACE FUNCTION public.approve_match_result(p_match_id uuid, p_winner_id uuid, p_loser_id uuid, p_winner_game_wins integer DEFAULT 0, p_loser_game_wins integer DEFAULT 0)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_rows integer;
  v_winner_rows integer;
  v_loser_rows integer;
BEGIN
  -- Require admin
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Idempotent: only update if not already approved
  UPDATE public.matches
  SET winner_id = p_winner_id, loser_id = p_loser_id
  WHERE id = p_match_id AND winner_id IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN false; -- already approved or match not found
  END IF;

  -- Validate teams exist
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_winner_id) THEN
    RAISE EXCEPTION 'Winner team not found: %', p_winner_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_loser_id) THEN
    RAISE EXCEPTION 'Loser team not found: %', p_loser_id;
  END IF;

  -- Update winner stats (inline, same logic as update_team_stats)
  UPDATE public.teams
  SET
    wins = COALESCE(wins, 0) + 1,
    game_wins = COALESCE(game_wins, 0) + COALESCE(p_winner_game_wins, 0),
    game_losses = COALESCE(game_losses, 0) + COALESCE(p_loser_game_wins, 0)
  WHERE id = p_winner_id;
  GET DIAGNOSTICS v_winner_rows = ROW_COUNT;

  -- Update loser stats
  UPDATE public.teams
  SET
    losses = COALESCE(losses, 0) + 1,
    game_wins = COALESCE(game_wins, 0) + COALESCE(p_loser_game_wins, 0),
    game_losses = COALESCE(game_losses, 0) + COALESCE(p_winner_game_wins, 0)
  WHERE id = p_loser_id;
  GET DIAGNOSTICS v_loser_rows = ROW_COUNT;

  IF (v_winner_rows + v_loser_rows) <> 2 THEN
    RAISE EXCEPTION 'Expected to update 2 teams but updated % rows', (v_winner_rows + v_loser_rows);
  END IF;

  -- Refresh season stats
  PERFORM public.upsert_team_season_stats();

  RETURN true;
END;
$function$
=== REVERSE ===
CREATE OR REPLACE FUNCTION public.reverse_team_stats(p_winner_id uuid, p_loser_id uuid, p_winner_game_wins integer DEFAULT 0, p_loser_game_wins integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_result JSON;
  v_winner_rows INT;
  v_loser_rows INT;
BEGIN
  -- SECURITY: Require admin access
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RAISE NOTICE 'REVERSE TEAM STATS: Winner % (-1W, -%GW), Loser % (-1L, -%GW)', 
    p_winner_id, COALESCE(p_winner_game_wins, 0), p_loser_id, COALESCE(p_loser_game_wins, 0);

  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_winner_id) THEN
    RAISE EXCEPTION 'Winner team not found: %', p_winner_id;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_loser_id) THEN
    RAISE EXCEPTION 'Loser team not found: %', p_loser_id;
  END IF;

  UPDATE public.teams
  SET 
    wins = GREATEST(0, COALESCE(wins, 0) - 1),
    game_wins = GREATEST(0, COALESCE(game_wins, 0) - COALESCE(p_winner_game_wins, 0)),
    game_losses = GREATEST(0, COALESCE(game_losses, 0) - COALESCE(p_loser_game_wins, 0))
  WHERE id = p_winner_id;
  
  GET DIAGNOSTICS v_winner_rows = ROW_COUNT;

  UPDATE public.teams
  SET 
    losses = GREATEST(0, COALESCE(losses, 0) - 1),
    game_wins = GREATEST(0, COALESCE(game_wins, 0) - COALESCE(p_loser_game_wins, 0)),
    game_losses = GREATEST(0, COALESCE(game_losses, 0) - COALESCE(p_winner_game_wins, 0))
  WHERE id = p_loser_id;
  
  GET DIAGNOSTICS v_loser_rows = ROW_COUNT;

  IF (v_winner_rows + v_loser_rows) <> 2 THEN
    RAISE EXCEPTION 'Expected to update 2 teams but updated % rows', (v_winner_rows + v_loser_rows);
  END IF;

  v_result := json_build_object(
    'success', true,
    'rows_affected', v_winner_rows + v_loser_rows,
    'winner', json_build_object(
      'id', p_winner_id, 
      'match_win_reversed', 1, 
      'game_wins_reversed', COALESCE(p_winner_game_wins, 0),
      'game_losses_reversed', COALESCE(p_loser_game_wins, 0)
    ),
    'loser', json_build_object(
      'id', p_loser_id, 
      'match_loss_reversed', 1, 
      'game_wins_reversed', COALESCE(p_loser_game_wins, 0),
      'game_losses_reversed', COALESCE(p_winner_game_wins, 0)
    )
  );
  
  RETURN v_result;
END;
$function$
=== VIEW ===
                                                                                                        pg_get_viewdef                                                                                                        
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  SELECT t.id AS team_id,                                                                                                                                                                                                    +
     t.name,                                                                                                                                                                                                                 +
     t.logo_url,                                                                                                                                                                                                             +
     t.image_url,                                                                                                                                                                                                            +
     t.players,                                                                                                                                                                                                              +
     t.created_at,                                                                                                                                                                                                           +
     t.division_id,                                                                                                                                                                                                          +
     COALESCE(d.display_division, 'Recreational'::text) AS divisionname,                                                                                                                                                     +
     COALESCE(stats.win_percentage, 0::numeric) AS win_percentage,                                                                                                                                                           +
     COALESCE(stats.game_win_percentage, 0::numeric) AS game_win_percentage,                                                                                                                                                 +
     COALESCE(stats.wins, t.wins::bigint) AS wins,                                                                                                                                                                           +
     COALESCE(stats.losses, t.losses::bigint) AS losses,                                                                                                                                                                     +
     COALESCE(stats.game_wins, t.game_wins::bigint) AS game_wins,                                                                                                                                                            +
     COALESCE(stats.game_losses, t.game_losses::bigint) AS game_losses,                                                                                                                                                      +
     COALESCE(stats.close_match_losses, 0::bigint) AS close_match_losses,                                                                                                                                                    +
     COALESCE(weighted_stats.weighted_win_percentage, 0::numeric) AS weighted_win_percentage,                                                                                                                                +
     COALESCE(weighted_stats.weighted_game_win_percentage, 0::numeric) AS weighted_game_win_percentage,                                                                                                                      +
     COALESCE(sos_calc.sos, 0.5) AS sos,                                                                                                                                                                                     +
     power_calc.power_score                                                                                                                                                                                                  +
    FROM teams t                                                                                                                                                                                                             +
      LEFT JOIN divisions d ON t.division_id = d.id                                                                                                                                                                          +
      LEFT JOIN v_team_match_stats stats ON t.id = stats.team_id                                                                                                                                                             +
      LEFT JOIN ( SELECT t_1.id AS team_id,                                                                                                                                                                                  +
                 CASE                                                                                                                                                                                                        +
                     WHEN count(m.*) = 0 THEN 0::numeric                                                                                                                                                                     +
                     ELSE sum(                                                                                                                                                                                               +
                     CASE                                                                                                                                                                                                    +
                         WHEN m.winner_id = t_1.id THEN d_opp.division_weight                                                                                                                                                +
                         ELSE 0::numeric                                                                                                                                                                                     +
                     END) / NULLIF(count(m.*), 0)::numeric                                                                                                                                                                   +
                 END AS weighted_win_percentage,                                                                                                                                                                             +
                 CASE                                                                                                                                                                                                        +
                     WHEN sum(                                                                                                                                                                                               +
                     CASE                                                                                                                                                                                                    +
                         WHEN m.team1_id = t_1.id THEN m.team1_game_wins + COALESCE(m.team2_game_wins, 0)                                                                                                                    +
                         WHEN m.team2_id = t_1.id THEN m.team2_game_wins + COALESCE(m.team1_game_wins, 0)                                                                                                                    +
                         ELSE 0                                                                                                                                                                                              +
                     END) = 0 THEN 0::numeric                                                                                                                                                                                +
                     ELSE sum(                                                                                                                                                                                               +
                     CASE                                                                                                                                                                                                    +
                         WHEN m.team1_id = t_1.id THEN m.team1_game_wins::numeric * d_opp.division_weight                                                                                                                    +
                         WHEN m.team2_id = t_1.id THEN m.team2_game_wins::numeric * d_opp.division_weight                                                                                                                    +
                         ELSE 0::numeric                                                                                                                                                                                     +
                     END) / NULLIF(sum(                                                                                                                                                                                      +
                     CASE                                                                                                                                                                                                    +
                         WHEN m.team1_id = t_1.id THEN m.team1_game_wins + COALESCE(m.team2_game_wins, 0)                                                                                                                    +
                         WHEN m.team2_id = t_1.id THEN m.team2_game_wins + COALESCE(m.team1_game_wins, 0)                                                                                                                    +
                         ELSE 0                                                                                                                                                                                              +
                     END), 0)::numeric                                                                                                                                                                                       +
                 END AS weighted_game_win_percentage                                                                                                                                                                         +
            FROM teams t_1                                                                                                                                                                                                   +
              LEFT JOIN matches m ON (t_1.id = m.team1_id OR t_1.id = m.team2_id) AND m.iscompleted = true                                                                                                                   +
              LEFT JOIN teams t_opp ON                                                                                                                                                                                       +
                 CASE                                                                                                                                                                                                        +
                     WHEN m.team1_id = t_1.id THEN m.team2_id                                                                                                                                                                +
                     WHEN m.team2_id = t_1.id THEN m.team1_id                                                                                                                                                                +
                     ELSE NULL::uuid                                                                                                                                                                                         +
                 END = t_opp.id                                                                                                                                                                                              +
              LEFT JOIN divisions d_opp ON t_opp.division_id = d_opp.id                                                                                                                                                      +
           GROUP BY t_1.id) weighted_stats ON t.id = weighted_stats.team_id                                                                                                                                                  +
      LEFT JOIN ( SELECT t_1.id AS team_id,                                                                                                                                                                                  +
                 CASE                                                                                                                                                                                                        +
                     WHEN count(DISTINCT opp.id) = 0 THEN 0.5                                                                                                                                                                +
                     ELSE GREATEST(0.1, LEAST(1.0, avg(COALESCE(d_opp.division_weight, 0.85))))                                                                                                                              +
                 END AS sos                                                                                                                                                                                                  +
            FROM teams t_1                                                                                                                                                                                                   +
              LEFT JOIN matches m ON (t_1.id = m.team1_id OR t_1.id = m.team2_id) AND m.iscompleted = true                                                                                                                   +
              LEFT JOIN teams opp ON                                                                                                                                                                                         +
                 CASE                                                                                                                                                                                                        +
                     WHEN m.team1_id = t_1.id THEN m.team2_id                                                                                                                                                                +
                     WHEN m.team2_id = t_1.id THEN m.team1_id                                                                                                                                                                +
                     ELSE NULL::uuid                                                                                                                                                                                         +
                 END = opp.id                                                                                                                                                                                                +
              LEFT JOIN divisions d_opp ON opp.division_id = d_opp.id                                                                                                                                                        +
           GROUP BY t_1.id) sos_calc ON t.id = sos_calc.team_id                                                                                                                                                              +
      LEFT JOIN ( SELECT t_1.id AS team_id,                                                                                                                                                                                  +
                 CASE                                                                                                                                                                                                        +
                     WHEN count(m.*) = 0 THEN NULL::numeric                                                                                                                                                                  +
                     ELSE COALESCE(weighted_match_stats.weighted_win_percentage, 0::numeric) * 40.0 + COALESCE(sos_component.sos, 0.5) * 45.0 + COALESCE(weighted_game_stats.weighted_game_win_percentage, 0::numeric) * 15.0+
                 END AS power_score                                                                                                                                                                                          +
            FROM teams t_1                                                                                                                                                                                                   +
              LEFT JOIN matches m ON (t_1.id = m.team1_id OR t_1.id = m.team2_id) AND m.iscompleted = true                                                                                                                   +
              LEFT JOIN ( SELECT t_2.id AS team_id,                                                                                                                                                                          +
                         CASE                                                                                                                                                                                                +
                             WHEN count(m_1.*) = 0 THEN 0::numeric                                                                                                                                                           +
                             ELSE sum(                                                                                                                                                                                       +
                             CASE                                                                                                                                                                                            +
                                 WHEN m_1.winner_id = t_2.id THEN d_opp.division_weight                                                                                                                                      +
                                 ELSE 0::numeric                                                                                                                                                                             +
                             END) / NULLIF(count(m_1.*), 0)::numeric                                                                                                                                                         +
                         END AS weighted_win_percentage                                                                                                                                                                      +
                    FROM teams t_2                                                                                                                                                                                           +
                      LEFT JOIN matches m_1 ON (t_2.id = m_1.team1_id OR t_2.id = m_1.team2_id) AND m_1.iscompleted = true                                                                                                   +
                      LEFT JOIN teams t_opp ON                                                                                                                                                                               +
                         CASE                                                                                                                                                                                                +
                             WHEN m_1.team1_id = t_2.id THEN m_1.team2_id                                                                                                                                                    +
                             WHEN m_1.team2_id = t_2.id THEN m_1.team1_id                                                                                                                                                    +
                             ELSE NULL::uuid                                                                                                                                                                                 +
                         END = t_opp.id                                                                                                                                                                                      +
                      LEFT JOIN divisions d_opp ON t_opp.division_id = d_opp.id                                                                                                                                              +
                   GROUP BY t_2.id) weighted_match_stats ON t_1.id = weighted_match_stats.team_id                                                                                                                            +
              LEFT JOIN ( SELECT t_2.id AS team_id,                                                                                                                                                                          +
                         CASE                                                                                                                                                                                                +
                             WHEN count(DISTINCT opp.id) = 0 THEN 0.5                                                                                                                                                        +
                             ELSE GREATEST(0.1, LEAST(1.0, avg(COALESCE(d_opp.division_weight, 0.85))))                                                                                                                      +
                         END AS sos                                                                                                                                                                                          +
                    FROM teams t_2                                                                                                                                                                                           +
                      LEFT JOIN matches m_1 ON (t_2.id = m_1.team1_id OR t_2.id = m_1.team2_id) AND m_1.iscompleted = true                                                                                                   +
                      LEFT JOIN teams opp ON                                                                                                                                                                                 +
                         CASE                                                                                                                                                                                                +
                             WHEN m_1.team1_id = t_2.id THEN m_1.team2_id                                                                                                                                                    +
                             WHEN m_1.team2_id = t_2.id THEN m_1.team1_id                                                                                                                                                    +
                             ELSE NULL::uuid                                                                                                                                                                                 +
                         END = opp.id                                                                                                                                                                                        +
                      LEFT JOIN divisions d_opp ON opp.division_id = d_opp.id                                                                                                                                                +
                   GROUP BY t_2.id) sos_component ON t_1.id = sos_component.team_id                                                                                                                                          +
              LEFT JOIN ( SELECT t_2.id AS team_id,                                                                                                                                                                          +
                         CASE                                                                                                                                                                                                +
                             WHEN sum(                                                                                                                                                                                       +
                             CASE                                                                                                                                                                                            +
                                 WHEN m_1.team1_id = t_2.id THEN m_1.team1_game_wins + COALESCE(m_1.team2_game_wins, 0)                                                                                                      +
                                 WHEN m_1.team2_id = t_2.id THEN m_1.team2_game_wins + COALESCE(m_1.team1_game_wins, 0)                                                                                                      +
                                 ELSE 0                                                                                                                                                                                      +
                             END) = 0 THEN 0::numeric                                                                                                                                                                        +
                             ELSE sum(                                                                                                                                                                                       +
                             CASE                                                                                                                                                                                            +
                                 WHEN m_1.team1_id = t_2.id THEN m_1.team1_game_wins::numeric * d_opp.division_weight                                                                                                        +
                                 WHEN m_1.team2_id = t_2.id THEN m_1.team2_game_wins::numeric * d_opp.division_weight                                                                                                        +
                                 ELSE 0::numeric                                                                                                                                                                             +
                             END) / NULLIF(sum(                                                                                                                                                                              +
                             CASE                                                                                                                                                                                            +
                                 WHEN m_1.team1_id = t_2.id THEN m_1.team1_game_wins + COALESCE(m_1.team2_game_wins, 0)                                                                                                      +
                                 WHEN m_1.team2_id = t_2.id THEN m_1.team2_game_wins + COALESCE(m_1.team1_game_wins, 0)                                                                                                      +
                                 ELSE 0                                                                                                                                                                                      +
                             END), 0)::numeric                                                                                                                                                                               +
                         END AS weighted_game_win_percentage                                                                                                                                                                 +
                    FROM teams t_2                                                                                                                                                                                           +
                      LEFT JOIN matches m_1 ON (t_2.id = m_1.team1_id OR t_2.id = m_1.team2_id) AND m_1.iscompleted = true                                                                                                   +
                      LEFT JOIN teams t_opp ON                                                                                                                                                                               +
                         CASE                                                                                                                                                                                                +
                             WHEN m_1.team1_id = t_2.id THEN m_1.team2_id                                                                                                                                                    +
                             WHEN m_1.team2_id = t_2.id THEN m_1.team1_id                                                                                                                                                    +
                             ELSE NULL::uuid                                                                                                                                                                                 +
                         END = t_opp.id                                                                                                                                                                                      +
                      LEFT JOIN divisions d_opp ON t_opp.division_id = d_opp.id                                                                                                                                              +
                   GROUP BY t_2.id) weighted_game_stats ON t_1.id = weighted_game_stats.team_id                                                                                                                              +
           GROUP BY t_1.id, weighted_match_stats.weighted_win_percentage, sos_component.sos, weighted_game_stats.weighted_game_win_percentage) power_calc ON t.id = power_calc.team_id                                       +
   ORDER BY t.name;
(1 row)

