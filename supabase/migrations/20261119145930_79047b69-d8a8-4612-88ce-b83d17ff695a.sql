-- Keep the Power Score Migration Review RPCs stable. Only their owner can run
-- the workers that rebuild views and recompute stored scores. A missing profile
-- makes current_user_is_admin() return NULL, which must fail closed.
ALTER FUNCTION public.admin_revert_power_score_unification()
  RENAME TO _revert_power_score_unification_owner;
ALTER FUNCTION public.admin_reapply_power_score_unification()
  RENAME TO _reapply_power_score_unification_owner;

REVOKE ALL ON FUNCTION public._revert_power_score_unification_owner(),
  public._reapply_power_score_unification_owner()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.admin_revert_power_score_unification()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF public.current_user_is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  RETURN public._revert_power_score_unification_owner();
END;
$$;

CREATE FUNCTION public.admin_reapply_power_score_unification()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF public.current_user_is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  RETURN public._reapply_power_score_unification_owner();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revert_power_score_unification(),
  public.admin_reapply_power_score_unification() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revert_power_score_unification(),
  public.admin_reapply_power_score_unification() TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_revert_power_score_unification() IS
  'Admin-only entry point to restore the pre-unification Power Score views and regenerate stored scores.';
COMMENT ON FUNCTION public.admin_reapply_power_score_unification() IS
  'Admin-only entry point to restore the unified Power Score views and regenerate stored scores.';