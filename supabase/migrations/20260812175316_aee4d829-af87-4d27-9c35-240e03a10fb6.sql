REVOKE ALL ON public.team_season_stats_pre_division_history FROM anon, authenticated;
GRANT ALL ON public.team_season_stats_pre_division_history TO service_role;
ALTER TABLE public.team_season_stats_pre_division_history ENABLE ROW LEVEL SECURITY;