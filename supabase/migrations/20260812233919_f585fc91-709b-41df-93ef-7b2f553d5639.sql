CREATE OR REPLACE FUNCTION public.sync_bracket_wb_champion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF NEW.placement = 1 AND NEW.team_id IS NOT NULL AND NEW.bracket_id IS NOT NULL THEN
    UPDATE public.brackets b
       SET wb_champion_id = NEW.team_id
     WHERE b.id = NEW.bracket_id
       AND (b.wb_champion_id IS DISTINCT FROM NEW.team_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_bracket_wb_champion ON public.playoff_team_records;

CREATE TRIGGER trg_sync_bracket_wb_champion
AFTER INSERT OR UPDATE OF placement, team_id ON public.playoff_team_records
FOR EACH ROW
EXECUTE FUNCTION public.sync_bracket_wb_champion();

-- Backfill any other bracket that has a first-place record but no recorded winner.
UPDATE public.brackets b
   SET wb_champion_id = r.team_id
  FROM public.playoff_team_records r
 WHERE r.bracket_id = b.id
   AND r.placement = 1
   AND b.wb_champion_id IS NULL;