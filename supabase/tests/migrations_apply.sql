-- Sanity check that the full migration set ran. Asserts a handful of
-- expected core tables exist after apply. Update this list when the
-- schema legitimately changes.
\set ON_ERROR_STOP on
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t, ', ')
    INTO missing
    FROM (VALUES
      ('teams'),
      ('matches'),
      ('seasons'),
      ('profiles'),
      ('divisions'),
      ('games'),
      ('brackets'),
      ('participants'),
      ('team_season_stats'),
      ('match_rounds'),
      ('game_players')
    ) AS expected(t)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = expected.t
    );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Migration apply sanity check failed; missing tables: %', missing;
  END IF;

  RAISE NOTICE 'Migration apply sanity check OK.';
END $$;