-- Ensure the audit trigger function exists (idempotent; matches the original
-- admin_audit_triggers migration definition). Safe to re-run.
CREATE OR REPLACE FUNCTION public.audit_admin_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_record_id uuid;
  v_old jsonb := NULL;
  v_new jsonb := NULL;
BEGIN
  IF auth.uid() IS NULL OR NOT public.current_user_is_admin() THEN
    RETURN NULL;
  END IF;

  IF TG_OP <> 'INSERT' THEN
    v_old := to_jsonb(OLD);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new := to_jsonb(NEW);
  END IF;

  BEGIN
    v_record_id := COALESCE(v_new ->> 'id', v_old ->> 'id')::uuid;
  EXCEPTION WHEN others THEN
    v_record_id := NULL;
  END;

  PERFORM public.log_security_operation(
    'admin_' || lower(TG_OP),
    TG_TABLE_NAME,
    v_record_id,
    v_old,
    v_new
  );

  RETURN NULL;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- Attach the trigger to the original + expanded set of admin-managed tables.
DO $$
DECLARE
  t text;
  audited_tables text[] := ARRAY[
    'seasons',
    'divisions',
    'teams',
    'team_timeslots',
    'brackets',
    'admin_notifications',
    'hero_cards',
    'theme_settings',
    'contact_requests',
    'season_team_participation',
    'blind_draw_settings',
    'challonge_fallback_config',
    'challonge_fallback_brackets'
  ];
BEGIN
  FOREACH t IN ARRAY audited_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'audit trigger skipped: table public.% not found', t;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS audit_admin_mutation ON public.%I;', t);
    EXECUTE format(
      'CREATE TRIGGER audit_admin_mutation '
      'AFTER INSERT OR UPDATE OR DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.audit_admin_mutation();',
      t
    );
  END LOOP;
END $$;

-- Refresh drift helper to include the expanded list.
CREATE OR REPLACE FUNCTION public.admin_audit_coverage_drift()
RETURNS TABLE(issue text)
LANGUAGE plpgsql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  t text;
  audited_tables text[] := ARRAY[
    'seasons',
    'divisions',
    'teams',
    'team_timeslots',
    'brackets',
    'admin_notifications',
    'hero_cards',
    'theme_settings',
    'contact_requests',
    'season_team_participation',
    'blind_draw_settings',
    'challonge_fallback_config',
    'challonge_fallback_brackets'
  ];
BEGIN
  IF to_regproc('public.audit_admin_mutation') IS NULL THEN
    issue := 'missing function public.audit_admin_mutation()';
    RETURN NEXT;
  END IF;

  FOREACH t IN ARRAY audited_tables LOOP
    CONTINUE WHEN to_regclass('public.' || t) IS NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = t
        AND tg.tgname = 'audit_admin_mutation'
        AND NOT tg.tgisinternal
        AND tg.tgfoid = 'public.audit_admin_mutation'::regproc
        AND (tg.tgtype::integer & 1) = 1
        AND (tg.tgtype::integer & 2) = 0
        AND (tg.tgtype::integer & 28) = 28
    ) THEN
      issue := format('missing or misconfigured audit trigger on public.%s', t);
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;
