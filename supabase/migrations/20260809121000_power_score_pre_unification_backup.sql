-- Snapshot every power score as it stands before the formula is unified.
--
-- This must run before any consumer is switched over. Unifying the formula
-- changes historical ratings: team_season_stats currently uses plain win rate
-- while the canonical formula uses division-weighted win rate, so ratings for
-- teams outside the Competitive division fall and Career Rankings re-order.
--
-- That change cannot be scoped to recent seasons. upsert_team_season_stats()
-- takes no season parameter and re-derives every season from v_team_season_agg
-- on each match finalize, so the moment the view changes, all history follows.
--
-- These tables are the way back. Restore with:
--
--   UPDATE public.team_season_stats s
--   SET power_score = b.power_score, sos = b.sos,
--       match_wins = b.match_wins, match_losses = b.match_losses,
--       game_wins = b.game_wins, game_losses = b.game_losses
--   FROM public.team_season_stats_pre_unification b
--   WHERE s.season_id = b.season_id AND s.team_id = b.team_id;
--
-- together with reverting the view definitions. Drop these tables only once the
-- new numbers have been reviewed on the live site.

CREATE TABLE IF NOT EXISTS public.team_season_stats_pre_unification AS
SELECT *, now() AS backed_up_at
FROM public.team_season_stats;

CREATE TABLE IF NOT EXISTS public.team_details_power_pre_unification AS
SELECT
  team_id,
  power_score,
  wins,
  losses,
  game_wins,
  game_losses,
  win_percentage,
  game_win_percentage,
  now() AS backed_up_at
FROM public.v_team_details;

COMMENT ON TABLE public.team_season_stats_pre_unification IS
  'Backup of team_season_stats taken before the power-score formula was unified. '
  'Safe to drop once the new historical ratings have been accepted.';

COMMENT ON TABLE public.team_details_power_pre_unification IS
  'Backup of v_team_details power score and record columns taken before the '
  'power-score formula was unified. Used to prove that teams with no playoff '
  'games kept an identical score.';

-- Backups hold the same data as their sources, which are already readable by the
-- app, but nothing needs to query them from the client.
ALTER TABLE public.team_season_stats_pre_unification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_details_power_pre_unification ENABLE ROW LEVEL SECURITY;
