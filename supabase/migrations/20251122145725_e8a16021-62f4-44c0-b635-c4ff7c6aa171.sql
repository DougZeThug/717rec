-- Fix Cartesian product in v_team_season_agg by adding match_key
DROP VIEW IF EXISTS public.v_team_season_agg CASCADE;

CREATE VIEW public.v_team_season_agg AS
WITH regular_season_matches AS (
  SELECT 
    'reg_' || m.id::text AS match_key,
    t.id AS team_id,
    m.season_id,
    CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END AS match_wins,
    CASE WHEN m.loser_id = t.id THEN 1 ELSE 0 END AS match_losses,
    CASE 
      WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
      WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
      ELSE 0
    END AS game_wins,
    CASE 
      WHEN m.team1_id = t.id THEN COALESCE(m.team2_game_wins, 0)
      WHEN m.team2_id = t.id THEN COALESCE(m.team1_game_wins, 0)
      ELSE 0
    END AS game_losses,
    CASE 
      WHEN m.team1_id = t.id THEN m.team2_id
      WHEN m.team2_id = t.id THEN m.team1_id
    END AS opponent_id
  FROM public.matches m
  CROSS JOIN public.teams t
  WHERE m.iscompleted = true
    AND (m.team1_id = t.id OR m.team2_id = t.id)
    AND m.season_id IS NOT NULL
),
archived_season_matches AS (
  SELECT 
    'arch_' || ma.id::text AS match_key,
    t.id AS team_id,
    ma.season_id,
    CASE WHEN ma.winner_id = t.id THEN 1 ELSE 0 END AS match_wins,
    CASE WHEN ma.loser_id = t.id THEN 1 ELSE 0 END AS match_losses,
    CASE 
      WHEN ma.team1_id = t.id THEN COALESCE(ma.team1_game_wins, 0)
      WHEN ma.team2_id = t.id THEN COALESCE(ma.team2_game_wins, 0)
      ELSE 0
    END AS game_wins,
    CASE 
      WHEN ma.team1_id = t.id THEN COALESCE(ma.team2_game_wins, 0)
      WHEN ma.team2_id = t.id THEN COALESCE(ma.team1_game_wins, 0)
      ELSE 0
    END AS game_losses,
    CASE 
      WHEN ma.team1_id = t.id THEN ma.team2_id
      WHEN ma.team2_id = t.id THEN ma.team1_id
    END AS opponent_id
  FROM public.matches_archive ma
  CROSS JOIN public.teams t
  WHERE ma.iscompleted = true
    AND (ma.team1_id = t.id OR ma.team2_id = t.id)
    AND ma.season_id IS NOT NULL
),
playoff_season_matches AS (
  SELECT 
    'playoff_' || pm.id::text AS match_key,
    t.id AS team_id,
    b.season_id,
    CASE WHEN pm.winner_id = t.id THEN 1 ELSE 0 END AS match_wins,
    CASE WHEN pm.loser_id = t.id THEN 1 ELSE 0 END AS match_losses,
    CASE 
      WHEN pm.team1_id = t.id THEN COALESCE(pm.team1_score, 0)
      WHEN pm.team2_id = t.id THEN COALESCE(pm.team2_score, 0)
      ELSE 0
    END AS game_wins,
    CASE 
      WHEN pm.team1_id = t.id THEN COALESCE(pm.team2_score, 0)
      WHEN pm.team2_id = t.id THEN COALESCE(pm.team1_score, 0)
      ELSE 0
    END AS game_losses,
    CASE 
      WHEN pm.team1_id = t.id THEN pm.team2_id
      WHEN pm.team2_id = t.id THEN pm.team1_id
    END AS opponent_id
  FROM public.playoff_matches pm
  CROSS JOIN public.teams t
  JOIN public.brackets b ON pm.bracket_id = b.id
  WHERE pm.winner_id IS NOT NULL
    AND (pm.team1_id = t.id OR pm.team2_id = t.id)
    AND b.season_id IS NOT NULL
),
all_matches AS (
  SELECT * FROM regular_season_matches
  UNION ALL
  SELECT * FROM archived_season_matches
  UNION ALL
  SELECT * FROM playoff_season_matches
),
opponent_weights AS (
  SELECT 
    am.match_key,
    am.team_id,
    am.season_id,
    COALESCE(AVG(d.division_weight), 0.85) AS avg_opponent_weight
  FROM all_matches am
  LEFT JOIN public.teams opponent_team ON am.opponent_id = opponent_team.id
  LEFT JOIN public.divisions d ON opponent_team.division_id = d.id
  WHERE am.opponent_id IS NOT NULL
  GROUP BY am.match_key, am.team_id, am.season_id
)
SELECT 
  am.team_id,
  am.season_id,
  SUM(am.match_wins)::integer AS match_wins,
  SUM(am.match_losses)::integer AS match_losses,
  SUM(am.game_wins)::integer AS game_wins,
  SUM(am.game_losses)::integer AS game_losses,
  COALESCE(AVG(ow.avg_opponent_weight), 0.85) AS sos,
  CASE 
    WHEN SUM(am.match_wins + am.match_losses) > 0 
    THEN (SUM(am.match_wins)::numeric / SUM(am.match_wins + am.match_losses)::numeric)
    ELSE 0
  END AS match_win_pct,
  CASE 
    WHEN SUM(am.game_wins + am.game_losses) > 0 
    THEN (SUM(am.game_wins)::numeric / SUM(am.game_wins + am.game_losses)::numeric)
    ELSE 0
  END AS game_win_pct,
  CASE 
    WHEN SUM(am.match_wins + am.match_losses) > 0 
    THEN (
      (SUM(am.match_wins)::numeric / SUM(am.match_wins + am.match_losses)::numeric) * 
      COALESCE(AVG(ow.avg_opponent_weight), 0.85)
    )
    ELSE 0
  END AS power_score
FROM all_matches am
LEFT JOIN opponent_weights ow ON am.match_key = ow.match_key
GROUP BY am.team_id, am.season_id;

-- Recalculate all team season stats with corrected view
SELECT public.upsert_team_season_stats();