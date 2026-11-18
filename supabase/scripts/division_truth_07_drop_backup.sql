-- Division truth, script 07: RETIRE THE BACKUP TABLE (hand-apply, last step).
--
-- NOT A MIGRATION. Paste the WHOLE file into the Supabase SQL Editor and run it
-- once, after Doug has accepted the new Power Scores. Order of the scripts and the
-- reason for all of this: docs/OPERATIONS.md section 6g ("How Doug retires the
-- backup").
--
-- WHAT IT DOES. It drops ONE table: public.team_season_stats_pre_division_truth
-- (the backup that script 01 made). No CASCADE. Nothing else is touched: not
-- team_season_stats, not the override rows, not the view, not any other table.
--
-- IRREVERSIBLE. That table is the ONLY copy of the OLD stored numbers (the ones the
-- site showed before the recompute of 2026-11-18). After the drop:
--   * undo path 1 of script 05 ("put the saved numbers back") is gone. Path 1 then
--     STOPs, writing nothing.
--   * undo path 2 of script 05 still works. It deletes the override rows, puts the old
--     view back and recomputes the six seasons. That gives the numbers the OLD RULES
--     give, NOT the old stored numbers.
--   * script 03 (the preview) STOPs, because it reads the backup. It was a one-time step.
--   * script 06 still runs. Its checks L6b, L6c, L6d and L7 say INFO, "skipped".
-- BEFORE you run this: (1) run script 06 and check that L4 and L7 say PASS (L7 cannot
-- run after the drop); (2) in the Supabase dashboard open the table
-- team_season_stats_pre_division_truth and export it as CSV. Do this: the backup is the
-- only copy of the old stored numbers, and it is only about 185 rows.
--
-- THE GUARD. The script STOPS (nothing dropped) if any of these is true:
--   * the rated view is not the override-aware one (undo path 2 puts the OLD view back):
--     the score test below would then compare the stored numbers with the old rules and
--     pass for the wrong reason;
--   * a stored score of the six seasons still differs from what the rules give now
--     by more than rounding (the same test as check L4 of script 06): the recompute
--     is not finished, so the backup could still matter;
--   * a saved row has no live row any more (its team-season was deleted from
--     team_season_stats since the backup): the backup is then the only record of that
--     team-season (wins, losses, champion, rank). Check L7 of script 06 reads the same
--     thing as "rows missing", and it cannot run after the drop;
--   * a saved row has a live row, but its record differs (wins, losses, game wins, game
--     losses, division name, playoff rank, champion or runner-up): the same test as
--     "changed" in check L7 of script 06. Only power_score, sos and career_power_score
--     may differ (that is the accepted change);
--   * the override table has 0 rows: the new numbers have nothing under them, so the
--     backup would be the only way back;
--   * an override row is for a season OUTSIDE the six: undo path 2 of script 05 refuses
--     to run while such a row exists, so after the drop there would be no way back at all.
-- THE LOCK. The script takes the Sandbox weight-save lock, then blocks writes to
-- team_season_stats (reads stay open) until it ends. Without it, a team-season could be
-- deleted after the guards looked and before the table was dropped, and its saved row
-- would be lost for good.
-- It does not ask you to type anything. The editor may ask you to confirm a
-- "destructive" statement (DROP TABLE). That is expected. It must name only
-- team_season_stats_pre_division_truth (or a temporary division_truth_ table). If it
-- names anything else, stop.
--
-- SAFE TO RE-RUN. If the table is already gone, the script says "already gone" and
-- changes nothing.
--
-- HOW TO READ THE RESULT (one table, at the bottom; the editor shows only the last
-- result). Want, on the live database of 2026-11-18:
--   * "six seasons: stored rows that differ from the rules NOW ..." = 0
--   * "saved rows with no live row" = 0
--   * "saved rows whose record differs from the live row" = 0
--   * "override rows" = 86 (more if rows were added by hand)
--   * "rows for seasons outside the six, in the override table" = 0
--   * "rated view has the override step" = yes
--   * "table exists now" = no
--   * verdict = OK: backup dropped
-- The line "saved rows that differ from the stored numbers now" is the accepted change
-- (the numbers moved at the recompute). It is information only, not a fault.

DROP TABLE IF EXISTS pg_temp.division_truth_drop;
CREATE TEMP TABLE division_truth_drop (ord int, what text, val text);

DO $drop$
DECLARE
  v_diff     bigint;
  v_lost     bigint;
  v_changed  bigint;
  v_override bigint := 0;
  v_outside  bigint := 0;
BEGIN
  -- The same lock as a Sandbox weight save and scripts 04 and 05: the checks below
  -- and the drop never run at the same moment as a save. It comes FIRST, before the
  -- "does the backup exist" test: a run that had to wait for another run then sees the
  -- state the other run left ("already gone") and not an error.
  PERFORM pg_advisory_xact_lock(hashtext('power_score_weights'));
  -- Writes to team_season_stats wait until this block ends (reads stay open). So no
  -- team-season can be deleted between the guards and the drop.
  LOCK TABLE public.team_season_stats IN SHARE MODE;

  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    INSERT INTO division_truth_drop VALUES
      (1, 'backup table', 'public.team_season_stats_pre_division_truth'),
      (99, 'verdict', 'already gone: there was nothing to drop, nothing was changed');
    RETURN;
  END IF;

  -- The view first. Undo path 2 of script 05 puts the OLD view back (no override step).
  -- The score test below reads that view, so with the old view it would compare the
  -- stored numbers with the old rules and pass for the wrong reason. Script 05 uses the
  -- same marker for its report line "the rated view has the override step".
  IF position('manual_override' IN pg_get_viewdef('public.v_power_score_team_matches_rated'::regclass, true)) = 0 THEN
    RAISE EXCEPTION 'STOP: the rated view is not the override-aware version (undo path 2 puts the old view back). Nothing was dropped.';
  END IF;

  -- Pre-check lines. They are read before anything is dropped.
  INSERT INTO division_truth_drop VALUES
    (1, 'backup table', 'public.team_season_stats_pre_division_truth'),
    (11, 'rated view has the override step', 'yes');

  INSERT INTO division_truth_drop
  SELECT 2, 'taken at (UTC)', to_char(min(b.backed_up_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI')
    FROM public.team_season_stats_pre_division_truth b;

  INSERT INTO division_truth_drop
  SELECT 3, 'rows saved', count(*)::text
    FROM public.team_season_stats_pre_division_truth;

  INSERT INTO division_truth_drop
  SELECT 4, 'saved rows in ' || COALESCE(se.name, six.season_id::text), count(b.team_id)::text
    FROM (VALUES
      ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a'::uuid),  -- Spring 2025
      ('e537c594-3ba9-4d79-ba63-f6ed90c89e30'::uuid),  -- Summer 1 2025
      ('d50bb12e-99be-4170-802a-695a402373ce'::uuid),  -- Summer 2 2025
      ('34cd19e2-abf5-43b8-a16f-6d73a0e998ac'::uuid),  -- Fall 2025
      ('4b90a1d8-b90a-4e47-8e8c-b89a7b54e106'::uuid),  -- Winter 1 2026
      ('9cd55eb8-672c-4a43-a9df-3552a7759cca'::uuid)   -- Winter 2 2026
    ) six(season_id)
    LEFT JOIN public.seasons se ON se.id = six.season_id
    LEFT JOIN public.team_season_stats_pre_division_truth b ON b.season_id = six.season_id
   GROUP BY six.season_id, se.name;

  -- The same test as check L4 in script 06 (a gap of 0.0006 or less is rounding).
  SELECT count(*) INTO v_diff
    FROM public.team_season_stats s
    JOIN public.v_team_season_agg a ON a.season_id = s.season_id AND a.team_id = s.team_id
   WHERE s.season_id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                         'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                         '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca')
     AND (abs(COALESCE(s.power_score, -1) - COALESCE(a.power_score, -1)) > 0.0006
       OR abs(COALESCE(s.sos, -1) - COALESCE(a.sos, -1)) > 0.0006
       OR s.career_power_score IS DISTINCT FROM a.career_power_score);
  INSERT INTO division_truth_drop VALUES
    (5, 'six seasons: stored rows that differ from the rules NOW by more than rounding (must be 0)', v_diff::text);

  -- The accepted change: saved numbers against the stored numbers now. Exact, as in
  -- script 05: both sides are stored values.
  INSERT INTO division_truth_drop
  SELECT 6, 'six seasons: saved rows that differ from the stored numbers now (the accepted change)', count(*)::text
    FROM public.team_season_stats s
    JOIN public.team_season_stats_pre_division_truth b ON b.season_id = s.season_id AND b.team_id = s.team_id
   WHERE s.power_score IS DISTINCT FROM b.power_score
      OR s.career_power_score IS DISTINCT FROM b.career_power_score
      OR s.sos IS DISTINCT FROM b.sos;

  -- Saved rows whose team-season is gone from team_season_stats (the same key and the
  -- same definition as "lost" in check L7 of script 06), and saved rows that still have
  -- a live row but a different record (the same columns as "changed" in L7). Power
  -- score, sos and career score are NOT in the record: they moved on purpose.
  SELECT count(*) FILTER (WHERE s.team_id IS NULL),
         count(*) FILTER (WHERE s.team_id IS NOT NULL
                            AND (s.match_wins, s.match_losses, s.game_wins, s.game_losses, s.division_name,
                                 s.playoff_rank, s.champion, s.runner_up)
                                IS DISTINCT FROM
                                (b.match_wins, b.match_losses, b.game_wins, b.game_losses, b.division_name,
                                 b.playoff_rank, b.champion, b.runner_up))
    INTO v_lost, v_changed
    FROM public.team_season_stats_pre_division_truth b
    LEFT JOIN public.team_season_stats s ON s.season_id = b.season_id AND s.team_id = b.team_id;
  INSERT INTO division_truth_drop VALUES
    (8, 'saved rows with no live row (must be 0)', v_lost::text),
    (9, 'saved rows whose record differs from the live row (must be 0)', v_changed::text);

  -- EXECUTE, so a database with no override table gives 0 (and stops below).
  IF to_regclass('public.power_score_division_override') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.power_score_division_override' INTO v_override;
    -- Undo path 2 of script 05 refuses to run while such a row exists.
    EXECUTE 'SELECT count(*) FROM public.power_score_division_override WHERE season_id <> ALL ($1)'
      INTO v_outside
      USING ARRAY['d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                  'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                  '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca']::uuid[];
  END IF;
  INSERT INTO division_truth_drop VALUES
    (7, 'override rows (86 on 2026-11-18)', v_override::text),
    (10, 'rows for seasons outside the six, in the override table (must be 0)', v_outside::text);

  -- THE GUARD. Nothing is dropped if it fires.
  IF v_diff > 0 THEN
    RAISE EXCEPTION 'STOP: % stored score(s) in the six seasons still differ from the rules now by more than rounding. The backup is still the only copy of the old numbers and the recompute is not finished. Nothing was dropped.', v_diff;
  END IF;
  IF v_lost > 0 THEN
    RAISE EXCEPTION 'STOP: % saved row(s) have no live row in team_season_stats any more. The backup is the only record of those team-seasons (wins, losses, champion, rank). Nothing was dropped.', v_lost;
  END IF;
  IF v_changed > 0 THEN
    RAISE EXCEPTION 'STOP: % saved row(s) have a different record in team_season_stats now (wins, losses, games, division, champion, runner-up or playoff rank). The backup is the only copy of the old record. Nothing was dropped.', v_changed;
  END IF;
  IF v_override = 0 THEN
    RAISE EXCEPTION 'STOP: the override table has 0 rows. The new numbers have nothing under them, so the backup is the only way back. Nothing was dropped.';
  END IF;
  IF v_outside > 0 THEN
    RAISE EXCEPTION 'STOP: % override row(s) are for seasons outside the six. Undo path 2 would refuse to run. Resolve them first (see OPERATIONS 6g). Nothing was dropped.', v_outside;
  END IF;

  -- No CASCADE: if anything depends on the table, this fails and drops nothing.
  DROP TABLE IF EXISTS public.team_season_stats_pre_division_truth;
  INSERT INTO division_truth_drop VALUES (99, 'verdict', 'OK: backup dropped');
END $drop$;

-- ONE result: what was checked, and whether the table is gone now.
SELECT r.what, r.val
FROM (
  SELECT ord, what, val FROM division_truth_drop
  UNION ALL
  SELECT 90, 'table exists now',
         CASE WHEN to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN 'no' ELSE 'yes' END
) r
ORDER BY r.ord, r.what;
