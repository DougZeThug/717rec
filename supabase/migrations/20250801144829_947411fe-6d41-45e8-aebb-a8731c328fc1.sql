-- Remove Bag Babies from any non-Competitive divisions in Summer 1 2025
DELETE FROM team_season_stats 
WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
  AND team_id = '626be920-071d-4aea-a1f5-1819893215ca'
  AND division_name != 'Competitive';