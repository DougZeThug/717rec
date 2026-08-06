GRANT SELECT ON public.team_season_stats TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_season_stats TO authenticated;
GRANT ALL ON public.team_season_stats TO service_role;