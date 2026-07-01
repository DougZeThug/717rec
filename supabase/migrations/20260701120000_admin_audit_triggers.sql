-- Admin audit trail --------------------------------------------------------
--
-- Automatically record every admin-initiated mutation (INSERT / UPDATE /
-- DELETE) on the core admin-managed tables into public.security_audit_log:
--   who  -> user_id      (auth.uid(), captured by log_security_operation)
--   what -> action       ('admin_insert' | 'admin_update' | 'admin_delete'),
--           table_name, record_id, old_values, new_values
--   when -> created_at   (default now())
--
-- This REUSES the existing security_audit_log table and the
-- log_security_operation() SECURITY DEFINER RPC (added in earlier migrations)
-- instead of introducing new storage. Until now those were only ever called
-- from one-off migration scripts, so admin mutations were never actually
-- logged; these triggers close that gap.
--
-- Only admin-initiated writes are logged. Ordinary member writes and
-- service-role / cron writes (auth.uid() IS NULL) are ignored. Audit logging
-- is best-effort: any failure inside the trigger is swallowed so it can never
-- block or roll back the underlying admin action.

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
  -- Log admin-initiated writes only. auth.uid() IS NULL covers anon and
  -- service-role / cron callers; non-admins are filtered by current_user_is_admin().
  IF auth.uid() IS NULL OR NOT public.current_user_is_admin() THEN
    RETURN NULL;
  END IF;

  IF TG_OP <> 'INSERT' THEN
    v_old := to_jsonb(OLD);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new := to_jsonb(NEW);
  END IF;

  -- Best-effort extraction of the row's uuid primary key ("id"). Rows whose id
  -- is not a uuid simply log a NULL record_id; the full snapshot is still kept.
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

  RETURN NULL; -- AFTER trigger: return value is ignored.
EXCEPTION WHEN others THEN
  -- Never let an audit failure break the underlying admin mutation.
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.audit_admin_mutation() IS
  'AFTER row trigger: records admin-initiated INSERT/UPDATE/DELETE into '
  'security_audit_log via log_security_operation(). No-op for non-admin / '
  'service-role writes.';

-- Attach the trigger to each admin-managed table. Guarded by to_regclass so the
-- migration is safe to apply even if a table is absent, and re-runnable.
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
    'contact_requests'
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

-- Drift helper for the SQL smoke test: returns one row per missing trigger /
-- missing function so CI fails loudly if coverage regresses. Mirrors the
-- existing seasons_rls_drift() pattern.
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
    'contact_requests'
  ];
BEGIN
  IF to_regproc('public.audit_admin_mutation') IS NULL THEN
    issue := 'missing function public.audit_admin_mutation()';
    RETURN NEXT;
  END IF;

  FOREACH t IN ARRAY audited_tables LOOP
    -- Skip tables absent in this environment (nothing to assert against).
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
    ) THEN
      issue := format('missing audit trigger on public.%s', t);
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;
