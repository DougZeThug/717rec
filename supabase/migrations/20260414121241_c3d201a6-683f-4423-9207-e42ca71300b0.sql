CREATE OR REPLACE FUNCTION public.sync_match_delete_to_playoff_matches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM playoff_matches WHERE match_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_sync_match_delete_to_playoff
  AFTER DELETE ON public.match
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_match_delete_to_playoff_matches();