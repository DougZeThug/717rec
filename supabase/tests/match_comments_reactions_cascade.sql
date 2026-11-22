\set ON_ERROR_STOP on

-- Deleting a match must take its comments and reactions with it
-- (20261122120000_match_comments_reactions_cascade_catchup.sql).
--
-- The baseline added match_comments.match_id and match_reactions.match_id with no
-- delete rule (NO ACTION), while production already cascades. Without the cascade
-- a match with a reaction could not be deleted (23503), from the admin Scores bin
-- or from season archiving. The catch-up migration brings the repo in line.
--
-- Cases:
--   1 both keys carry ON DELETE CASCADE ('c')
--   2 the admin Scores bin (delete_match_with_stats_reversal) deletes a match that
--     holds one comment and one reaction; both rows go
--   3 archive_season on an inactive season with a completed match that holds one
--     comment and one reaction: the season is archived, the match is in
--     matches_archive, the comment and reaction are gone
--   4 partial_archive_season does the same
--   5 the migration is idempotent: with one key forced back to NO ACTION it swaps
--     it to 'c', and a second run leaves it on 'c'
--
-- Case 5 pastes the migration's DO block (outer tag $test$, inner string tag
-- $mig$). Keep the pasted block in step with the migration file.

BEGIN;

DO $test$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-0000000cf001';
  v_season_id uuid := '00000000-0000-0000-0000-0000000cf011';
  v_stale_season_id uuid := '00000000-0000-0000-0000-0000000cf012';
  v_partial_season_id uuid := '00000000-0000-0000-0000-0000000cf013';
  v_division_id uuid := '00000000-0000-0000-0000-0000000cf021';
  v_team1_id uuid := '00000000-0000-0000-0000-0000000cf031';
  v_team2_id uuid := '00000000-0000-0000-0000-0000000cf032';
  v_del_id uuid := '00000000-0000-0000-0000-0000000cf041';
  v_arch_id uuid := '00000000-0000-0000-0000-0000000cf042';
  v_part_id uuid := '00000000-0000-0000-0000-0000000cf043';
  v_rule "char";
  v_name text;
  v_left integer;
  v_migration text;
BEGIN
  -- Fixture reset (children first, so a re-run on a dirty database works).
  DELETE FROM public.match_comments WHERE match_id IN (v_del_id, v_arch_id, v_part_id);
  DELETE FROM public.match_reactions WHERE match_id IN (v_del_id, v_arch_id, v_part_id);
  DELETE FROM public.matches_archive WHERE season_id IN (v_season_id, v_stale_season_id, v_partial_season_id);
  DELETE FROM public.matches WHERE id IN (v_del_id, v_arch_id, v_part_id);
  DELETE FROM public.team_details_archive WHERE season_id IN (v_season_id, v_stale_season_id, v_partial_season_id);
  DELETE FROM public.team_season_stats WHERE season_id IN (v_season_id, v_stale_season_id, v_partial_season_id);
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id IN (v_season_id, v_stale_season_id, v_partial_season_id);
  DELETE FROM public.profiles WHERE id = v_admin_id;
  DELETE FROM auth.users WHERE id = v_admin_id;

  -- match_comments.user_id and match_reactions.user_id key to auth.users.
  INSERT INTO auth.users (id, email) VALUES (v_admin_id, 'cascade-chat-admin@example.test');

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin)
  VALUES (v_admin_id, 'cascade_chat_admin', 'Cascade Chat Admin', true)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  -- One inactive season for the admin delete, and two older inactive seasons for
  -- the two archive functions.
  INSERT INTO public.seasons (id, name, start_date, end_date, is_active, is_archived) VALUES
    (v_season_id, 'Cascade Chat Season', '2026-01-01', NULL, false, false),
    (v_stale_season_id, 'Cascade Chat Archive Season', '2024-01-01', '2024-06-30', false, false),
    (v_partial_season_id, 'Cascade Chat Partial Season', '2025-01-01', '2025-06-30', false, false);
  INSERT INTO public.divisions (id, name, display_division)
  VALUES (v_division_id, 'Cascade Chat Division', 'Cascade Chat Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Cascade Chat Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Cascade Chat Team 2', v_division_id, 0, 0, 0, 0);

  -- ---------------------------------------------------------------------
  -- Case 1: both keys carry ON DELETE CASCADE ('c').
  -- ---------------------------------------------------------------------
  FOR v_name IN SELECT unnest(ARRAY['match_comments', 'match_reactions']) LOOP
    SELECT con.confdeltype INTO v_rule
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = v_name
      AND con.conname = v_name || '_match_id_fkey';

    IF v_rule IS NULL THEN
      RAISE EXCEPTION '%_match_id_fkey is missing', v_name;
    END IF;
    IF v_rule <> 'c' THEN
      RAISE EXCEPTION '%_match_id_fkey delete rule is %, expected c (cascade)', v_name, v_rule;
    END IF;
  END LOOP;

  -- ---------------------------------------------------------------------
  -- Case 2: the admin Scores bin deletes a match that has a comment and a
  -- reaction. Claims first: trg_enforce_match_comments_identity needs a signed-in
  -- person whose id equals user_id.
  -- ---------------------------------------------------------------------
  PERFORM auth.set_test_claims(v_admin_id);

  INSERT INTO public.matches (id, team1_id, team2_id, winner_id, loser_id, season_id,
                              round_number, iscompleted, team1_game_wins, team2_game_wins)
  VALUES (v_del_id, v_team1_id, v_team2_id, v_team1_id, v_team2_id, v_season_id,
          1, true, 2, 1);
  INSERT INTO public.match_comments (match_id, user_id, username, content)
  VALUES (v_del_id, v_admin_id, 'cascade_chat_admin', 'good game');
  INSERT INTO public.match_reactions (match_id, user_id, emoji)
  VALUES (v_del_id, v_admin_id, 'like');

  PERFORM public.delete_match_with_stats_reversal(v_del_id);

  IF EXISTS (SELECT 1 FROM public.matches WHERE id = v_del_id) THEN
    RAISE EXCEPTION 'match survived the admin delete';
  END IF;
  SELECT COUNT(*) INTO v_left FROM public.match_comments WHERE match_id = v_del_id;
  IF v_left <> 0 THEN RAISE EXCEPTION 'match_comments survived the match delete, got % rows', v_left; END IF;
  SELECT COUNT(*) INTO v_left FROM public.match_reactions WHERE match_id = v_del_id;
  IF v_left <> 0 THEN RAISE EXCEPTION 'match_reactions survived the match delete, got % rows', v_left; END IF;

  -- ---------------------------------------------------------------------
  -- Case 3: archive_season on an inactive season whose completed match has a
  -- comment and a reaction.
  -- ---------------------------------------------------------------------
  INSERT INTO public.matches (id, team1_id, team2_id, winner_id, loser_id, season_id,
                              round_number, iscompleted, team1_game_wins, team2_game_wins)
  VALUES (v_arch_id, v_team1_id, v_team2_id, v_team1_id, v_team2_id, v_stale_season_id,
          1, true, 2, 0);
  INSERT INTO public.match_comments (match_id, user_id, username, content)
  VALUES (v_arch_id, v_admin_id, 'cascade_chat_admin', 'archived comment');
  INSERT INTO public.match_reactions (match_id, user_id, emoji)
  VALUES (v_arch_id, v_admin_id, 'like');

  PERFORM public.archive_season(v_stale_season_id);

  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE id = v_stale_season_id AND is_archived = true) THEN
    RAISE EXCEPTION 'archive_season did not archive the season';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matches_archive WHERE id = v_arch_id) THEN
    RAISE EXCEPTION 'the match was not copied into matches_archive by archive_season';
  END IF;
  IF EXISTS (SELECT 1 FROM public.matches WHERE id = v_arch_id) THEN
    RAISE EXCEPTION 'archive_season left the match in matches';
  END IF;
  SELECT COUNT(*) INTO v_left FROM public.match_comments WHERE match_id = v_arch_id;
  IF v_left <> 0 THEN RAISE EXCEPTION 'match_comments survived archive_season, got % rows', v_left; END IF;
  SELECT COUNT(*) INTO v_left FROM public.match_reactions WHERE match_id = v_arch_id;
  IF v_left <> 0 THEN RAISE EXCEPTION 'match_reactions survived archive_season, got % rows', v_left; END IF;

  -- ---------------------------------------------------------------------
  -- Case 4: partial_archive_season does the same.
  -- ---------------------------------------------------------------------
  INSERT INTO public.matches (id, team1_id, team2_id, winner_id, loser_id, season_id,
                              round_number, iscompleted, team1_game_wins, team2_game_wins)
  VALUES (v_part_id, v_team1_id, v_team2_id, v_team1_id, v_team2_id, v_partial_season_id,
          1, true, 2, 1);
  INSERT INTO public.match_comments (match_id, user_id, username, content)
  VALUES (v_part_id, v_admin_id, 'cascade_chat_admin', 'partial comment');
  INSERT INTO public.match_reactions (match_id, user_id, emoji)
  VALUES (v_part_id, v_admin_id, 'like');

  PERFORM public.partial_archive_season(v_partial_season_id);

  IF NOT EXISTS (SELECT 1 FROM public.matches_archive WHERE id = v_part_id AND season_id = v_partial_season_id) THEN
    RAISE EXCEPTION 'partial_archive_season did not put the match into matches_archive';
  END IF;
  IF EXISTS (SELECT 1 FROM public.matches WHERE id = v_part_id) THEN
    RAISE EXCEPTION 'partial_archive_season left the match in matches';
  END IF;
  SELECT COUNT(*) INTO v_left FROM public.match_comments WHERE match_id = v_part_id;
  IF v_left <> 0 THEN RAISE EXCEPTION 'match_comments survived partial_archive_season, got % rows', v_left; END IF;
  SELECT COUNT(*) INTO v_left FROM public.match_reactions WHERE match_id = v_part_id;
  IF v_left <> 0 THEN RAISE EXCEPTION 'match_reactions survived partial_archive_season, got % rows', v_left; END IF;

  PERFORM auth.set_test_claims(NULL);

  -- ---------------------------------------------------------------------
  -- Case 5: the migration is idempotent. Force match_reactions back to NO ACTION
  -- (as the baseline has it), run the migration's DO block, expect 'c', run it
  -- again, expect 'c'. The other key stays 'c' throughout.
  -- ---------------------------------------------------------------------
  ALTER TABLE public.match_reactions
    DROP CONSTRAINT match_reactions_match_id_fkey,
    ADD CONSTRAINT match_reactions_match_id_fkey
      FOREIGN KEY (match_id) REFERENCES public.matches(id);

  SELECT con.confdeltype INTO v_rule FROM pg_constraint con
  WHERE con.conrelid = 'public.match_reactions'::regclass AND con.conname = 'match_reactions_match_id_fkey';
  IF v_rule IS DISTINCT FROM 'a' THEN
    RAISE EXCEPTION 'fixture error: match_reactions_match_id_fkey should be NO ACTION (a), got %', v_rule;
  END IF;

  -- A copy of the DO block in 20261122120000_match_comments_reactions_cascade_catchup.sql.
  v_migration := $mig$
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
$mig$;

  FOR i IN 1..2 LOOP
    EXECUTE v_migration;

    FOR v_name IN SELECT unnest(ARRAY['match_comments', 'match_reactions']) LOOP
      SELECT con.confdeltype INTO v_rule FROM pg_constraint con
      WHERE con.conrelid = ('public.' || v_name)::regclass AND con.conname = v_name || '_match_id_fkey';
      IF v_rule IS DISTINCT FROM 'c' THEN
        RAISE EXCEPTION 'after migration run %, %_match_id_fkey delete rule is %, expected c', i, v_name, v_rule;
      END IF;
      -- Exactly one such key on each table: no duplicate was added.
      SELECT COUNT(*) INTO v_left FROM pg_constraint con
      WHERE con.conrelid = ('public.' || v_name)::regclass
        AND con.contype = 'f'
        AND con.confrelid = 'public.matches'::regclass;
      IF v_left <> 1 THEN
        RAISE EXCEPTION 'after migration run %, % has % keys to matches, expected 1', i, v_name, v_left;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'match_comments_reactions_cascade smoke test passed';
END $test$;

ROLLBACK;
