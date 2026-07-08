CREATE OR REPLACE FUNCTION public.preserve_team_analysis_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.created_by := OLD.created_by;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS preserve_team_analysis_created_by ON public.team_analysis;

CREATE TRIGGER preserve_team_analysis_created_by
BEFORE UPDATE ON public.team_analysis
FOR EACH ROW EXECUTE FUNCTION public.preserve_team_analysis_created_by();