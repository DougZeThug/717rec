-- Fix History Page Power Score to use Weighted Formula (same as Current Season View)
-- This ensures both views calculate power scores consistently

CREATE OR REPLACE VIEW v_team_season_agg
WITH (security_invoker=on)
AS
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
), weighted_match_wins AS (
    -- Calculate weighted match win percentage
    SELECT am.season_id,
        am.team_id,
        CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE (
                SUM(am.match_wins * COALESCE(d.division_weight, 0.85)) /
                NULLIF(COUNT(*), 0)
            )
        END AS weighted_match_win_pct
    FROM ((all_matches am
        LEFT JOIN teams t_opp ON ((am.opponent_id = t_opp.id)))
        LEFT JOIN divisions d ON ((t_opp.division_id = d.id)))
    GROUP BY am.season_id, am.team_id
), weighted_game_wins AS (
    -- Calculate weighted game win percentage
    SELECT am.season_id,
        am.team_id,
        CASE
            WHEN SUM(am.game_wins + am.game_losses) = 0 THEN 0
            ELSE (
                SUM(am.game_wins * COALESCE(d.division_weight, 0.85)) /
                NULLIF(SUM(am.game_wins + am.game_losses), 0)
            )
        END AS weighted_game_win_pct
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
        WHEN (((tsd.match_wins + tsd.match_losses) > 0) AND (sc.sos IS NOT NULL)) THEN (
            (COALESCE(wmw.weighted_match_win_pct, 0) * 0.40) +
            (COALESCE(sc.sos, 0.5) * 0.45) +
            (COALESCE(wgw.weighted_game_win_pct, 0) * 0.15)
        )
        ELSE NULL::numeric
    END AS power_score,
    d.display_division AS division_name
FROM team_season_data tsd
LEFT JOIN sos_calc sc ON ((tsd.season_id = sc.season_id) AND (tsd.team_id = sc.team_id))
LEFT JOIN weighted_match_wins wmw ON ((tsd.season_id = wmw.season_id) AND (tsd.team_id = wmw.team_id))
LEFT JOIN weighted_game_wins wgw ON ((tsd.season_id = wgw.season_id) AND (tsd.team_id = wgw.team_id))
LEFT JOIN teams t ON (tsd.team_id = t.id)
LEFT JOIN divisions d ON (t.division_id = d.id);

-- Execute the upsert to recalculate all power scores with the weighted formula
SELECT public.upsert_team_season_stats();
