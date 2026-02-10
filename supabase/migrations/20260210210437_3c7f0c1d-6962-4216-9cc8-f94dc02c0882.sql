
-- Recalculate team stats from actual completed matches
UPDATE teams t SET
  wins = COALESCE(s.actual_wins, 0),
  losses = COALESCE(s.actual_losses, 0),
  game_wins = COALESCE(s.actual_gw, 0),
  game_losses = COALESCE(s.actual_gl, 0)
FROM (
  SELECT t2.id,
    SUM(CASE WHEN m.winner_id = t2.id THEN 1 ELSE 0 END)::int AS actual_wins,
    SUM(CASE WHEN m.loser_id = t2.id THEN 1 ELSE 0 END)::int AS actual_losses,
    SUM(CASE WHEN m.team1_id = t2.id THEN COALESCE(m.team1_game_wins, 0)
             WHEN m.team2_id = t2.id THEN COALESCE(m.team2_game_wins, 0) ELSE 0 END)::int AS actual_gw,
    SUM(CASE WHEN m.team1_id = t2.id THEN COALESCE(m.team2_game_wins, 0)
             WHEN m.team2_id = t2.id THEN COALESCE(m.team1_game_wins, 0) ELSE 0 END)::int AS actual_gl
  FROM teams t2
  LEFT JOIN matches m ON (m.team1_id = t2.id OR m.team2_id = t2.id)
    AND m.iscompleted = true AND m.winner_id IS NOT NULL
  GROUP BY t2.id
) s
WHERE t.id = s.id;

-- Refresh season stats and power scores
SELECT upsert_team_season_stats();
