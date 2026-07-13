-- Enable required extensions for cron scheduling.
-- Guarded so the migration also applies on plain Postgres (e.g. the CI
-- rebuild database) where pg_cron/pg_net are not installed. On the real
-- Supabase project both extensions are available, so behavior is unchanged.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog';
    EXECUTE 'GRANT USAGE ON SCHEMA cron TO postgres';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions';
  END IF;
END $$;