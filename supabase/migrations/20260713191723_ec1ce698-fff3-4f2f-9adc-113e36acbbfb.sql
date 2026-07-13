DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_update_playoff_record'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE 'ALTER FUNCTION public.fn_update_playoff_record() SET search_path = ''pg_catalog'', ''public''';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_participants'
      AND pg_get_function_identity_arguments(p.oid) = 'p_tournament_id uuid'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.get_participants(uuid) SET search_path = ''pg_catalog'', ''public''';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'snapshot_current_season'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE 'ALTER FUNCTION public.snapshot_current_season() SET search_path = ''pg_catalog'', ''public''';
  END IF;
END $$;