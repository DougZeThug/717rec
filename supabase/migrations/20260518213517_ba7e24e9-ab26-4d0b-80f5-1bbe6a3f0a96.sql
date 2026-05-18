-- Canonical RLS for public.seasons. Idempotent: safe to re-run.
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Public read (anon + authenticated). League standings, history, and the
-- marketing site rely on this. Do not narrow without product review.
DROP POLICY IF EXISTS "Anyone can view seasons" ON public.seasons;
CREATE POLICY "Anyone can view seasons"
  ON public.seasons FOR SELECT TO public
  USING (true);
COMMENT ON POLICY "Anyone can view seasons" ON public.seasons IS
  'Intentional: seasons metadata is public (anon + authenticated). Do not narrow without product review.';

-- Admin-only writes
DROP POLICY IF EXISTS "Admins can insert seasons" ON public.seasons;
CREATE POLICY "Admins can insert seasons"
  ON public.seasons FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update seasons" ON public.seasons;
CREATE POLICY "Admins can update seasons"
  ON public.seasons FOR UPDATE TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can delete seasons" ON public.seasons;
CREATE POLICY "Admins can delete seasons"
  ON public.seasons FOR DELETE TO authenticated
  USING (public.current_user_is_admin());

-- Drift detector: returns one row per canonical policy that is missing
-- or attached to the wrong role. Should always return zero rows.
CREATE OR REPLACE FUNCTION public.seasons_rls_drift()
RETURNS TABLE (issue text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'pg_catalog', 'public'
AS $$
  WITH expected(policyname, cmd, role) AS (
    VALUES
      ('Anyone can view seasons',   'SELECT', 'public'),
      ('Admins can insert seasons', 'INSERT', 'authenticated'),
      ('Admins can update seasons', 'UPDATE', 'authenticated'),
      ('Admins can delete seasons', 'DELETE', 'authenticated')
  )
  SELECT format('missing %s/%s for role %s', e.policyname, e.cmd, e.role)
  FROM expected e
  LEFT JOIN pg_policies p
    ON p.schemaname = 'public'
   AND p.tablename  = 'seasons'
   AND p.policyname = e.policyname
   AND p.cmd        = e.cmd
   AND e.role = ANY (p.roles)
  WHERE p.policyname IS NULL;
$$;

COMMENT ON FUNCTION public.seasons_rls_drift() IS
  'Returns one row per canonical seasons RLS policy that is missing or attached to the wrong role. Should always return zero rows. Run from smoke tests / CI.';