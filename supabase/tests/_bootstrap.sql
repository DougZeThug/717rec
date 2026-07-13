-- CI-only bootstrap. Provides minimal stand-ins for Supabase-managed
-- schemas (auth, storage, extensions, vault) so that the migrations in
-- supabase/migrations/ can be applied against a vanilla Postgres 15 in CI.
--
-- This file is NEVER loaded by the real Supabase project — those schemas
-- already exist there. It is loaded by .github/workflows/supabase-ci.yml
-- before the migration apply step.
\set ON_ERROR_STOP on

-- Common extensions used across migrations.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Supabase reserved schemas.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE SCHEMA IF NOT EXISTS realtime;

-- Supabase creates this publication for Realtime; several migrations run
-- ALTER PUBLICATION supabase_realtime ADD TABLE ... and fail without it.
DO $$ BEGIN
  CREATE PUBLICATION supabase_realtime;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reserved roles referenced by GRANT statements in migrations.
DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'postgres';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT anon, authenticated, service_role TO authenticator;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Minimal auth.users table — many migrations FK against it.
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auth helper functions used by RLS policies. CI smoke tests can set
-- request.jwt.claim.* locally via auth.set_test_claims(); unset sessions
-- still evaluate as anonymous users.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon')::text;
$$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;
CREATE OR REPLACE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.email', true), '')::text;
$$;
CREATE OR REPLACE FUNCTION auth.set_test_claims(
  p_uid uuid DEFAULT NULL,
  p_role text DEFAULT 'authenticated',
  p_claims jsonb DEFAULT '{}'::jsonb,
  p_email text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid::text, ''), true);
  PERFORM set_config('request.jwt.claim.role', COALESCE(p_role, 'anon'), true);
  PERFORM set_config('request.jwt.claims', COALESCE(p_claims, '{}'::jsonb)::text, true);
  PERFORM set_config('request.jwt.claim.email', COALESCE(p_email, ''), true);
END;
$$;

-- Minimal storage.* surface used by some migrations.
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT string_to_array(name, '/');
$$;
CREATE OR REPLACE FUNCTION storage.filename(name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT split_part(name, '/', array_length(string_to_array(name, '/'), 1));
$$;
CREATE OR REPLACE FUNCTION storage.extension(name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT split_part(name, '.', array_length(string_to_array(name, '.'), 1));
$$;

GRANT USAGE ON SCHEMA auth, storage, extensions TO anon, authenticated, service_role;
