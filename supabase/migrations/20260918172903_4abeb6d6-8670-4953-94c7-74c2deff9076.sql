-- Weekly recap editions: the storage layer for the Weekly Content Pack.
--
-- A published recap is a record of a week that has passed. Live tables keep
-- moving -- scores are corrected, teams are renamed, power scores recomputed
-- -- so an edition must render from a frozen snapshot, never from live data.
-- Two tables model that:
--
--   recap_editions          one row per (season, week); the publishable unit
--   recap_edition_versions  append-only; a correction is a NEW row, so a
--                           published recap can never be silently rewritten
--
-- The frozen facts live in recap_edition_versions.facts (jsonb). Shape is
-- documented in src/types/recapEdition.ts; the DB deliberately does not
-- validate the shape -- the admin UI is the only writer and the type is the
-- contract.

-- The two tables are NOT created here.
--
-- 20260918120000_weekly_recap_editions.sql, which replays first, already creates
-- both with the shape the application actually uses. This file used to repeat
-- them with `CREATE TABLE IF NOT EXISTS` and a narrower, conflicting shape:
-- no published_by, created_by, facts_schema_version, caption_model,
-- commissioner_note or correction_note; headline and caption nullable; and a
-- caption_source CHECK of ('written', 'generated', 'edited') where the app
-- writes 'ai', 'ai_edited', 'manual' and 'fallback' -- so had this definition
-- ever won, every version insert would have been rejected.
--
-- Replayed in order the duplicate was a harmless no-op, but it was not harmless
-- to `supabase gen types`: run against a database where this narrower shape had
-- taken effect, the generator dropped six columns and loosened three
-- nullabilities, and `npm run typecheck` went red with 18 errors. That happened
-- in September 2026, was corrected by hand in f02ff58, and came back three days
-- later when the generated types were replaced again. Removing the duplicate
-- removes the shape that made the wrong types describable at all.
--
-- Everything below -- the version-numbering trigger, grants, RLS policies and
-- audit triggers -- is kept. It is all idempotent and separately named from the
-- earlier migration's equivalents, so it applies on top without conflict.

-- The table comments stay: they document the tables rather than define them,
-- and the earlier migration does not set any.
COMMENT ON TABLE public.recap_editions IS
  'One weekly recap edition per season week. Status and the published-version pointer only; content lives in recap_edition_versions.';

COMMENT ON TABLE public.recap_edition_versions IS
  'Append-only versions of a recap edition. A correction inserts a new row; UPDATE and DELETE are deliberately not granted, so a published recap cannot be rewritten.';

-- FK from editions to the version that renders it. Deferred creation because
-- the two tables reference each other.
ALTER TABLE public.recap_editions
  DROP CONSTRAINT IF EXISTS recap_editions_published_version_fkey;
ALTER TABLE public.recap_editions
  ADD CONSTRAINT recap_editions_published_version_fkey
  FOREIGN KEY (published_version_id)
  REFERENCES public.recap_edition_versions (id)
  ON DELETE SET NULL;

-- Version numbers are assigned by the database, never the client, so two
-- admins saving at once cannot collide or skip.
CREATE OR REPLACE FUNCTION public.assign_recap_edition_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1
    INTO NEW.version
    FROM public.recap_edition_versions
   WHERE edition_id = NEW.edition_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_recap_edition_version ON public.recap_edition_versions;
CREATE TRIGGER assign_recap_edition_version
  BEFORE INSERT ON public.recap_edition_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_recap_edition_version();

-- updated_at maintenance, same pattern as the rest of the schema.
DROP TRIGGER IF EXISTS update_recap_editions_updated_at ON public.recap_editions;
CREATE TRIGGER update_recap_editions_updated_at
  BEFORE UPDATE ON public.recap_editions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grants. Anyone can read a PUBLISHED edition (RLS below decides which rows);
-- only admins write. Versions get INSERT and SELECT only: append-only is the
-- feature. There is intentionally no UPDATE or DELETE grant on versions.
GRANT SELECT ON public.recap_editions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recap_editions TO authenticated;
GRANT ALL ON public.recap_editions TO service_role;

GRANT SELECT ON public.recap_edition_versions TO anon;
GRANT SELECT, INSERT ON public.recap_edition_versions TO authenticated;
GRANT ALL ON public.recap_edition_versions TO service_role;

ALTER TABLE public.recap_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recap_edition_versions ENABLE ROW LEVEL SECURITY;

-- Public reads see published editions only. Drafts and unpublished editions
-- are admin-only.
DROP POLICY IF EXISTS "Anyone can read published recap editions" ON public.recap_editions;
CREATE POLICY "Anyone can read published recap editions"
  ON public.recap_editions
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Admins can manage recap editions" ON public.recap_editions;
CREATE POLICY "Admins can manage recap editions"
  ON public.recap_editions
  FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Anyone can read published recap versions" ON public.recap_edition_versions;
CREATE POLICY "Anyone can read published recap versions"
  ON public.recap_edition_versions
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.recap_editions e
       WHERE e.id = edition_id
         AND e.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins can add recap versions" ON public.recap_edition_versions;
CREATE POLICY "Admins can add recap versions"
  ON public.recap_edition_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());

-- Audit coverage: admin mutations to editions and version inserts are audited
-- like every other admin table. Versions are never updated or deleted by
-- design, so the audit trigger covers INSERT only there.
DROP TRIGGER IF EXISTS audit_recap_editions ON public.recap_editions;
CREATE TRIGGER audit_recap_editions
  AFTER INSERT OR UPDATE OR DELETE ON public.recap_editions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_admin_mutation();

DROP TRIGGER IF EXISTS audit_recap_edition_versions ON public.recap_edition_versions;
CREATE TRIGGER audit_recap_edition_versions
  AFTER INSERT ON public.recap_edition_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_admin_mutation();