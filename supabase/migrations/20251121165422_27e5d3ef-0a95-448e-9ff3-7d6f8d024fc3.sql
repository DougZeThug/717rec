-- Clean up trailing space in Bag Babies team name
UPDATE teams
SET name = TRIM(name)
WHERE name LIKE 'Bag Babies %';

-- Update playoff_rank for Bag Babies (now that name is clean)
UPDATE team_season_stats tss
SET playoff_rank = 9
FROM teams t, seasons s
WHERE tss.team_id = t.id
  AND tss.season_id = s.id
  AND s.name = 'Fall 2025'
  AND t.name = 'Bag Babies';