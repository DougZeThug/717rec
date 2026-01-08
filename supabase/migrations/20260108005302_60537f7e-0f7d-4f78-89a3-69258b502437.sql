-- Function to clean up orphaned team_season_stats records
-- Removes stats for teams that have no completed matches in a season
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_team_season_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  DELETE FROM public.team_season_stats tss
  WHERE NOT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.season_id = tss.season_id
    AND (m.team1_id = tss.team_id OR m.team2_id = tss.team_id)
    AND m.iscompleted = true
  );
END;
$$;

-- Trigger function to auto-cleanup after match deletions
CREATE OR REPLACE FUNCTION public.trigger_cleanup_orphaned_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  PERFORM public.cleanup_orphaned_team_season_stats();
  RETURN NULL;
END;
$$;

-- Create trigger that fires after any match delete
DROP TRIGGER IF EXISTS trigger_cleanup_orphaned_stats ON public.matches;
CREATE TRIGGER trigger_cleanup_orphaned_stats
AFTER DELETE ON public.matches
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_cleanup_orphaned_stats();

-- Immediately clean up existing orphaned records
SELECT public.cleanup_orphaned_team_season_stats();