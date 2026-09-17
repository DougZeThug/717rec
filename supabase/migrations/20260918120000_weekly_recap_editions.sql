-- Weekly recap editions: a published recap is a saved edition, not a live view.
--
--   recap_editions          identity and publish state, one row per season week
--   recap_edition_versions  append-only content, including the frozen facts
--
-- Why two tables rather than one with a version column:
--
--   * The public address (/recap/<season-slug>/week-<n>) and the "newest
--     published edition" the home page reads must each resolve to exactly one
--     row. Splitting identity from content makes that a plain unique index
--     instead of a MAX(version) subquery on every public read.
--   * It lets the DATABASE enforce the correction rule rather than convention.
--     recap_edition_versions is granted no UPDATE and no DELETE, so a published
--     version physically cannot be rewritten. A correction is a new row, and
--     the edition's published_version_id moves to point at it.
--
-- Why the facts are frozen:
--
--   WeeklyRecapService reads live tables. Re-opening a week 3 recap in week 8
--   would show week 8 numbers under a week 3 headline. Each version therefore
--   stores the facts it was built from, and the public page renders only from
--   that JSON - it never re-queries matches, teams or snapshots.
--
-- season_slug and season_name are copied in at creation on purpose. seasons.name
-- can be edited later; a published address must not move under a shared link.
--
-- Frontend: src/components/admin/weekly-content/ ("Weekly Content Pack" tab)
-- and src/pages/RecapEdition.tsx.

-- ---------------------------------------------------------------------------
-- 1. Editions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recap_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  week_number integer NOT NULL CHECK (week_number BETWEEN 1 AND 60),
  season_slug text NOT NULL CHECK (season_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  season_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'unpublished')),
  published_version_id uuid,
  -- Set once. A correction moves published_at and leaves this alone, so the
  -- public page can say "Published <date>, corrected <date>".
  first_published_at timestamptz,
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recap_editions_season_week_key UNIQUE (season_id, week_number),
  CONSTRAINT recap_editions_slug_week_key UNIQUE (season_slug, week_number),
  -- A published edition always points at the version it published.
  CONSTRAINT recap_editions_published_is_complete
    CHECK (status <> 'published'
           OR (published_version_id IS NOT NULL AND published_at IS NOT NULL))
);

-- ---------------------------------------------------------------------------
-- 2. Versions. Append-only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recap_edition_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.recap_editions(id) ON DELETE CASCADE,
  version integer CHECK (version >= 1),
  facts jsonb NOT NULL,
  facts_schema_version integer NOT NULL DEFAULT 1,
  headline text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  caption_source text NOT NULL DEFAULT 'manual'
    CHECK (caption_source IN ('ai', 'ai_edited', 'manual', 'fallback')),
  caption_model text,
  commissioner_note text,
  correction_note text,
  -- Public URL of the rendered summary graphic, once one is uploaded.
  graphic_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT recap_edition_versions_edition_version_key UNIQUE (edition_id, version)
);

-- Deferred: publishing inserts a version and points the edition at it inside one
-- transaction, and the ON DELETE CASCADE from editions would otherwise fight the
-- reference on the way out.
ALTER TABLE public.recap_editions
  DROP CONSTRAINT IF EXISTS recap_editions_published_version_fkey;
ALTER TABLE public.recap_editions
  ADD CONSTRAINT recap_editions_published_version_fkey
  FOREIGN KEY (published_version_id)
  REFERENCES public.recap_edition_versions(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------------------
-- 3. Version numbering. A read-then-write MAX(version) + 1 in the client races
--    two admins saving at once; the unique constraint is the backstop.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recap_version_assign_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $fn$
BEGIN
  IF NEW.version IS NULL THEN
    SELECT COALESCE(MAX(version), 0) + 1
      INTO NEW.version
      FROM public.recap_edition_versions
     WHERE edition_id = NEW.edition_id;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS recap_version_assign_number ON public.recap_edition_versions;
CREATE TRIGGER recap_version_assign_number
  BEFORE INSERT ON public.recap_edition_versions
  FOR EACH ROW EXECUTE FUNCTION public.recap_version_assign_number();

-- ---------------------------------------------------------------------------
-- 4. Indexes.
-- ---------------------------------------------------------------------------
-- Exactly the home page's "newest published edition" query.
CREATE INDEX IF NOT EXISTS recap_editions_latest_published_idx
  ON public.recap_editions (published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS recap_edition_versions_edition_idx
  ON public.recap_edition_versions (edition_id, version DESC);

-- ---------------------------------------------------------------------------
-- 5. Row level security.
-- ---------------------------------------------------------------------------
ALTER TABLE public.recap_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recap_edition_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read published recap editions" ON public.recap_editions;
CREATE POLICY "Read published recap editions"
  ON public.recap_editions FOR SELECT
  USING (status = 'published' OR public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can insert recap editions" ON public.recap_editions;
CREATE POLICY "Admins can insert recap editions"
  ON public.recap_editions FOR INSERT
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update recap editions" ON public.recap_editions;
CREATE POLICY "Admins can update recap editions"
  ON public.recap_editions FOR UPDATE
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Only an unpublished draft can be thrown away. Once something has been
-- published under an address, that address keeps its history.
DROP POLICY IF EXISTS "Admins can delete draft recap editions" ON public.recap_editions;
CREATE POLICY "Admins can delete draft recap editions"
  ON public.recap_editions FOR DELETE
  USING (public.current_user_is_admin() AND status = 'draft');

-- The public sees the one version the edition currently points at, never the
-- drafts or superseded corrections behind it.
DROP POLICY IF EXISTS "Read the published recap version" ON public.recap_edition_versions;
CREATE POLICY "Read the published recap version"
  ON public.recap_edition_versions FOR SELECT
  USING (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1
        FROM public.recap_editions e
       WHERE e.id = recap_edition_versions.edition_id
         AND e.status = 'published'
         AND e.published_version_id = recap_edition_versions.id
    )
  );

DROP POLICY IF EXISTS "Admins can insert recap versions" ON public.recap_edition_versions;
CREATE POLICY "Admins can insert recap versions"
  ON public.recap_edition_versions FOR INSERT
  WITH CHECK (public.current_user_is_admin());

-- No UPDATE and no DELETE policy on purpose. A correction is a new version.

-- ---------------------------------------------------------------------------
-- 6. Grants. UPDATE/DELETE on versions is withheld at the grant level too, so
--    the append-only rule does not rest on the absence of a policy alone.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.recap_editions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.recap_edition_versions FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.recap_editions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.recap_editions TO authenticated;
GRANT SELECT ON public.recap_edition_versions TO anon, authenticated;
GRANT INSERT ON public.recap_edition_versions TO authenticated;

GRANT ALL ON public.recap_editions TO service_role;
GRANT ALL ON public.recap_edition_versions TO service_role;

-- ---------------------------------------------------------------------------
-- 7. updated_at maintenance.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recap_editions_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS recap_editions_touch_updated_at ON public.recap_editions;
CREATE TRIGGER recap_editions_touch_updated_at
  BEFORE UPDATE ON public.recap_editions
  FOR EACH ROW EXECUTE FUNCTION public.recap_editions_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Audit coverage. Publishing is an admin mutation like any other: attach the
--    shared trigger and extend the drift guard, so the smoke test enforces it.
--    Mirrors 20260820183328 with the two recap tables appended.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_admin_mutation ON public.recap_editions;
CREATE TRIGGER audit_admin_mutation
  AFTER INSERT OR UPDATE OR DELETE ON public.recap_editions
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_mutation();

DROP TRIGGER IF EXISTS audit_admin_mutation ON public.recap_edition_versions;
CREATE TRIGGER audit_admin_mutation
  AFTER INSERT OR UPDATE OR DELETE ON public.recap_edition_versions
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_mutation();

CREATE OR REPLACE FUNCTION public.admin_audit_coverage_drift()
RETURNS TABLE(issue text)
LANGUAGE plpgsql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $fn$
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
    'challonge_fallback_brackets',
    'support_tickets',
    'power_score_weight_history',
    'recap_editions',
    'recap_edition_versions'
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
$fn$;
