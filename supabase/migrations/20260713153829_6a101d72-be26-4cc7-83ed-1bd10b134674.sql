-- Harden active SECURITY DEFINER functions that were originally created without
-- an explicit search_path. Keep pg_catalog first to avoid object-shadowing and
-- public second for existing application tables/functions.

-- Recreate badge reader RPCs so their SECURITY DEFINER clauses carry an
-- explicit search_path and their table references are schema-qualified.
CREATE OR REPLACE FUNCTION public.get_team_badges(p_team_id uuid)
RETURNS TABLE (
  id uuid,
  team_id uuid,
  badge_type text,
  season_id uuid,
  awarded_at timestamp with time zone,
  metadata jsonb,
  is_active boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tbe.id,
    tbe.team_id,
    tbe.badge_type::text,
    tbe.season_id,
    tbe.awarded_at,
    tbe.metadata,
    tbe.is_active,
    tbe.created_at
  FROM public.team_badge_events tbe
  WHERE tbe.team_id = p_team_id
    AND tbe.is_active = true
  ORDER BY tbe.awarded_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_team_badges()
RETURNS TABLE (
  id uuid,
  team_id uuid,
  badge_type text,
  season_id uuid,
  awarded_at timestamp with time zone,
  metadata jsonb,
  is_active boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tbe.id,
    tbe.team_id,
    tbe.badge_type::text,
    tbe.season_id,
    tbe.awarded_at,
    tbe.metadata,
    tbe.is_active,
    tbe.created_at
  FROM public.team_badge_events tbe
  WHERE tbe.is_active = true
  ORDER BY tbe.awarded_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_season_badges(p_season_id uuid)
RETURNS TABLE (
  id uuid,
  team_id uuid,
  badge_type text,
  season_id uuid,
  awarded_at timestamp with time zone,
  metadata jsonb,
  is_active boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tbe.id,
    tbe.team_id,
    tbe.badge_type::text,
    tbe.season_id,
    tbe.awarded_at,
    tbe.metadata,
    tbe.is_active,
    tbe.created_at
  FROM public.team_badge_events tbe
  WHERE tbe.season_id = p_season_id
    AND tbe.is_active = true
  ORDER BY tbe.awarded_at DESC;
END;
$$;

-- Stable signatures: adjust function configuration in place.
ALTER FUNCTION public.award_clutch_performer_badge(uuid)
  SET search_path = 'pg_catalog', 'public';

ALTER FUNCTION public.process_match_badges(uuid, uuid)
  SET search_path = 'pg_catalog', 'public';

ALTER FUNCTION public.user_belongs_to_team(uuid)
  SET search_path = 'pg_catalog', 'public';

ALTER FUNCTION public.validate_division_seeds(uuid)
  SET search_path = 'pg_catalog', 'public';

ALTER FUNCTION public.log_admin_privilege_change()
  SET search_path = 'pg_catalog', 'public';

ALTER FUNCTION public.prevent_admin_privilege_escalation()
  SET search_path = 'pg_catalog', 'public';
