-- Archive all Fall 2025 completed matches to matches_archive table
INSERT INTO matches_archive (
  id, bracket_id, round_number, team1_id, team2_id, winner_id, best_of,
  created_at, match_type, position, next_match_id, next_loser_match_id,
  team1_score, team2_score, date, iscompleted, loser_id, team1_game_wins,
  team2_game_wins, metadata, season_id, location, archived_at
)
SELECT 
  id, bracket_id, round_number, team1_id, team2_id, winner_id, best_of,
  created_at, match_type, position, next_match_id, next_loser_match_id,
  team1_score, team2_score, date, iscompleted, loser_id, team1_game_wins,
  team2_game_wins, metadata, season_id, location, now() as archived_at
FROM matches 
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND iscompleted = true;