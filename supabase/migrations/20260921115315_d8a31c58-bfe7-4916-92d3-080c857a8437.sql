ALTER TABLE public.recap_editions
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.recap_edition_versions
  ADD COLUMN IF NOT EXISTS facts_schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS caption_model text,
  ADD COLUMN IF NOT EXISTS commissioner_note text,
  ADD COLUMN IF NOT EXISTS correction_note text;