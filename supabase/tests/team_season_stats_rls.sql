-- team_season_stats must stay publicly readable (stats, history, insights,
-- team pages, public MCP tools). Fails loudly if the read rule goes missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_season_stats'
      AND cmd = 'SELECT'
      AND 'public' = ANY (roles)
      AND qual = 'true'
  ) THEN
    RAISE EXCEPTION 'team_season_stats is missing its public SELECT policy';
  END IF;
END $$;

BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) AS anon_visible_rows FROM public.team_season_stats;
ROLLBACK;
