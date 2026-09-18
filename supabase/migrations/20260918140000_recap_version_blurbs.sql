-- Per-team blurbs for the weekly power rankings.
--
-- A blurb belongs with headline and caption, not in the frozen facts. The facts
-- are what the database said about the week; a blurb is what the league CHOSE
-- to say about a team. Keeping them apart means regenerating an edition's facts
-- cannot wipe written text, and a correction still appends a whole new version
-- rather than rewriting one — recap_edition_versions has no UPDATE or DELETE
-- grant, and that stays true here.
--
-- Shape: { "<team uuid>": "<one line>" }. A map rather than an array so a team
-- dropping out of the rankings cannot silently shift everyone else's blurb onto
-- the wrong team.
--
-- Frontend: src/components/admin/weekly-content/ and src/pages/RecapEdition.tsx.

ALTER TABLE public.recap_edition_versions
  ADD COLUMN IF NOT EXISTS blurbs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS blurbs_source text NOT NULL DEFAULT 'manual';

-- Same vocabulary as caption_source, for the same reason: an admin reviewing an
-- old edition needs to know whether the words were written, generated, or
-- generated and then edited.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recap_edition_versions_blurbs_source_check'
  ) THEN
    ALTER TABLE public.recap_edition_versions
      ADD CONSTRAINT recap_edition_versions_blurbs_source_check
      CHECK (blurbs_source IN ('ai', 'ai_edited', 'manual', 'fallback'));
  END IF;
END $$;

-- An object, never an array or a bare string: the renderer looks blurbs up by
-- team id, and anything else would read as a missing blurb for every team.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recap_edition_versions_blurbs_is_object'
  ) THEN
    ALTER TABLE public.recap_edition_versions
      ADD CONSTRAINT recap_edition_versions_blurbs_is_object
      CHECK (jsonb_typeof(blurbs) = 'object');
  END IF;
END $$;

COMMENT ON COLUMN public.recap_edition_versions.blurbs IS
  'Power ranking blurbs, keyed by team id. Editorial text, deliberately not part of the frozen facts.';
COMMENT ON COLUMN public.recap_edition_versions.blurbs_source IS
  'How the blurbs were produced: ai, ai_edited, manual, or fallback.';
