-- Refresh team_season_stats with new power scores from v_team_season_agg
INSERT INTO public.team_season_stats 
  (season_id, team_id, match_wins, match_losses, game_wins, game_losses, sos, power_score, recorded_at)
SELECT 
  season_id, 
  team_id,
  match_wins::integer, 
  match_losses::integer, 
  game_wins::integer, 
  game_losses::integer,
  sos, 
  power_score,
  now()
FROM v_team_season_agg
ON CONFLICT (season_id, team_id) DO UPDATE
SET 
  match_wins = EXCLUDED.match_wins,
  match_losses = EXCLUDED.match_losses,
  game_wins = EXCLUDED.game_wins,
  game_losses = EXCLUDED.game_losses,
  sos = EXCLUDED.sos,
  power_score = EXCLUDED.power_score,
  recorded_at = now();