-- Update Fall 2025 division names to match playoff bracket structure
UPDATE team_season_stats tss
SET division_name = 
  CASE 
    WHEN pm.bracket_id = 'c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e' THEN 'Competitive'
    WHEN pm.bracket_id = '63fd1e7b-a27f-46d2-a7e4-4b2f876e518c' THEN 'Intermediate High'
    WHEN pm.bracket_id = 'ba447faf-bad6-43d3-a798-c62b984e2770' THEN 'Intermediate Low'
    WHEN pm.bracket_id = 'e3e11f22-c2d7-442d-aa0f-ff55e4df40a7' THEN 'Recreational'
  END
FROM (
  SELECT DISTINCT team_id, bracket_id
  FROM (
    SELECT team1_id as team_id, bracket_id
    FROM playoff_matches
    WHERE bracket_id IN (
      'c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e',
      '63fd1e7b-a27f-46d2-a7e4-4b2f876e518c',
      'ba447faf-bad6-43d3-a798-c62b984e2770',
      'e3e11f22-c2d7-442d-aa0f-ff55e4df40a7'
    )
    AND team1_id IS NOT NULL
    UNION
    SELECT team2_id as team_id, bracket_id
    FROM playoff_matches
    WHERE bracket_id IN (
      'c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e',
      '63fd1e7b-a27f-46d2-a7e4-4b2f876e518c',
      'ba447faf-bad6-43d3-a798-c62b984e2770',
      'e3e11f22-c2d7-442d-aa0f-ff55e4df40a7'
    )
    AND team2_id IS NOT NULL
  ) teams_in_brackets
) pm
WHERE tss.season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND tss.team_id = pm.team_id;