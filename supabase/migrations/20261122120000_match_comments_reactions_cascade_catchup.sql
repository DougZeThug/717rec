SET lock_timeout = '5s';

-- Catch-up: the repo gets the ON DELETE CASCADE that production already has, on
-- match_comments.match_id and match_reactions.match_id.
--
-- Why this file exists. Production already has both keys as ON DELETE CASCADE
-- (Doug's live check, 2026-11-22). No migration in this repo sets that: the
-- baseline (00000000000000_baseline.sql) adds both keys with no delete rule, so a
-- database rebuilt from the repo (CI, a fresh project) has NO ACTION on them.
-- There, deleting a match that holds a reaction fails with 23503, from the admin
-- Scores bin (delete_match_with_stats_reversal) and from season archiving
-- (archive_season and partial_archive_season clear comments by hand, but not
-- reactions). This file closes that gap so the repo and production agree.
--
-- What it does. For each of the two keys it reads the catalog (pg_constraint):
--   * the key is there, points at public.matches(id) and already cascades:
--     it does NOTHING. This is the production path. It only reads the catalog:
--     no lock is taken and nothing is written.
--   * the key is there with another delete rule: ONE statement drops it and adds
--     it back with ON DELETE CASCADE (atomic, so no moment without the key).
--   * the key is missing and the name is free: it adds it with ON DELETE CASCADE.
--   * the name exists but is a different kind of constraint or points somewhere
--     else: it prints a NOTICE and skips that table. It never raises an error.
-- No data is changed. No COMMENT is added. Scoring, standings and stats are not
-- touched.
--
-- Production effect: NONE. Applying this file there is OPTIONAL. Production already
-- cascades, so it changes nothing. A merged migration does not reach production by
-- itself. To apply it by hand, see docs/OPERATIONS.md section 6.
--
-- Idempotent: a second run finds both keys on 'c' (cascade) and does nothing.
--
-- Revert: none is needed. Putting NO ACTION back would bring the 23503 failures
-- back. To do it anyway, run for each table (match_comments, match_reactions):
--   ALTER TABLE public.<table>
--     DROP CONSTRAINT <table>_match_id_fkey,
--     ADD CONSTRAINT <table>_match_id_fkey
--       FOREIGN KEY (match_id) REFERENCES public.matches(id);

DO $$
DECLARE
  v_pair record;
  v_rel regclass;
  v_attnum smallint;
  v_con record;
BEGIN
  FOR v_pair IN
    SELECT * FROM (VALUES
      ('match_comments', 'match_comments_match_id_fkey'),
      ('match_reactions', 'match_reactions_match_id_fkey')
    ) AS p(table_name, con_name)
  LOOP
    v_rel := to_regclass(format('public.%I', v_pair.table_name));
    IF v_rel IS NULL THEN
      RAISE NOTICE 'catch-up skipped: table public.% does not exist', v_pair.table_name;
      CONTINUE;
    END IF;

    SELECT a.attnum INTO v_attnum
    FROM pg_attribute a
    WHERE a.attrelid = v_rel
      AND a.attname = 'match_id'
      AND NOT a.attisdropped;

    SELECT con.contype,
           con.confdeltype,
           con.confrelid = 'public.matches'::regclass AS refs_matches,
           COALESCE(con.conkey = ARRAY[v_attnum], false) AS on_match_id
    INTO v_con
    FROM pg_constraint con
    WHERE con.conrelid = v_rel
      AND con.conname = v_pair.con_name;

    IF NOT FOUND THEN
      -- Missing and the name is free: add it.
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE',
        v_pair.table_name, v_pair.con_name
      );
    ELSIF v_con.contype <> 'f' OR NOT v_con.refs_matches OR NOT v_con.on_match_id THEN
      -- The name is taken by something else. Leave it alone.
      RAISE NOTICE 'catch-up skipped: % on public.% is not a match_id key to public.matches', v_pair.con_name, v_pair.table_name;
    ELSIF v_con.confdeltype = 'c' THEN
      -- Already cascades (production): do nothing.
      NULL;
    ELSE
      -- Another delete rule: swap in one atomic statement.
      EXECUTE format(
        'ALTER TABLE public.%I DROP CONSTRAINT %I, ADD CONSTRAINT %I FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE',
        v_pair.table_name, v_pair.con_name, v_pair.con_name
      );
    END IF;
  END LOOP;
END $$;

RESET lock_timeout;
