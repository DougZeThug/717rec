-- Update v_team_season_agg view to include display_division from divisions table
CREATE OR REPLACE VIEW v_team_season_agg AS
WITH regular_season_matches AS (
    SELECT ('reg_'::text || (m.id)::text) AS match_key,
        m.season_id,
        m.team1_id AS team_id,
        CASE WHEN (m.winner_id = m.team1_id) THEN 1 ELSE 0 END AS match_wins,
        CASE WHEN (m.winner_id = m.team2_id) THEN 1 ELSE 0 END AS match_losses,
        COALESCE(m.team1_game_wins, 0) AS game_wins,
        COALESCE(m.team2_game_wins, 0) AS game_losses,
        m.team2_id AS opponent_id
    FROM matches m
    WHERE ((m.iscompleted = true) AND (m.season_id IS NOT NULL))
    UNION ALL
    SELECT ('reg_'::text || (m.id)::text) AS match_key,
        m.season_id,
        m.team2_id AS team_id,
        CASE WHEN (m.winner_id = m.team2_id) THEN 1 ELSE 0 END AS match_wins,
        CASE WHEN (m.winner_id = m.team1_id) THEN 1 ELSE 0 END AS match_losses,
        COALESCE(m.team2_game_wins, 0) AS game_wins,
        COALESCE(m.team1_game_wins, 0) AS game_losses,
        m.team1_id AS opponent_id
    FROM matches m
    WHERE ((m.iscompleted = true) AND (m.season_id IS NOT NULL))
), archived_season_matches AS (
    SELECT ('arch_'::text || (ma.id)::text) AS match_key,
        ma.season_id,
        ma.team1_id AS team_id,
        CASE WHEN (ma.winner_id = ma.team1_id) THEN 1 ELSE 0 END AS match_wins,
        CASE WHEN (ma.winner_id = ma.team2_id) THEN 1 ELSE 0 END AS match_losses,
        COALESCE(ma.team1_game_wins, 0) AS game_wins,
        COALESCE(ma.team2_game_wins, 0) AS game_losses,
        ma.team2_id AS opponent_id
    FROM matches_archive ma
    WHERE ((ma.iscompleted = true) AND (ma.season_id IS NOT NULL))
    UNION ALL
    SELECT ('arch_'::text || (ma.id)::text) AS match_key,
        ma.season_id,
        ma.team2_id AS team_id,
        CASE WHEN (ma.winner_id = ma.team2_id) THEN 1 ELSE 0 END AS match_wins,
        CASE WHEN (ma.winner_id = ma.team1_id) THEN 1 ELSE 0 END AS match_losses,
        COALESCE(ma.team2_game_wins, 0) AS game_wins,
        COALESCE(ma.team1_game_wins, 0) AS game_losses,
        ma.team1_id AS opponent_id
    FROM matches_archive ma
    WHERE ((ma.iscompleted = true) AND (ma.season_id IS NOT NULL))
), playoff_season_matches AS (
    SELECT ('playoff_'::text || (pm.id)::text) AS match_key,
        b.season_id,
        pm.team1_id AS team_id,
        CASE WHEN (pm.winner_id = pm.team1_id) THEN 1 ELSE 0 END AS match_wins,
        CASE WHEN (pm.winner_id = pm.team2_id) THEN 1 ELSE 0 END AS match_losses,
        COALESCE(pm.team1_score, 0) AS game_wins,
        COALESCE(pm.team2_score, 0) AS game_losses,
        pm.team2_id AS opponent_id
    FROM (playoff_matches pm
        JOIN brackets b ON ((pm.bracket_id = b.id)))
    WHERE ((pm.winner_id IS NOT NULL) AND (b.season_id IS NOT NULL))
    UNION ALL
    SELECT ('playoff_'::text || (pm.id)::text) AS match_key,
        b.season_id,
        pm.team2_id AS team_id,
        CASE WHEN (pm.winner_id = pm.team2_id) THEN 1 ELSE 0 END AS match_wins,
        CASE WHEN (pm.winner_id = pm.team1_id) THEN 1 ELSE 0 END AS match_losses,
        COALESCE(pm.team2_score, 0) AS game_wins,
        COALESCE(pm.team1_score, 0) AS game_losses,
        pm.team1_id AS opponent_id
    FROM (playoff_matches pm
        JOIN brackets b ON ((pm.bracket_id = b.id)))
    WHERE ((pm.winner_id IS NOT NULL) AND (b.season_id IS NOT NULL))
), all_matches AS (
    SELECT * FROM regular_season_matches
    UNION ALL
    SELECT * FROM archived_season_matches
    UNION ALL
    SELECT * FROM playoff_season_matches
), team_season_data AS (
    SELECT all_matches.season_id,
        all_matches.team_id,
        sum(all_matches.match_wins) AS match_wins,
        sum(all_matches.match_losses) AS match_losses,
        sum(all_matches.game_wins) AS game_wins,
        sum(all_matches.game_losses) AS game_losses
    FROM all_matches
    GROUP BY all_matches.season_id, all_matches.team_id
), sos_calc AS (
    SELECT am.season_id,
        am.team_id,
        CASE
            WHEN (count(DISTINCT am.opponent_id) > 0) THEN avg(COALESCE(d.division_weight, 0.85))
            ELSE NULL::numeric
        END AS sos
    FROM ((all_matches am
        LEFT JOIN teams t_opp ON ((am.opponent_id = t_opp.id)))
        LEFT JOIN divisions d ON ((t_opp.division_id = d.id)))
    GROUP BY am.season_id, am.team_id
)
SELECT tsd.season_id,
    tsd.team_id,
    tsd.match_wins,
    tsd.match_losses,
    tsd.game_wins,
    tsd.game_losses,
    CASE
        WHEN ((tsd.match_wins + tsd.match_losses) > 0) THEN ((tsd.match_wins)::numeric / ((tsd.match_wins + tsd.match_losses))::numeric)
        ELSE NULL::numeric
    END AS win_percentage,
    CASE
        WHEN ((tsd.game_wins + tsd.game_losses) > 0) THEN ((tsd.game_wins)::numeric / ((tsd.game_wins + tsd.game_losses))::numeric)
        ELSE NULL::numeric
    END AS game_win_percentage,
    sc.sos,
    CASE
        WHEN (((tsd.match_wins + tsd.match_losses) > 0) AND (sc.sos IS NOT NULL)) THEN (((0.40 * ((tsd.match_wins)::numeric / ((tsd.match_wins + tsd.match_losses))::numeric)) + (0.45 * sc.sos)) + (0.15 *
        CASE
            WHEN ((tsd.game_wins + tsd.game_losses) > 0) THEN ((tsd.game_wins)::numeric / ((tsd.game_wins + tsd.game_losses))::numeric)
            ELSE (0)::numeric
        END))
        ELSE NULL::numeric
    END AS power_score,
    d.display_division AS division_name
FROM team_season_data tsd
LEFT JOIN sos_calc sc ON ((tsd.season_id = sc.season_id) AND (tsd.team_id = sc.team_id))
LEFT JOIN teams t ON (tsd.team_id = t.id)
LEFT JOIN divisions d ON (t.division_id = d.id);

-- Update the upsert function to include division_name
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
  ON CONFLICT (season_id, team_id) DO UPDATE
  SET
    match_wins = EXCLUDED.match_wins,
    match_losses = EXCLUDED.match_losses,
    game_wins = EXCLUDED.game_wins,
    game_losses = EXCLUDED.game_losses,
    sos = EXCLUDED.sos,
    power_score = EXCLUDED.power_score,
    division_name = EXCLUDED.division_name,
    recorded_at = now();
END;
$$;

-- Execute the upsert to populate division names for all seasons
SELECT public.upsert_team_season_stats();