
-- Correct playoff_rank for Pepperoni Cheesers
UPDATE team_season_stats tss
SET playoff_rank = 6
FROM teams t, seasons s
WHERE tss.team_id = t.id
  AND tss.season_id = s.id
  AND s.name = 'Fall 2025'
  AND t.name = 'Pepperoni Cheesers';
