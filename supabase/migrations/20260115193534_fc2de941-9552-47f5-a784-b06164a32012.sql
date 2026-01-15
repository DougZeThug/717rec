-- Populate team_details_archive for Summer 1 2025 and Summer 2 2025
-- Uses team_season_stats as the source, getting division_id from teams table

INSERT INTO team_details_archive (
  team_id, season_id, name, divisionname, division_id,
  wins, losses, game_wins, game_losses, sos, power_score
)
SELECT 
  tss.team_id,
  tss.season_id,
  t.name,
  tss.division_name as divisionname,
  t.division_id,
  tss.match_wins as wins,
  tss.match_losses as losses,
  tss.game_wins,
  tss.game_losses,
  tss.sos,
  tss.power_score
FROM team_season_stats tss
JOIN teams t ON t.id = tss.team_id
WHERE tss.season_id IN (
  'e537c594-3ba9-4d79-ba63-f6ed90c89e30',  -- Summer 1 2025
  'd50bb12e-99be-4170-802a-695a402373ce'   -- Summer 2 2025
)
AND NOT EXISTS (
  SELECT 1 FROM team_details_archive tda 
  WHERE tda.team_id = tss.team_id 
    AND tda.season_id = tss.season_id
);