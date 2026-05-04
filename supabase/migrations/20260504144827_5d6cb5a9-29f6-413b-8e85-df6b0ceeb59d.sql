CREATE OR REPLACE FUNCTION public.is_team_opted_out_active(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_season_opt_out o
    JOIN seasons s ON s.id = o.season_id AND s.is_active
    WHERE o.team_id = _team_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_team_opted_out_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_team_opted_out_active(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Public read teams" ON public.teams;
CREATE POLICY "Public read teams" ON public.teams
  FOR SELECT
  USING (NOT public.is_team_opted_out_active(id));