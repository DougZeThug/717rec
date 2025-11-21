
-- Update team_season_stats with regular season data from matches_archive
WITH regular_season_stats AS (
  SELECT 
    team_id,
    SUM(wins) as wins,
    SUM(losses) as losses,
    SUM(game_wins) as game_wins,
    SUM(game_losses) as game_losses
  FROM (
    SELECT 
      team1_id as team_id,
      CASE WHEN winner_id = team1_id THEN 1 ELSE 0 END as wins,
      CASE WHEN loser_id = team1_id THEN 1 ELSE 0 END as losses,
      COALESCE(team1_game_wins, 0) as game_wins,
      COALESCE(team2_game_wins, 0) as game_losses
    FROM matches_archive
    WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
      AND iscompleted = true
      AND team1_id IS NOT NULL
    UNION ALL
    SELECT 
      team2_id as team_id,
      CASE WHEN winner_id = team2_id THEN 1 ELSE 0 END as wins,
      CASE WHEN loser_id = team2_id THEN 1 ELSE 0 END as losses,
      COALESCE(team2_game_wins, 0) as game_wins,
      COALESCE(team1_game_wins, 0) as game_losses
    FROM matches_archive
    WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
      AND iscompleted = true
      AND team2_id IS NOT NULL
  ) all_team_matches
  GROUP BY team_id
)
UPDATE team_season_stats tss
SET 
  match_wins = COALESCE(rs.wins, 0),
  match_losses = COALESCE(rs.losses, 0),
  game_wins = COALESCE(rs.game_wins, 0),
  game_losses = COALESCE(rs.game_losses, 0),
  recorded_at = now()
FROM regular_season_stats rs
WHERE tss.season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND tss.team_id = rs.team_id;
