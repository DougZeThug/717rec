DROP POLICY IF EXISTS "Anyone can view team season stats" ON public.team_season_stats;
CREATE POLICY "Anyone can view team season stats"
  ON public.team_season_stats FOR SELECT TO public USING (true);