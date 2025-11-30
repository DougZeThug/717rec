-- Fix Security Definer View Issue
-- The v_team_season_agg view was missing security_invoker option, causing it to run 
-- with SECURITY DEFINER mode (using creator's permissions instead of querying user's).
-- This can bypass RLS policies and expose more data than intended.

-- Drop and recreate with security_invoker=on
DROP VIEW IF EXISTS public.v_team_season_agg;

CREATE VIEW public.v_team_season_agg
WITH (security_invoker=on)
AS
WITH regular_season_matches AS (
  SELECT 'reg_'::text || m.id::text AS match_key,
    m.season_id,
    m.team1_id AS team_id,
    CASE
      WHEN m.winner_id = m.team1_id THEN 1
      ELSE 0
    END AS match_wins,
    CASE
      WHEN m.winner_id = m.team2_id THEN 1
      ELSE 0
    END AS match_losses,
    COALESCE(m.team1_game_wins, 0) AS game_wins,
    COALESCE(m.team2_game_wins, 0) AS game_losses,
    m.team2_id AS opponent_id
  FROM matches m
  WHERE m.iscompleted = true AND m.season_id IS NOT NULL
  UNION ALL
  SELECT 'reg_'::text || m.id::text AS match_key,
    m.season_id,
    m.team2_id AS team_id,
    CASE
      WHEN m.winner_id = m.team2_id THEN 1
      ELSE 0
    END AS match_wins,
    CASE
      WHEN m.winner_id = m.team1_id THEN 1
      ELSE 0
    END AS match_losses,
    COALESCE(m.team2_game_wins, 0) AS game_wins,
    COALESCE(m.team1_game_wins, 0) AS game_losses,
    m.team1_id AS opponent_id
  FROM matches m
  WHERE m.iscompleted = true AND m.season_id IS NOT NULL
), archived_season_matches AS (
  SELECT 'arch_'::text || ma.id::text AS match_key,
    ma.season_id,
    ma.team1_id AS team_id,
    CASE
      WHEN ma.winner_id = ma.team1_id THEN 1
      ELSE 0
    END AS match_wins,
    CASE
      WHEN ma.winner_id = ma.team2_id THEN 1
      ELSE 0
    END AS match_losses,
    COALESCE(ma.team1_game_wins, 0) AS game_wins,
    COALESCE(ma.team2_game_wins, 0) AS game_losses,
    ma.team2_id AS opponent_id
  FROM matches_archive ma
  WHERE ma.iscompleted = true AND ma.season_id IS NOT NULL
  UNION ALL
  SELECT 'arch_'::text || ma.id::text AS match_key,
    ma.season_id,
    ma.team2_id AS team_id,
    CASE
      WHEN ma.winner_id = ma.team2_id THEN 1
      ELSE 0
    END AS match_wins,
    CASE
      WHEN ma.winner_id = ma.team1_id THEN 1
      ELSE 0
    END AS match_losses,
    COALESCE(ma.team2_game_wins, 0) AS game_wins,
    COALESCE(ma.team1_game_wins, 0) AS game_losses,
    ma.team1_id AS opponent_id
  FROM matches_archive ma
  WHERE ma.iscompleted = true AND ma.season_id IS NOT NULL
), playoff_season_matches AS (
  SELECT 'playoff_'::text || pm.id::text AS match_key,
    b.season_id,
    pm.team1_id AS team_id,
    CASE
      WHEN pm.winner_id = pm.team1_id THEN 1
      ELSE 0
    END AS match_wins,
    CASE
      WHEN pm.winner_id = pm.team2_id THEN 1
      ELSE 0
    END AS match_losses,
    COALESCE(pm.team1_score, 0) AS game_wins,
    COALESCE(pm.team2_score, 0) AS game_losses,
    pm.team2_id AS opponent_id
  FROM playoff_matches pm
  JOIN brackets b ON pm.bracket_id = b.id
  WHERE pm.winner_id IS NOT NULL AND b.season_id IS NOT NULL
  UNION ALL
  SELECT 'playoff_'::text || pm.id::text AS match_key,
    b.season_id,
    pm.team2_id AS team_id,
    CASE
      WHEN pm.winner_id = pm.team2_id THEN 1
      ELSE 0
    END AS match_wins,
    CASE
      WHEN pm.winner_id = pm.team1_id THEN 1
      ELSE 0
    END AS match_losses,
    COALESCE(pm.team2_score, 0) AS game_wins,
    COALESCE(pm.team1_score, 0) AS game_losses,
    pm.team1_id AS opponent_id
  FROM playoff_matches pm
  JOIN brackets b ON pm.bracket_id = b.id
  WHERE pm.winner_id IS NOT NULL AND b.season_id IS NOT NULL
), all_matches AS (
  SELECT match_key, season_id, team_id, match_wins, match_losses, game_wins, game_losses, opponent_id FROM regular_season_matches
  UNION ALL
  SELECT match_key, season_id, team_id, match_wins, match_losses, game_wins, game_losses, opponent_id FROM archived_season_matches
  UNION ALL
  SELECT match_key, season_id, team_id, match_wins, match_losses, game_wins, game_losses, opponent_id FROM playoff_season_matches
), team_season_data AS (
  SELECT 
    season_id,
    team_id,
    SUM(match_wins) AS match_wins,
    SUM(match_losses) AS match_losses,
    SUM(game_wins) AS game_wins,
    SUM(game_losses) AS game_losses
  FROM all_matches
  GROUP BY season_id, team_id
), opponent_records AS (
  SELECT 
    am.season_id,
    am.team_id,
    am.opponent_id,
    SUM(opp_data.match_wins) AS opp_wins,
    SUM(opp_data.match_losses) AS opp_losses
  FROM all_matches am
  JOIN all_matches opp_data 
    ON am.opponent_id = opp_data.team_id 
    AND am.season_id = opp_data.season_id
  GROUP BY am.season_id, am.team_id, am.opponent_id
), sos_calc AS (
  SELECT 
    season_id,
    team_id,
    CASE 
      WHEN SUM(opp_wins + opp_losses) > 0 
      THEN SUM(opp_wins)::decimal / SUM(opp_wins + opp_losses)
      ELSE NULL
    END AS sos
  FROM opponent_records
  GROUP BY season_id, team_id
)
SELECT 
  tsd.season_id,
  tsd.team_id,
  tsd.match_wins,
  tsd.match_losses,
  tsd.game_wins,
  tsd.game_losses,
  CASE 
    WHEN (tsd.match_wins + tsd.match_losses) > 0 
    THEN tsd.match_wins::decimal / (tsd.match_wins + tsd.match_losses)
    ELSE NULL
  END AS win_percentage,
  CASE 
    WHEN (tsd.game_wins + tsd.game_losses) > 0 
    THEN tsd.game_wins::decimal / (tsd.game_wins + tsd.game_losses)
    ELSE NULL
  END AS game_win_percentage,
  sc.sos,
  CASE 
    WHEN (tsd.match_wins + tsd.match_losses) > 0 AND sc.sos IS NOT NULL
    THEN (
      0.40 * (tsd.match_wins::decimal / (tsd.match_wins + tsd.match_losses)) +
      0.45 * sc.sos +
      0.15 * CASE 
        WHEN (tsd.game_wins + tsd.game_losses) > 0 
        THEN tsd.game_wins::decimal / (tsd.game_wins + tsd.game_losses)
        ELSE 0
      END
    )
    ELSE NULL
  END AS power_score
FROM team_season_data tsd
LEFT JOIN sos_calc sc ON tsd.season_id = sc.season_id AND tsd.team_id = sc.team_id;