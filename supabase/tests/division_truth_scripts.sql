\set ON_ERROR_STOP on

-- Test for the hand-apply scripts in supabase/scripts/division_truth_*.sql
-- (the division override fix, migration 20261117130000).
--
-- It runs the REAL script files on a small league fixture, inside one transaction
-- that is rolled back. It must run from the repo root (CI does; \i and cat use
-- paths such as supabase/scripts/...). What it proves:
--
--   1. The dry run (02a) WRITES NOTHING, and the rows it lists as INSERT are exactly
--      the rows script 02 then writes (set equality on season, team, division).
--   2. The dry run says what it would skip: a stored name that is not in the map, a
--      team-season with no stored row, and a team-season already answered by a
--      weekly snapshot (not a candidate at all).
--   3. Doug's exception ("Here for Fireball" = Recreational High) and the 3 explicit
--      rows for the 7 newer games are in the list.
--   4. The reason text on every row holds no person's name and starts with
--      "League owner, 2026-11-17" (the table can be read through the public API).
--   5. A second run of 02 writes 0 rows, and the dry run then shows no INSERT row.
--   6. Scripts 03 (preview) and 06 (checks) run without error.
--   7. Script 04 (recompute) changes the stored scores of the season it is given, a
--      second run moves no team, and no other column of team_season_stats moves.
--   8. Script 05 path 2 copies the override rows to power_score_division_override_pre_undo
--      BEFORE it deletes them, and a second run adds nothing; path 1 puts the saved
--      scores back.
--   9. A missing dropped-out team, or a missing season, shows up in the dry run as a
--      "CHECK: script 02 would STOP" row, and script 02 really does stop.
--  10. Script 00 (precheck): a season with playoffs_active or is_active on is a CHECK.
--  11. Script 01 keeps the FIRST backup, and its verdict compares the team-season
--      keys and the saved scores: OK, NOTE (scores changed), CHECK (keys differ).
--  12. Script 05 path 2 STOPS, writing nothing, when an override row belongs to a
--      season outside the six; and it still reports after the backup table is gone.
--  14. Script 07 (retire the backup) STOPs, and drops nothing, when a stored six-season
--      score is off by more than rounding (power, sos or career: one case each), when a saved
--      row has no live row any more (its team-season was deleted; the test deletes one of two
--      team-seasons of the same team), when a saved row's record differs from its live row
--      (wins, or a playoff rank that was empty), when the old rated view is installed (it
--      stops before any score is compared), when an override row is for a season outside the
--      six, or when the override table is empty; a gap of 0.0004 is rounding and passes, and
--      so does the accepted change (power, sos and career far from the saved ones, records
--      the same). It takes the weight-save lock, then a share lock on team_season_stats,
--      before it looks for the backup. The real run drops ONLY the backup
--      (team_season_stats, the override rows and the view are the same),
--      prints the pre-check lines and the verdict, and a second run says "already
--      gone". It fails, dropping nothing, when a view depends on the backup (no CASCADE).
--      After the drop: script 06 runs (L6b, L6c, L6d, L7 say "skipped", L6a still
--      checks every team-season), 03 and 02 STOP with a message that names both reasons
--      (first install: run script 01; retired: do not recreate it), the dry
--      run (02a) lists one CHECK row for it, undo path 1 STOPs and path 2 still works
--      and, with the override-aware view and the overrides back in the stored numbers,
--      it puts the old-rule scores back (including a team the overrides had moved).
--      A backup table that exists with 0 rows makes script 06 say "backup table is empty"
--      (not "backup retired") in L6b, L6c, L6d and L7.
--  13. The live columns keep 3 decimals (power_score numeric(8,3), sos numeric(6,3)):
--      the recompute's last line, check L4 and undo path 2's report line that compares
--      with the rules ignore a gap of 0.0006 or less in power_score and sos. A bigger
--      gap still counts, and so does any gap in career_power_score (plain numeric on
--      live). L4 is INFO before the recompute (N still differ) and PASS after. It
--      FAILS for a closed season outside the six (power, sos or career off) and for an
--      ARCHIVED season even when it is marked active, and when NO season is live at
--      all and a not archived season has a gap. It counts the LIVE season (the active
--      one, else the one with playoffs active, and NOT archived) on its own line.
--
-- The fixture gives the six map divisions their own odd weights, so nothing depends
-- on the live weights.

BEGIN;
-- The scripts run big read-only queries. With just-in-time compilation (on by
-- default in Postgres 12 and later) this test takes about 40 seconds instead of
-- under one. Nothing here needs it. SET LOCAL ends with the transaction.
SET LOCAL jit = off;

DO $$
DECLARE
  v_rec     record;
  v_hidden  uuid;
  v_comp    uuid;
  v_rechigh uuid;
  v_int     uuid;
  v_subj    uuid := '00000000-0000-0000-0000-0000000dd001';
  v_o_comp  uuid := '00000000-0000-0000-0000-0000000dd011';
  v_o_int1  uuid := '00000000-0000-0000-0000-0000000dd012';
  v_o_int2  uuid := '00000000-0000-0000-0000-0000000dd013';
  v_o_rec   uuid := '00000000-0000-0000-0000-0000000dd014';
  v_o_int   uuid := '00000000-0000-0000-0000-0000000dd015';
  v_o_solid uuid := '00000000-0000-0000-0000-0000000dd016';
  v_o_unmap uuid := '00000000-0000-0000-0000-0000000dd017';
  v_o_norow uuid := '00000000-0000-0000-0000-0000000dd018';
  v_fire    uuid;   -- a CI database already holds a team with this name: use it
  v_syc     uuid := '5db6b718-81af-4bd0-a0cd-0a0eae4330ad';  -- Shut Your Cornhole
  v_rrr     uuid := 'e91cb2d1-ef48-48e7-b15f-735c941f3679';  -- Red Roof Rockets
  v_tom     uuid := 'accd6e20-f761-4769-8cdc-6c9495cc231c';  -- The Tomato Saucers
  v_spring  uuid := 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a';
  v_summer1 uuid := 'e537c594-3ba9-4d79-ba63-f6ed90c89e30';
  v_summer2 uuid := 'd50bb12e-99be-4170-802a-695a402373ce';
  v_fall    uuid := '34cd19e2-abf5-43b8-a16f-6d73a0e998ac';
  v_winter1 uuid := '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';
  v_winter2 uuid := '9cd55eb8-672c-4a43-a9df-3552a7759cca';
BEGIN
  IF EXISTS (SELECT 1 FROM public.power_score_division_override) THEN
    RAISE EXCEPTION 'this test needs an EMPTY power_score_division_override: run it on a throwaway database';
  END IF;

  -- The six map divisions: one rateable division per name, with an odd weight of its
  -- own. A CI database seeds some of them with no weight, and has no "Recreational".
  FOR v_rec IN
    SELECT * FROM (VALUES ('Competitive', 'Competitive', 0.96), ('Recreational', 'Recreational', 0.31),
                          ('Intermediate High', 'Intermediate', 0.81), ('Intermediate Low', 'Intermediate', 0.61),
                          ('Intermediate', 'Intermediate', 0.71), ('Recreational High', 'Recreational', 0.51)
    ) v(name, display, weight)
  LOOP
    IF EXISTS (SELECT 1 FROM public.divisions WHERE lower(btrim(name)) = lower(v_rec.name)) THEN
      UPDATE public.divisions SET division_weight = v_rec.weight WHERE lower(btrim(name)) = lower(v_rec.name);
    ELSE
      INSERT INTO public.divisions (name, display_division, division_weight)
      VALUES (v_rec.name, v_rec.display, v_rec.weight);
    END IF;
  END LOOP;
  SELECT id INTO v_hidden FROM public.divisions WHERE name = 'Hidden' LIMIT 1;
  IF v_hidden IS NULL THEN
    INSERT INTO public.divisions (name, display_division, division_weight)
    VALUES ('Hidden', 'Hidden', -1.0) RETURNING id INTO v_hidden;
  END IF;
  SELECT id INTO v_fire    FROM public.teams WHERE lower(btrim(name)) = 'here for fireball';
  IF v_fire IS NULL THEN
    v_fire := '00000000-0000-0000-0000-0000000dd019';
  END IF;
  SELECT id INTO v_comp    FROM public.divisions WHERE lower(btrim(name)) = 'competitive';
  SELECT id INTO v_rechigh FROM public.divisions WHERE lower(btrim(name)) = 'recreational high';
  SELECT id INTO v_int     FROM public.divisions WHERE lower(btrim(name)) = 'intermediate';

  -- The six seasons, closed. Three of the ids already exist in a CI database.
  INSERT INTO public.seasons (id, name, start_date, is_active, is_archived) VALUES
    (v_spring,  'DT Spring 2025',   '2025-03-03', false, true),
    (v_summer1, 'DT Summer 1 2025', '2025-06-02', false, true),
    (v_summer2, 'DT Summer 2 2025', '2025-07-21', false, true),
    (v_fall,    'DT Fall 2025',     '2025-09-01', false, true),
    (v_winter1, 'DT Winter 1 2026', '2026-01-05', false, true),
    (v_winter2, 'DT Winter 2 2026', '2026-02-23', false, true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, start_date = EXCLUDED.start_date;

  -- The teams. The three dropped-out teams exist (a CI database holds two of them as
  -- placeholders): they stay as they are, with no division, so their games are unrated.
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_subj,    'DT Subject',          v_comp, 0, 0, 0, 0),
    (v_o_comp,  'DT Opp Competitive',  (SELECT id FROM public.divisions WHERE lower(btrim(name)) = 'recreational'), 0, 0, 0, 0),
    (v_o_int1,  'DT Opp Int1',         v_hidden, 0, 0, 0, 0),
    (v_o_int2,  'DT Opp Int2',         v_comp, 0, 0, 0, 0),
    (v_o_rec,   'DT Opp Recreational', v_comp, 0, 0, 0, 0),
    (v_o_int,   'DT Opp Intermediate', v_hidden, 0, 0, 0, 0),
    (v_o_solid, 'DT Opp Solid',        v_hidden, 0, 0, 0, 0),
    (v_o_unmap, 'DT Opp Unmapped',     v_hidden, 0, 0, 0, 0),
    (v_o_norow, 'DT Opp NoRow',        v_hidden, 0, 0, 0, 0),
    (v_fire,    'Here for Fireball',   v_rechigh, 0, 0, 0, 0),
    (v_syc,     'Shut Your Cornhole',  NULL, 0, 0, 0, 0),
    (v_rrr,     'Red Roof Rockets',    NULL, 0, 0, 0, 0),
    (v_tom,     'The Tomato Saucers',  NULL, 0, 0, 0, 0)
  ON CONFLICT (id) DO NOTHING;
  -- (A CI database holds two of the three as placeholders with another name.)
  UPDATE public.teams SET name = 'Shut Your Cornhole' WHERE id = v_syc;
  UPDATE public.teams SET name = 'Red Roof Rockets'   WHERE id = v_rrr;
  UPDATE public.teams SET name = 'The Tomato Saucers' WHERE id = v_tom;

  -- One game against each opponent (the subject wins 2-0). Old seasons live in the
  -- archive table once they are closed.
  INSERT INTO public.matches_archive
    (id, team1_id, team2_id, season_id, team1_game_wins, team2_game_wins, winner_id, loser_id, date, iscompleted, round_number)
  SELECT gen_random_uuid(), v_subj, g.opp, g.season, 2, 0, v_subj, g.opp, g.played, true, g.n
  FROM (VALUES
    (v_o_comp,  v_spring,  '2025-03-10 18:00:00+00'::timestamptz, 1),
    (v_o_int1,  v_spring,  '2025-03-17 18:00:00+00', 2),
    (v_o_int2,  v_spring,  '2025-03-24 18:00:00+00', 3),
    (v_o_solid, v_spring,  '2025-03-31 18:00:00+00', 4),
    (v_o_unmap, v_spring,  '2025-04-07 18:00:00+00', 5),
    (v_o_norow, v_spring,  '2025-04-14 18:00:00+00', 6),
    (v_fire,    v_summer1, '2025-06-10 18:00:00+00', 7),
    (v_o_rec,   v_summer2, '2025-08-04 18:00:00+00', 8),
    (v_o_int,   v_summer2, '2025-08-11 18:00:00+00', 9),
    (v_fire,    v_summer2, '2025-08-18 18:00:00+00', 10),
    (v_syc,     v_fall,    '2025-10-06 18:00:00+00', 11),
    (v_rrr,     v_winter1, '2026-01-12 18:00:00+00', 12),
    (v_tom,     v_winter2, '2026-03-02 18:00:00+00', 13)
  ) g(opp, season, played, n);

  -- Solid: a weekly snapshot says Competitive, from before the game. Not a candidate.
  INSERT INTO public.power_score_snapshots (team_id, season_id, week_number, snapshot_date, division_id)
  VALUES (v_o_solid, v_spring, 1, '2025-03-01', v_comp);

  -- The names each team had for the season (the "stored label").
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses, division_name)
  VALUES
    (v_spring,  v_o_comp,  0, 1, 0, 2, 'Competitive'),
    (v_spring,  v_o_int1,  0, 1, 0, 2, 'Intermediate 1'),
    (v_spring,  v_o_int2,  0, 1, 0, 2, '  intermediate 2 '),
    (v_spring,  v_o_solid, 0, 1, 0, 2, 'Competitive'),
    (v_spring,  v_o_unmap, 0, 1, 0, 2, 'Intermediate 3'),
    (v_summer1, v_fire,    0, 1, 0, 2, 'Recreational'),
    (v_summer2, v_o_rec,   0, 1, 0, 2, 'Recreational'),
    (v_summer2, v_o_int,   0, 1, 0, 2, 'Intermediate'),
    (v_summer2, v_fire,    0, 1, 0, 2, 'Recreational'),
    (v_fall,    v_syc,     0, 1, 0, 2, 'Hidden'),
    (v_winter1, v_rrr,     0, 1, 0, 2, 'Hidden'),
    (v_winter2, v_tom,     0, 1, 0, 2, 'Hidden')
  ON CONFLICT (season_id, team_id) DO UPDATE SET division_name = EXCLUDED.division_name;
  -- (DT Opp NoRow has no stored row on purpose.)
END $$;

-- The scripts print result tables. Keep the test log quiet.
\o /dev/null
\i supabase/scripts/division_truth_01_backup.sql
\o

-- ---------------------------------------------------------------------------
-- 1a. Script 01 never overwrites the first backup. Its verdict compares the
--     team-season keys and the saved scores, not only the row counts.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE dt_bk_md5 AS
SELECT count(*) AS n, md5(string_agg(b::text, '|' ORDER BY b.season_id, b.team_id)) AS m
FROM public.team_season_stats_pre_division_truth b;
\set bk `sed -n '/^-- ONE result/,$p' supabase/scripts/division_truth_01_backup.sql`
CREATE TEMP TABLE dt_bk1 AS :bk
;

-- (a) nothing changed: OK.
-- (b) a stored score changed: NOTE (the first backup is kept).
UPDATE public.team_season_stats SET power_score = 0.123
 WHERE season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a' AND team_id = '00000000-0000-0000-0000-0000000dd011';
\o /dev/null
\i supabase/scripts/division_truth_01_backup.sql
\o
CREATE TEMP TABLE dt_bk2 AS :bk
;
UPDATE public.team_season_stats SET power_score = NULL
 WHERE season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a' AND team_id = '00000000-0000-0000-0000-0000000dd011';

-- (c) a live team-season is added: CHECK, 1 only in the live table.
INSERT INTO public.team_season_stats (season_id, team_id, match_wins, match_losses, game_wins, game_losses, division_name)
VALUES ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', '00000000-0000-0000-0000-0000000dd018', 0, 0, 0, 0, 'x');
\o /dev/null
\i supabase/scripts/division_truth_01_backup.sql
\o
CREATE TEMP TABLE dt_bk3 AS :bk
;
DELETE FROM public.team_season_stats
 WHERE season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a' AND team_id = '00000000-0000-0000-0000-0000000dd018';

-- (d) a live team-season is removed: CHECK, 1 only in the backup.
DELETE FROM public.team_season_stats
 WHERE season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a' AND team_id = '00000000-0000-0000-0000-0000000dd017';
\o /dev/null
\i supabase/scripts/division_truth_01_backup.sql
\o
CREATE TEMP TABLE dt_bk4 AS :bk
;
INSERT INTO public.team_season_stats (season_id, team_id, match_wins, match_losses, game_wins, game_losses, division_name)
VALUES ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', '00000000-0000-0000-0000-0000000dd017', 0, 1, 0, 2, 'Intermediate 3');

-- (e) everything back as it was: OK again.
\o /dev/null
\i supabase/scripts/division_truth_01_backup.sql
\o
CREATE TEMP TABLE dt_bk5 AS :bk
;

DO $$
DECLARE
  v1 text; v2 text; v3 text; v4 text; v5 text;
BEGIN
  SELECT value INTO STRICT v1 FROM dt_bk1 WHERE what = 'verdict';
  SELECT value INTO STRICT v2 FROM dt_bk2 WHERE what = 'verdict';
  SELECT value INTO STRICT v3 FROM dt_bk3 WHERE what = 'verdict';
  SELECT value INTO STRICT v4 FROM dt_bk4 WHERE what = 'verdict';
  SELECT value INTO STRICT v5 FROM dt_bk5 WHERE what = 'verdict';
  IF v1 IS DISTINCT FROM 'OK: saved = live. The backup is complete.' THEN
    RAISE EXCEPTION 'script 01, unchanged: expected OK, got %', v1;
  END IF;
  IF v2 NOT LIKE 'NOTE: stored scores changed since the backup (expected after a recompute). The first backup is kept and is the one to restore from.' THEN
    RAISE EXCEPTION 'script 01, a stored score changed: expected NOTE, got %', v2;
  END IF;
  IF v3 NOT LIKE 'CHECK: the team-seasons in the backup and in the live table are not the same (0 only in the backup, 1 only in the live table)%' THEN
    RAISE EXCEPTION 'script 01, a team-season added: expected CHECK (0 / 1), got %', v3;
  END IF;
  IF v4 NOT LIKE 'CHECK: the team-seasons in the backup and in the live table are not the same (1 only in the backup, 0 only in the live table)%' THEN
    RAISE EXCEPTION 'script 01, a team-season removed: expected CHECK (1 / 0), got %', v4;
  END IF;
  IF v5 IS DISTINCT FROM 'OK: saved = live. The backup is complete.' THEN
    RAISE EXCEPTION 'script 01, after the changes were undone: expected OK, got %', v5;
  END IF;
  -- The first backup was never overwritten, by any of the five runs.
  IF (SELECT m FROM dt_bk_md5) IS DISTINCT FROM
     (SELECT md5(string_agg(b::text, '|' ORDER BY b.season_id, b.team_id))
        FROM public.team_season_stats_pre_division_truth b)
     OR (SELECT n FROM dt_bk_md5) IS DISTINCT FROM (SELECT count(*) FROM public.team_season_stats_pre_division_truth) THEN
    RAISE EXCEPTION 'script 01 changed the first backup';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1b. Script 00 (precheck): a season that is_active or playoffs_active is a CHECK.
--     (current_standings_season_id() ignores is_archived.)
-- ---------------------------------------------------------------------------
\set pre `cat supabase/scripts/division_truth_00_precheck.sql`
CREATE TEMP TABLE dt_pre1 AS :pre
;
UPDATE public.seasons SET playoffs_active = true WHERE id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a';
CREATE TEMP TABLE dt_pre2 AS :pre
;
UPDATE public.seasons SET playoffs_active = false WHERE id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a';
UPDATE public.seasons SET is_active = true WHERE id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30';
CREATE TEMP TABLE dt_pre3 AS :pre
;
UPDATE public.seasons SET is_active = false WHERE id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30';

DO $$
DECLARE
  v_n bigint;
BEGIN
  -- Good state: the six season rows all PASS and show the two flags.
  SELECT count(*) INTO v_n FROM dt_pre1
   WHERE check_name LIKE 'U2 DT %' AND verdict = 'PASS'
     AND result LIKE 'is_archived=true is_active=false playoffs_active=false regular_games=0';
  IF v_n IS DISTINCT FROM 6 THEN
    RAISE EXCEPTION 'precheck, closed seasons: expected 6 PASS rows with both flags shown, found %', v_n;
  END IF;
  -- playoffs_active=true on one season: that row is CHECK, the other five still PASS.
  SELECT count(*) INTO v_n FROM dt_pre2
   WHERE check_name = 'U2 DT Spring 2025' AND verdict = 'CHECK' AND result LIKE '%playoffs_active=true%';
  IF v_n IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'precheck: playoffs_active=true should give CHECK, found % rows', v_n; END IF;
  SELECT count(*) INTO v_n FROM dt_pre2 WHERE check_name LIKE 'U2 DT %' AND verdict = 'PASS';
  IF v_n IS DISTINCT FROM 5 THEN RAISE EXCEPTION 'precheck: the other 5 seasons should still PASS, found %', v_n; END IF;
  -- is_active=true on one (archived) season: CHECK.
  SELECT count(*) INTO v_n FROM dt_pre3
   WHERE check_name = 'U2 DT Summer 1 2025' AND verdict = 'CHECK' AND result LIKE '%is_active=true%';
  IF v_n IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'precheck: is_active=true should give CHECK, found % rows', v_n; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1 and 2. The dry run writes nothing and says what script 02 would do.
-- ---------------------------------------------------------------------------
\set dry `cat supabase/scripts/division_truth_02a_dryrun.sql`
CREATE TEMP TABLE dt_dry AS :dry
;

DO $$
DECLARE
  v_n bigint;
  v_text text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.power_score_division_override) THEN
    RAISE EXCEPTION 'the dry run (02a) wrote a row';
  END IF;

  -- Doug's map, by the stored label (blank and case do not matter).
  SELECT count(*) INTO v_n FROM dt_dry
   WHERE action = 'INSERT' AND team = 'DT Opp Competitive' AND assigned_division ~* '^competitive$';
  IF v_n <> 1 THEN RAISE EXCEPTION 'DT Opp Competitive should be INSERT Competitive, found %', v_n; END IF;
  SELECT count(*) INTO v_n FROM dt_dry
   WHERE action = 'INSERT' AND team = 'DT Opp Int1' AND stored_label = 'Intermediate 1' AND assigned_division = 'Intermediate High';
  IF v_n <> 1 THEN RAISE EXCEPTION 'Intermediate 1 should map to Intermediate High, found %', v_n; END IF;
  SELECT count(*) INTO v_n FROM dt_dry
   WHERE action = 'INSERT' AND team = 'DT Opp Int2' AND stored_label = 'intermediate 2' AND assigned_division = 'Intermediate Low';
  IF v_n <> 1 THEN RAISE EXCEPTION 'intermediate 2 (blanks, lower case) should map to Intermediate Low, found %', v_n; END IF;
  SELECT count(*) INTO v_n FROM dt_dry
   WHERE action = 'INSERT' AND team = 'DT Opp Recreational' AND assigned_division = 'Recreational'
     AND weight = (SELECT division_weight FROM public.divisions WHERE name = 'Recreational')
     AND games_affected = 1;
  IF v_n <> 1 THEN RAISE EXCEPTION 'DT Opp Recreational should be INSERT Recreational with its weight and 1 game, found %', v_n; END IF;
  SELECT count(*) INTO v_n FROM dt_dry
   WHERE action = 'INSERT' AND team = 'DT Opp Intermediate' AND assigned_division = 'Intermediate';
  IF v_n <> 1 THEN RAISE EXCEPTION 'DT Opp Intermediate should map to Intermediate, found %', v_n; END IF;

  -- Doug's exception wins over the map: both Fireball seasons are Recreational High.
  SELECT count(*) INTO v_n FROM dt_dry
   WHERE action = 'INSERT' AND team = 'Here for Fireball' AND stored_label = 'Recreational'
     AND assigned_division = 'Recreational High';
  IF v_n <> 2 THEN RAISE EXCEPTION 'Here for Fireball should be INSERT Recreational High in 2 seasons, found %', v_n; END IF;

  -- The 3 explicit rows for the 7 newer games.
  SELECT count(*) INTO v_n FROM dt_dry
   WHERE action = 'INSERT'
     AND ((team = 'Shut Your Cornhole' AND assigned_division = 'Competitive')
       OR (team = 'Red Roof Rockets' AND assigned_division = 'Recreational')
       OR (team = 'The Tomato Saucers' AND assigned_division = 'Recreational'));
  IF v_n <> 3 THEN RAISE EXCEPTION 'the 3 explicit rows should be listed, found %', v_n; END IF;

  -- What it would skip.
  SELECT count(*) INTO v_n FROM dt_dry
   WHERE action = 'SKIP: stored name not in the map' AND team = 'DT Opp Unmapped' AND stored_label = 'Intermediate 3';
  IF v_n <> 1 THEN RAISE EXCEPTION 'DT Opp Unmapped should be skipped as not in the map, found %', v_n; END IF;
  SELECT count(*) INTO v_n FROM dt_dry
   WHERE action = 'SKIP: no stored season row' AND team = 'DT Opp NoRow';
  IF v_n <> 1 THEN RAISE EXCEPTION 'DT Opp NoRow should be skipped for no stored row, found %', v_n; END IF;
  SELECT count(*) INTO v_n FROM dt_dry WHERE team = 'DT Opp Solid';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'DT Opp Solid (answered by a snapshot) must not be listed at all, found % rows', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM dt_dry WHERE action LIKE 'CHECK:%';
  IF v_n <> 0 THEN
    SELECT string_agg(team || ' ' || stored_label, '; ') INTO v_text FROM dt_dry WHERE action LIKE 'CHECK:%';
    RAISE EXCEPTION 'the dry run says script 02 would stop: %', v_text;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Script 02 writes. The rows are exactly the rows the dry run listed.
-- ---------------------------------------------------------------------------
\o /dev/null
\i supabase/scripts/division_truth_02_data.sql
\o

DO $$
DECLARE
  v_n bigint;
  v_in_dry bigint;
BEGIN
  SELECT count(*) INTO v_in_dry FROM dt_dry WHERE action = 'INSERT';
  SELECT count(*) INTO v_n FROM public.power_score_division_override;
  IF v_n <> v_in_dry OR v_n < 10 THEN
    RAISE EXCEPTION 'script 02 wrote % rows, the dry run listed % (at least 10 expected)', v_n, v_in_dry;
  END IF;

  -- Set equality, both directions, on (season, team, division).
  IF EXISTS (
    SELECT d.season, d.team, d.assigned_division FROM dt_dry d WHERE d.action = 'INSERT'
    EXCEPT
    SELECT se.name, t.name, dv.name
    FROM public.power_score_division_override o
    JOIN public.seasons se ON se.id = o.season_id
    JOIN public.teams t ON t.id = o.team_id
    JOIN public.divisions dv ON dv.id = o.division_id
  ) THEN
    RAISE EXCEPTION 'the dry run listed a row that script 02 did not write';
  END IF;
  IF EXISTS (
    SELECT se.name, t.name, dv.name
    FROM public.power_score_division_override o
    JOIN public.seasons se ON se.id = o.season_id
    JOIN public.teams t ON t.id = o.team_id
    JOIN public.divisions dv ON dv.id = o.division_id
    EXCEPT
    SELECT d.season, d.team, d.assigned_division FROM dt_dry d WHERE d.action = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'script 02 wrote a row that the dry run did not list';
  END IF;

  -- No person's name in a publicly readable reason. Every reason starts the same way.
  SELECT count(*) INTO v_n FROM public.power_score_division_override
   WHERE reason ~* 'doug' OR reason NOT LIKE 'League owner, 2026-11-17: %';
  IF v_n <> 0 THEN
    RAISE EXCEPTION '% reasons name a person or do not start with "League owner, 2026-11-17: "', v_n;
  END IF;

  -- The per-game rule: DT Opp Solid has no row, and its game is still answered by the snapshot.
  IF EXISTS (SELECT 1 FROM public.power_score_division_override WHERE team_id = '00000000-0000-0000-0000-0000000dd016') THEN
    RAISE EXCEPTION 'a team-season answered by a snapshot got an override row';
  END IF;
  SELECT count(*) INTO v_n FROM public.v_power_score_team_matches_rated
   WHERE opponent_id = '00000000-0000-0000-0000-0000000dd016' AND resolved_by = 'snapshot_at_date';
  IF v_n <> 1 THEN RAISE EXCEPTION 'the snapshot game should still be answered by the snapshot, found %', v_n; END IF;

  -- An unmapped name and a missing stored row insert nothing.
  IF EXISTS (SELECT 1 FROM public.power_score_division_override
              WHERE team_id IN ('00000000-0000-0000-0000-0000000dd017', '00000000-0000-0000-0000-0000000dd018')) THEN
    RAISE EXCEPTION 'an unmapped name or a team-season with no stored row got an override row';
  END IF;

  -- The games that were guessed or unrated are now rated by the override.
  SELECT count(*) INTO v_n FROM public.v_power_score_team_matches_rated
   WHERE resolved_by = 'manual_override'
     AND opponent_id IN ((SELECT id FROM public.teams WHERE lower(btrim(name)) = 'here for fireball'), '5db6b718-81af-4bd0-a0cd-0a0eae4330ad');
  IF v_n < 3 THEN RAISE EXCEPTION 'Fireball (2) and Shut Your Cornhole (1) games should be rated by the override, found %', v_n; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. A second run writes 0, and the dry run then lists no INSERT.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE dt_count_before AS SELECT count(*) AS n FROM public.power_score_division_override;
\o /dev/null
\i supabase/scripts/division_truth_02_data.sql
\o
\set dry2 `cat supabase/scripts/division_truth_02a_dryrun.sql`
CREATE TEMP TABLE dt_dry2 AS :dry2
;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.power_score_division_override) <> (SELECT n FROM dt_count_before) THEN
    RAISE EXCEPTION 'a second run of script 02 wrote rows';
  END IF;
  IF EXISTS (SELECT 1 FROM dt_dry2 WHERE action = 'INSERT') THEN
    RAISE EXCEPTION 'the dry run still lists an INSERT after script 02 ran';
  END IF;
  IF (SELECT count(*) FROM dt_dry2 WHERE action = 'SKIP: a row already exists') < 3 THEN
    RAISE EXCEPTION 'the dry run should list the rows that already exist as SKIP';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Preview and checks run without error (their result tables go to the bin).
-- ---------------------------------------------------------------------------
\o /dev/null
\i supabase/scripts/division_truth_03_preview.sql
\i supabase/scripts/division_truth_06_checks.sql
\o

-- ---------------------------------------------------------------------------
-- 6. Recompute one season: it moves the scores, a second run moves nothing, and
--    no other column changes.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE dt_stats_before AS
SELECT season_id, team_id, match_wins, match_losses, game_wins, game_losses, division_name,
       playoff_rank, champion, runner_up, power_score
FROM public.team_season_stats
WHERE season_id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                    'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                    '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca');

\set s04 `sed "s/TYPE-THE-SEASON-ID-HERE/d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a/" supabase/scripts/division_truth_04_recompute.sql`
\o /dev/null
:s04
;
\o

DO $$
DECLARE
  v_changed integer;
BEGIN
  SELECT val::integer INTO STRICT v_changed FROM division_truth_recompute WHERE what = 'ROWS CHANGED';
  IF v_changed < 1 THEN RAISE EXCEPTION 'the recompute of the spring season changed % rows', v_changed; END IF;
  IF EXISTS (
    SELECT 1 FROM public.team_season_stats s
    JOIN public.v_team_season_agg a ON a.season_id = s.season_id AND a.team_id = s.team_id
    WHERE s.season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a'
      AND (s.power_score IS DISTINCT FROM a.power_score OR s.career_power_score IS DISTINCT FROM a.career_power_score
        OR s.sos IS DISTINCT FROM a.sos)
  ) THEN
    RAISE EXCEPTION 'after the recompute a stored row still differs from the live numbers';
  END IF;
END $$;

\o /dev/null
:s04
;
\o

DO $$
BEGIN
  IF (SELECT val::integer FROM division_truth_recompute WHERE what = 'ROWS CHANGED') <> 0 THEN
    RAISE EXCEPTION 'a second recompute changed rows';
  END IF;
  -- Nothing but the scores moved: record, games, division name, champion, runner-up, playoff rank.
  IF EXISTS (
    SELECT 1 FROM dt_stats_before b
    JOIN public.team_season_stats s ON s.season_id = b.season_id AND s.team_id = b.team_id
    WHERE (s.match_wins, s.match_losses, s.game_wins, s.game_losses, s.division_name, s.playoff_rank, s.champion, s.runner_up)
          IS DISTINCT FROM
          (b.match_wins, b.match_losses, b.game_wins, b.game_losses, b.division_name, b.playoff_rank, b.champion, b.runner_up)
  ) THEN
    RAISE EXCEPTION 'the recompute changed a column other than the scores';
  END IF;
  -- Only the season it was given moved.
  IF EXISTS (
    SELECT 1 FROM dt_stats_before b
    JOIN public.team_season_stats s ON s.season_id = b.season_id AND s.team_id = b.team_id
    WHERE b.season_id <> 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a' AND s.power_score IS DISTINCT FROM b.power_score
  ) THEN
    RAISE EXCEPTION 'the recompute of one season changed another season';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6b. The LIVE columns keep 3 decimals (power_score numeric(8,3), sos numeric(6,3);
--     career_power_score is plain numeric). The repo migrations do not say so, so a CI
--     database holds full precision. Mimic live inside a savepoint (rolled back):
--       (a) BEFORE the recompute check L4 says INFO: N team-seasons of the six still
--           differ (N >= 1), and the live season is counted apart;
--       (a2) the recompute's last line ignores rounding and reads 0, while the strict
--           comparison still counts rows (so the test can tell the two apart);
--       (b) = (d) AFTER the recompute check L4 says PASS for the six seasons; a gap in
--           the ACTIVE, not archived season is counted as "live season";
--       (b2) a gap in career_power_score ONLY (power and sos equal) in a six-season
--           row makes L4 INFO again;
--       (c3) the recompute's last line counts a real gap in career_power_score;
--       (d3) a season with playoffs_active (no season active), not archived, is the
--           live standings season too: exempt;
--       (d4) NO live season (nothing active, no playoffs: the live-season function
--           returns NULL) and a gap in a NOT archived season: FAIL, not a false PASS;
--       (d2) a season that is active AND archived is NOT exempt: FAIL;
--       (c) a stored value in a closed season OUTSIDE the six that is wrong by more
--           than 0.0006 makes L4 FAIL ("elsewhere"); (c2) so does a gap in
--           career_power_score only; (e1) so does a gap in sos only;
--       (e2) a stored sos within rounding (0.0003 off) does not count; (e3) 0.0007 off
--           does. (The exact 0.0006 edge needs a view number with another fifth
--           decimal; changing the weight now would move the six seasons already
--           recomputed, so it is not built.)
--     Every L4 detail assertion reads "(detail LIKE ...) IS NOT TRUE", so a NULL
--     detail raises instead of passing.
-- ---------------------------------------------------------------------------
SAVEPOINT dt_round;

-- A clean slate outside the six seasons (a CI database seeds stored scores there).
DELETE FROM public.team_season_stats
 WHERE season_id NOT IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                         'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                         '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca');
ALTER TABLE public.team_season_stats
  ALTER COLUMN power_score TYPE numeric(8,3),
  ALTER COLUMN sos TYPE numeric(6,3);
-- A weight with more than 3 decimals, so the view's numbers cannot be stored exactly.
UPDATE public.divisions SET division_weight = 0.9637 WHERE lower(btrim(name)) = 'competitive';

-- current_standings_season_id() takes an active season first. A CI database seeds one,
-- so switch every season off here (rolled back with the savepoint): the extra season
-- below must be the only live one.
UPDATE public.seasons SET is_active = false, playoffs_active = false WHERE is_active OR playoffs_active;

-- A season outside the six with one stored score that is 0.01 off. It starts as the
-- ACTIVE season, NOT archived (the live season); later cases archive and close it.
INSERT INTO public.seasons (id, name, start_date, is_active, is_archived)
VALUES ('00000000-0000-0000-0000-0000000dd0e8', 'DT Eighth 2026', '2026-04-01', true, false);
INSERT INTO public.matches_archive
  (id, team1_id, team2_id, season_id, team1_game_wins, team2_game_wins, winner_id, loser_id, date, iscompleted, round_number)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-0000000dd001', '00000000-0000-0000-0000-0000000dd016',
        '00000000-0000-0000-0000-0000000dd0e8', 2, 0, '00000000-0000-0000-0000-0000000dd001',
        '00000000-0000-0000-0000-0000000dd016', '2026-04-08 18:00:00+00', true, 1);
INSERT INTO public.team_season_stats
  (season_id, team_id, match_wins, match_losses, game_wins, game_losses, division_name, power_score, sos, career_power_score)
SELECT a.season_id, a.team_id, 1, 0, 2, 0, 'Competitive', a.power_score + 0.01, a.sos, a.career_power_score
FROM public.v_team_season_agg a
WHERE a.season_id = '00000000-0000-0000-0000-0000000dd0e8' AND a.team_id = '00000000-0000-0000-0000-0000000dd001';

-- (a) check L4 BEFORE the recompute.
\o /dev/null
\i supabase/scripts/division_truth_06_checks.sql
\o
\set l4tail `sed -n '/^WITH$/,$p' supabase/scripts/division_truth_06_checks.sql`
CREATE TEMP TABLE dt_l4a AS :l4tail
;

CREATE TEMP TABLE dt_round_log (season text, still_different bigint, moved bigint, label text);

\set s04r1 `sed "s/TYPE-THE-SEASON-ID-HERE/9cd55eb8-672c-4a43-a9df-3552a7759cca/" supabase/scripts/division_truth_04_recompute.sql`
\set s04r2 `sed "s/TYPE-THE-SEASON-ID-HERE/4b90a1d8-b90a-4e47-8e8c-b89a7b54e106/" supabase/scripts/division_truth_04_recompute.sql`
\set s04r3 `sed "s/TYPE-THE-SEASON-ID-HERE/34cd19e2-abf5-43b8-a16f-6d73a0e998ac/" supabase/scripts/division_truth_04_recompute.sql`
\set s04r4 `sed "s/TYPE-THE-SEASON-ID-HERE/d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a/" supabase/scripts/division_truth_04_recompute.sql`
\set s04r5 `sed "s/TYPE-THE-SEASON-ID-HERE/e537c594-3ba9-4d79-ba63-f6ed90c89e30/" supabase/scripts/division_truth_04_recompute.sql`
\set s04r6 `sed "s/TYPE-THE-SEASON-ID-HERE/d50bb12e-99be-4170-802a-695a402373ce/" supabase/scripts/division_truth_04_recompute.sql`

\o /dev/null
:s04r1
;
\o
INSERT INTO dt_round_log SELECT 'Winter 2 2026', (SELECT val::bigint FROM division_truth_recompute WHERE ord = 4),
       (SELECT count(*) FROM division_truth_recompute WHERE what = 'moved'), (SELECT what FROM division_truth_recompute WHERE ord = 4);
\o /dev/null
:s04r2
;
\o
INSERT INTO dt_round_log SELECT 'Winter 1 2026', (SELECT val::bigint FROM division_truth_recompute WHERE ord = 4),
       (SELECT count(*) FROM division_truth_recompute WHERE what = 'moved'), (SELECT what FROM division_truth_recompute WHERE ord = 4);
\o /dev/null
:s04r3
;
\o
INSERT INTO dt_round_log SELECT 'Fall 2025', (SELECT val::bigint FROM division_truth_recompute WHERE ord = 4),
       (SELECT count(*) FROM division_truth_recompute WHERE what = 'moved'), (SELECT what FROM division_truth_recompute WHERE ord = 4);
\o /dev/null
:s04r4
;
\o
INSERT INTO dt_round_log SELECT 'Spring 2025', (SELECT val::bigint FROM division_truth_recompute WHERE ord = 4),
       (SELECT count(*) FROM division_truth_recompute WHERE what = 'moved'), (SELECT what FROM division_truth_recompute WHERE ord = 4);
\o /dev/null
:s04r5
;
\o
INSERT INTO dt_round_log SELECT 'Summer 1 2025', (SELECT val::bigint FROM division_truth_recompute WHERE ord = 4),
       (SELECT count(*) FROM division_truth_recompute WHERE what = 'moved'), (SELECT what FROM division_truth_recompute WHERE ord = 4);
\o /dev/null
:s04r6
;
\o
INSERT INTO dt_round_log SELECT 'Summer 2 2025', (SELECT val::bigint FROM division_truth_recompute WHERE ord = 4),
       (SELECT count(*) FROM division_truth_recompute WHERE what = 'moved'), (SELECT what FROM division_truth_recompute WHERE ord = 4);
-- A second run of one season: the stored numbers are already the rounded ones, so no
-- team really moves (the UPDATE itself may still rewrite the rows; that is rounding).
\o /dev/null
:s04r1
;
\o
INSERT INTO dt_round_log SELECT 'Winter 2 2026 (second run)', (SELECT val::bigint FROM division_truth_recompute WHERE ord = 4),
       (SELECT count(*) FROM division_truth_recompute WHERE what = 'moved'), (SELECT what FROM division_truth_recompute WHERE ord = 4);

DO $$
DECLARE
  v_strict bigint;
  v_n bigint;
BEGIN
  -- (a) the new last line is 0 on every run, with its new label.
  SELECT count(*) INTO v_n FROM dt_round_log;
  IF v_n IS DISTINCT FROM 7 THEN RAISE EXCEPTION 'expected 7 recompute runs, found %', v_n; END IF;
  IF EXISTS (SELECT 1 FROM dt_round_log WHERE still_different IS DISTINCT FROM 0) THEN
    RAISE EXCEPTION 'a recompute ended with rows still different by more than rounding: %',
      (SELECT string_agg(season || '=' || COALESCE(still_different::text, 'NULL'), ', ') FROM dt_round_log WHERE still_different IS DISTINCT FROM 0);
  END IF;
  IF EXISTS (SELECT 1 FROM dt_round_log
              WHERE label IS DISTINCT FROM 'rows still different from the rules by more than rounding (must be 0)') THEN
    RAISE EXCEPTION 'the last line of script 04 has another label';
  END IF;
  -- ...but a strict comparison (the old last line) would count rows: the test sees the difference.
  SELECT count(*) INTO v_strict
  FROM public.team_season_stats s
  JOIN public.v_team_season_agg a ON a.season_id = s.season_id AND a.team_id = s.team_id
  WHERE s.season_id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                      'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                      '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca')
    AND (s.power_score IS DISTINCT FROM a.power_score OR s.sos IS DISTINCT FROM a.sos
      OR s.career_power_score IS DISTINCT FROM a.career_power_score);
  IF v_strict < 1 THEN
    RAISE EXCEPTION 'the strict comparison finds no row: the 3-decimal columns are not mimicked';
  END IF;
  -- career_power_score is plain numeric on live: it matches the view exactly.
  IF EXISTS (SELECT 1 FROM public.team_season_stats s
              JOIN public.v_team_season_agg a ON a.season_id = s.season_id AND a.team_id = s.team_id
             WHERE s.season_id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                      'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                      '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca')
               AND s.career_power_score IS DISTINCT FROM a.career_power_score) THEN
    RAISE EXCEPTION 'career_power_score differs from the view after the recompute';
  END IF;
  -- Rows really are 3 decimals, and the gap is rounding only.
  IF EXISTS (SELECT 1 FROM public.team_season_stats s
              JOIN public.v_team_season_agg a ON a.season_id = s.season_id AND a.team_id = s.team_id
             WHERE s.season_id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                      'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                      '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca')
               AND (abs(s.power_score - a.power_score) > 0.0006 OR abs(s.sos - a.sos) > 0.0006)) THEN
    RAISE EXCEPTION 'a gap bigger than rounding is left after the recompute';
  END IF;
  -- The second run moved no team.
  IF (SELECT moved FROM dt_round_log WHERE season LIKE '%second run%') IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'the second run of the recompute moved a team';
  END IF;
END $$;

-- (b) check L4 after the recompute of all six seasons.
CREATE TEMP TABLE dt_l4b AS :l4tail
;

-- (b2) a gap in career_power_score ONLY: power_score and sos are the recomputed ones.
UPDATE public.team_season_stats SET career_power_score = career_power_score + 0.01
 WHERE ctid = (SELECT ctid FROM public.team_season_stats
                WHERE season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a' AND career_power_score IS NOT NULL
                ORDER BY team_id LIMIT 1);
CREATE TEMP TABLE dt_l4b2 AS :l4tail
;

-- (c3) script 04's last line counts a real career gap. Its counting statement is cut
--      out of the script and run on its own (the script would rewrite the row).
\set cnt04 `sed -n '/^  -- Still different from the rules after the update/,/IS DISTINCT FROM a.career_power_score);/p' supabase/scripts/division_truth_04_recompute.sql`
UPDATE public.team_season_stats SET career_power_score = career_power_score - 0.01
 WHERE ctid = (SELECT ctid FROM public.team_season_stats
                WHERE season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a' AND career_power_score IS NOT NULL
                ORDER BY team_id LIMIT 1);
SELECT format('DO $x$ DECLARE v_id uuid := %L; BEGIN DELETE FROM division_truth_recompute WHERE ord = 4; %s END $x$',
              'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', :'cnt04') \gexec
CREATE TEMP TABLE dt_c3_before AS SELECT what, val FROM division_truth_recompute WHERE ord = 4;
UPDATE public.team_season_stats SET career_power_score = career_power_score + 0.01
 WHERE ctid = (SELECT ctid FROM public.team_season_stats
                WHERE season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a' AND career_power_score IS NOT NULL
                ORDER BY team_id LIMIT 1);
SELECT format('DO $x$ DECLARE v_id uuid := %L; BEGIN DELETE FROM division_truth_recompute WHERE ord = 4; %s END $x$',
              'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', :'cnt04') \gexec
CREATE TEMP TABLE dt_c3_after AS SELECT what, val FROM division_truth_recompute WHERE ord = 4;
UPDATE public.team_season_stats SET career_power_score = career_power_score - 0.01
 WHERE ctid = (SELECT ctid FROM public.team_season_stats
                WHERE season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a' AND career_power_score IS NOT NULL
                ORDER BY team_id LIMIT 1);

-- (d3) no season is active, playoffs_active is on, not archived: still the live season.
UPDATE public.seasons SET is_active = false, playoffs_active = true WHERE id = '00000000-0000-0000-0000-0000000dd0e8';
CREATE TEMP TABLE dt_l4d3 AS :l4tail
;

-- (d4) NO live season at all: nothing active, no playoffs, so current_standings_season_id()
--      is NULL. The extra season is NOT archived and its gap is real: L4 must FAIL.
--      (This pins the COALESCE in script 06: without it the NULL comparison would
--      count the row neither as "elsewhere" nor as "live", and L4 would say PASS.)
UPDATE public.seasons SET is_active = false, playoffs_active = false
 WHERE id = '00000000-0000-0000-0000-0000000dd0e8';
CREATE TEMP TABLE dt_d4_live AS SELECT public.current_standings_season_id() AS season_id;
CREATE TEMP TABLE dt_l4d4 AS :l4tail
;

-- (d2) active AND archived: an archived season is never refreshed by itself.
UPDATE public.seasons SET is_active = true, playoffs_active = false, is_archived = true
 WHERE id = '00000000-0000-0000-0000-0000000dd0e8';
CREATE TEMP TABLE dt_l4d2 AS :l4tail
;

-- (c) the extra season is now CLOSED (archived, not active, no playoffs): its power gap is a FAIL.
UPDATE public.seasons SET is_active = false, playoffs_active = false WHERE id = '00000000-0000-0000-0000-0000000dd0e8';
CREATE TEMP TABLE dt_l4c AS :l4tail
;

-- (c2) the same closed season, with only career_power_score off.
UPDATE public.team_season_stats s
   SET power_score = a.power_score, sos = a.sos, career_power_score = a.career_power_score + 0.01
  FROM public.v_team_season_agg a
 WHERE s.season_id = '00000000-0000-0000-0000-0000000dd0e8' AND a.season_id = s.season_id AND a.team_id = s.team_id;
CREATE TEMP TABLE dt_l4c2 AS :l4tail
;

-- The view's sos for this team is the Competitive weight, 0.9637: four decimals, so
-- storage (3 decimals) cannot hold it exactly. The next cases rely on that.
CREATE TEMP TABLE dt_view_sos AS
SELECT a.sos, a.power_score, a.career_power_score FROM public.v_team_season_agg a
 WHERE a.season_id = '00000000-0000-0000-0000-0000000dd0e8' AND a.team_id = '00000000-0000-0000-0000-0000000dd001';

-- (e1) the same closed season, with ONLY sos off by 0.01 (power and career equal).
UPDATE public.team_season_stats s
   SET power_score = a.power_score, sos = a.sos + 0.01, career_power_score = a.career_power_score
  FROM public.v_team_season_agg a
 WHERE s.season_id = '00000000-0000-0000-0000-0000000dd0e8' AND a.season_id = s.season_id AND a.team_id = s.team_id;
CREATE TEMP TABLE dt_l4e1 AS :l4tail
;

-- (e2) pure rounding: every number is the view's, stored with 3 decimals (sos 0.964
--      against 0.9637, a gap of 0.0003). It must NOT count.
UPDATE public.team_season_stats s
   SET power_score = a.power_score, sos = a.sos, career_power_score = a.career_power_score
  FROM public.v_team_season_agg a
 WHERE s.season_id = '00000000-0000-0000-0000-0000000dd0e8' AND a.season_id = s.season_id AND a.team_id = s.team_id;
CREATE TEMP TABLE dt_l4e2 AS :l4tail
;

-- (e3) sos stored as 0.963 against 0.9637 (a gap of 0.0007, just over rounding). It counts.
UPDATE public.team_season_stats s
   SET sos = a.sos - 0.0007
  FROM public.v_team_season_agg a
 WHERE s.season_id = '00000000-0000-0000-0000-0000000dd0e8' AND a.season_id = s.season_id AND a.team_id = s.team_id;
CREATE TEMP TABLE dt_l4e3 AS :l4tail
;

DO $$
DECLARE
  v_a record; v_b record; v_b2 record; v_d3 record; v_d4 record; v_d2 record; v_c record; v_c2 record;
  v_e1 record; v_e2 record; v_e3 record; v_n bigint;
  -- the tails of the L4 detail text (unchanged by the script, so the docs stay right)
  c_live1 constant text := '%; 0 elsewhere, not counting the live season (must be 0); 1 in the live season%';
  c_els1  constant text := '%; 1 elsewhere, not counting the live season (must be 0); 0 in the live season%';
  c_none  constant text := '%; 0 elsewhere, not counting the live season (must be 0); 0 in the live season%';
BEGIN
  SELECT result, detail INTO STRICT v_a  FROM dt_l4a  WHERE check_name = 'L4 stored vs rules now';
  SELECT result, detail INTO STRICT v_b  FROM dt_l4b  WHERE check_name = 'L4 stored vs rules now';
  SELECT result, detail INTO STRICT v_b2 FROM dt_l4b2 WHERE check_name = 'L4 stored vs rules now';
  SELECT result, detail INTO STRICT v_d3 FROM dt_l4d3 WHERE check_name = 'L4 stored vs rules now';
  SELECT result, detail INTO STRICT v_d4 FROM dt_l4d4 WHERE check_name = 'L4 stored vs rules now';
  SELECT result, detail INTO STRICT v_d2 FROM dt_l4d2 WHERE check_name = 'L4 stored vs rules now';
  SELECT result, detail INTO STRICT v_c  FROM dt_l4c  WHERE check_name = 'L4 stored vs rules now';
  SELECT result, detail INTO STRICT v_c2 FROM dt_l4c2 WHERE check_name = 'L4 stored vs rules now';
  SELECT result, detail INTO STRICT v_e1 FROM dt_l4e1 WHERE check_name = 'L4 stored vs rules now';
  SELECT result, detail INTO STRICT v_e2 FROM dt_l4e2 WHERE check_name = 'L4 stored vs rules now';
  SELECT result, detail INTO STRICT v_e3 FROM dt_l4e3 WHERE check_name = 'L4 stored vs rules now';
  -- A NULL detail must raise, not pass: every LIKE below is wrapped in "IS NOT TRUE".
  -- (a) before the recompute: INFO, at least one team-season of the six still differs,
  --     and the live season is counted apart.
  v_n := substring(v_a.detail FROM '^([0-9]+) team-seasons in the six seasons still differ by more than rounding')::bigint;
  IF v_a.result IS DISTINCT FROM 'INFO' OR v_n IS NULL OR v_n < 1
     OR (v_a.detail LIKE c_live1) IS NOT TRUE THEN
    RAISE EXCEPTION 'L4 before the recompute: expected INFO with N >= 1 in the six seasons and 1 in the live season, got % / %', v_a.result, v_a.detail;
  END IF;
  -- (b) = (d) after the recompute: PASS; the gap in the ACTIVE, not archived season is the live season.
  IF v_b.result IS DISTINCT FROM 'PASS'
     OR (v_b.detail LIKE '0 team-seasons in the six seasons still differ by more than rounding%') IS NOT TRUE
     OR (v_b.detail LIKE c_live1) IS NOT TRUE THEN
    RAISE EXCEPTION 'L4 after the recompute: expected PASS, 0 in the six seasons, 1 in the live season, got % / %', v_b.result, v_b.detail;
  END IF;
  -- (b2) a career-only gap in a six-season row.
  IF v_b2.result IS DISTINCT FROM 'INFO'
     OR (v_b2.detail LIKE '1 team-seasons in the six seasons still differ by more than rounding%') IS NOT TRUE THEN
    RAISE EXCEPTION 'L4, career_power_score off by 0.01 in a six-season row: expected INFO with 1 in the six seasons, got % / %', v_b2.result, v_b2.detail;
  END IF;
  -- (c3) script 04's last line: 0 before, 1 after a career gap.
  IF (SELECT val FROM dt_c3_before) IS DISTINCT FROM '0' OR (SELECT val FROM dt_c3_after) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'script 04 last line and a career gap: expected 0 then 1, got % then %',
      (SELECT val FROM dt_c3_before), (SELECT val FROM dt_c3_after);
  END IF;
  IF (SELECT what FROM dt_c3_after) IS DISTINCT FROM 'rows still different from the rules by more than rounding (must be 0)' THEN
    RAISE EXCEPTION 'the counting statement cut out of script 04 has another label';
  END IF;
  -- (d3) no active season, playoffs_active on, not archived: the live standings season.
  IF v_d3.result IS DISTINCT FROM 'PASS' OR (v_d3.detail LIKE c_live1) IS NOT TRUE THEN
    RAISE EXCEPTION 'L4, playoffs_active-only season (live standings season): expected PASS (1 in the live season), got % / %', v_d3.result, v_d3.detail;
  END IF;
  -- (d4) no live season at all (current_standings_season_id() is NULL), not archived: FAIL.
  IF (SELECT season_id FROM dt_d4_live) IS NOT NULL THEN
    RAISE EXCEPTION 'case (d4) needs current_standings_season_id() to be NULL, got %', (SELECT season_id FROM dt_d4_live);
  END IF;
  IF v_d4.result IS DISTINCT FROM 'FAIL' OR (v_d4.detail LIKE c_els1) IS NOT TRUE THEN
    RAISE EXCEPTION 'L4, no live season at all and a gap in a not archived season: expected FAIL (1 elsewhere, 0 in the live season), got % / %', v_d4.result, v_d4.detail;
  END IF;
  -- (d2) active AND archived: never refreshed by itself, so not exempt.
  IF v_d2.result IS DISTINCT FROM 'FAIL' OR (v_d2.detail LIKE c_els1) IS NOT TRUE THEN
    RAISE EXCEPTION 'L4, a season that is active AND archived: expected FAIL (1 elsewhere), got % / %', v_d2.result, v_d2.detail;
  END IF;
  -- (c), (c2), (e1): a closed season outside the six, wrong in power, in career, or in sos alone.
  IF v_c.result IS DISTINCT FROM 'FAIL' OR (v_c.detail LIKE c_els1) IS NOT TRUE THEN
    RAISE EXCEPTION 'L4, a closed season outside the six is wrong: expected FAIL (1 elsewhere), got % / %', v_c.result, v_c.detail;
  END IF;
  IF v_c2.result IS DISTINCT FROM 'FAIL' OR (v_c2.detail LIKE c_els1) IS NOT TRUE THEN
    RAISE EXCEPTION 'L4, a closed season outside the six, career_power_score only: expected FAIL (1 elsewhere), got % / %', v_c2.result, v_c2.detail;
  END IF;
  IF NOT COALESCE((SELECT sos = 0.9637 FROM dt_view_sos), false) THEN
    RAISE EXCEPTION 'the fixture should give the extra season a view sos of 0.9637, got %', (SELECT sos FROM dt_view_sos);
  END IF;
  IF v_e1.result IS DISTINCT FROM 'FAIL' OR (v_e1.detail LIKE c_els1) IS NOT TRUE THEN
    RAISE EXCEPTION 'L4, a closed season outside the six, sos only off by 0.01: expected FAIL (1 elsewhere), got % / %', v_e1.result, v_e1.detail;
  END IF;
  -- (e2) pure rounding must NOT count; (e3) a gap of 0.0007 must.
  IF v_e2.result IS DISTINCT FROM 'PASS' OR (v_e2.detail LIKE c_none) IS NOT TRUE THEN
    RAISE EXCEPTION 'L4, stored sos 0.964 against 0.9637 (rounding): expected PASS (0 elsewhere), got % / %', v_e2.result, v_e2.detail;
  END IF;
  IF v_e3.result IS DISTINCT FROM 'FAIL' OR (v_e3.detail LIKE c_els1) IS NOT TRUE THEN
    RAISE EXCEPTION 'L4, stored sos 0.963 against 0.9637 (gap 0.0007): expected FAIL (1 elsewhere), got % / %', v_e3.result, v_e3.detail;
  END IF;
END $$;

-- (e) Undo path 2 on the 3-decimal columns. Its report line that compares with the
--     rules ignores rounding, so it reads 0, while the strict comparison would not.
--     A real gap (more than 0.0006) still counts.
\set s05r `sed "s/TYPE-1-OR-2-HERE/2/" supabase/scripts/division_truth_05_undo.sql`
\set s05rtail `sed -n '/^-- ONE result/,$p' supabase/scripts/division_truth_05_undo.sql`
\o /dev/null
:s05r
;
\o
CREATE TEMP TABLE dt_rep13 AS :s05rtail
;
CREATE TEMP TABLE dt_strict13 AS
SELECT count(*) AS n
FROM public.team_season_stats s
JOIN public.v_team_season_agg a ON a.season_id = s.season_id AND a.team_id = s.team_id
WHERE s.season_id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                      'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                      '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca')
  AND (s.power_score IS DISTINCT FROM a.power_score OR s.career_power_score IS DISTINCT FROM a.career_power_score
    OR s.sos IS DISTINCT FROM a.sos);
-- one real gap: a stored score 0.01 off in a closed season
UPDATE public.team_season_stats SET power_score = power_score + 0.01
 WHERE ctid = (SELECT ctid FROM public.team_season_stats
                WHERE season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a' AND power_score IS NOT NULL
                ORDER BY team_id LIMIT 1);
CREATE TEMP TABLE dt_rep13b AS :s05rtail
;

DO $$
DECLARE
  v_label constant text := 'six seasons: rows that differ from the RULES NOW by more than rounding (0 after path 2)';
BEGIN
  IF (SELECT val FROM dt_rep13 WHERE what = v_label) IS DISTINCT FROM '0' THEN
    RAISE EXCEPTION 'undo path 2 on 3-decimal columns: the RULES NOW line should read 0, got %',
      (SELECT string_agg(what || ' = ' || val, '; ') FROM dt_rep13 WHERE what LIKE '%RULES NOW%');
  END IF;
  IF (SELECT n FROM dt_strict13) IS NULL OR (SELECT n FROM dt_strict13) < 1 THEN
    RAISE EXCEPTION 'the strict comparison finds no row after path 2: the 3-decimal columns are not mimicked';
  END IF;
  IF (SELECT val FROM dt_rep13b WHERE what = v_label) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'a real gap of 0.01 should be counted once, got %',
      (SELECT val FROM dt_rep13b WHERE what LIKE '%RULES NOW%');
  END IF;
END $$;

ROLLBACK TO SAVEPOINT dt_round;
RELEASE SAVEPOINT dt_round;

-- ---------------------------------------------------------------------------
-- 6c. Script 07 retires the backup table. The state is the one after step 6 of the
--     real run: every one of the six seasons recomputed, the override rows in place.
--     Everything here runs inside a savepoint that is rolled back at the end,
--     because sections 7 and 8 still need the backup.
--       (a) the GUARD: a stored six-season score off by more than rounding (power, sos or
--           career), a saved row with no live row, a saved row with a changed record, the
--           old rated view, an override row outside the six seasons, or 0 override rows:
--           07 STOPs and the table stays; a gap of 0.0004 is rounding, and the accepted
--           change (power, sos, career) does NOT stop it;
--       (b) the real run drops ONLY the backup (team_season_stats and the override
--           rows are byte for byte the same), its result lines are right, and a
--           second run says "already gone";
--       (c) after the drop, 06 still runs (L6b, L6c, L6d, L7 say "skipped"), and 03
--           and 02 STOP with a message that names both reasons, and the dry run (02a) says so.
-- ---------------------------------------------------------------------------
SAVEPOINT dt_retire;

\set s07head `sed -n '/^DROP TABLE IF EXISTS pg_temp/,/^CREATE TEMP TABLE/p' supabase/scripts/division_truth_07_drop_backup.sql`
\set s07do   `sed -n '/^DO /,/^END .*;$/p' supabase/scripts/division_truth_07_drop_backup.sql`
\set s07tail `sed -n '/^-- ONE result/,$p' supabase/scripts/division_truth_07_drop_backup.sql`
\set s03do   `sed -n '/^DO /,/^END .*;$/p' supabase/scripts/division_truth_03_preview.sql`
\set s02do   `sed -n '/^DO /,/^END .*;$/p' supabase/scripts/division_truth_02_data.sql`

-- All six seasons recomputed with the real script 04 (as on 2026-11-18).
\o /dev/null
:s04r1
;
:s04r2
;
:s04r3
;
:s04r4
;
:s04r5
;
:s04r6
;
\o

-- (a1) a stored score 0.01 off: STOP, nothing dropped.
SAVEPOINT dt_g1;
UPDATE public.team_season_stats SET power_score = power_score + 0.01
 WHERE ctid = (SELECT ctid FROM public.team_season_stats
                WHERE season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a' AND power_score IS NOT NULL
                ORDER BY team_id LIMIT 1);
:s07head
;
-- Wipe LAST_ERROR_MESSAGE first, so a message left by an earlier test cannot pass this one.
SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
SELECT 1 / 0;
\o
ROLLBACK TO SAVEPOINT dt_clear;
RELEASE SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
:s07do
;
\o
ROLLBACK TO SAVEPOINT dt_g1;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: 1 stored score\(s\) in the six seasons still differ from the rules now by more than rounding\..* Nothing was dropped\.$' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 07 did not stop for a stored score that is off by 0.01'; END $$;
\endif
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    RAISE EXCEPTION 'script 07 stopped, but the backup table is gone';
  END IF;
END $$;

-- (a2) a stored CAREER score off (power and sos equal): STOP too.
SAVEPOINT dt_g2;
UPDATE public.team_season_stats SET career_power_score = COALESCE(career_power_score, 0) + 0.01
 WHERE ctid = (SELECT ctid FROM public.team_season_stats
                WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30' AND power_score IS NOT NULL
                ORDER BY team_id LIMIT 1);
:s07head
;
-- Wipe LAST_ERROR_MESSAGE first, so a message left by an earlier test cannot pass this one.
SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
SELECT 1 / 0;
\o
ROLLBACK TO SAVEPOINT dt_clear;
RELEASE SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
:s07do
;
\o
ROLLBACK TO SAVEPOINT dt_g2;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: 1 stored score\(s\) in the six seasons still differ' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 07 did not stop for a career score that is off'; END $$;
\endif
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    RAISE EXCEPTION 'script 07 stopped on a career gap, but the backup table is gone';
  END IF;
END $$;

-- (a3) 0 override rows (the six seasons recomputed with none): STOP, nothing dropped.
SAVEPOINT dt_g3;
DELETE FROM public.power_score_division_override;
\o /dev/null
:s04r1
;
:s04r2
;
:s04r3
;
:s04r4
;
:s04r5
;
:s04r6
;
\o
:s07head
;
-- Wipe LAST_ERROR_MESSAGE first, so a message left by an earlier test cannot pass this one.
SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
SELECT 1 / 0;
\o
ROLLBACK TO SAVEPOINT dt_clear;
RELEASE SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
:s07do
;
\o
ROLLBACK TO SAVEPOINT dt_g3;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: the override table has 0 rows\..* Nothing was dropped\.$' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 07 did not stop for an empty override table'; END $$;
\endif
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    RAISE EXCEPTION 'script 07 stopped on 0 override rows, but the backup table is gone';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.power_score_division_override) THEN
    RAISE EXCEPTION 'the savepoint did not bring the override rows back';
  END IF;
END $$;

-- (a3b) a saved row whose team-season is gone from team_season_stats: STOP, the table stays.
--       The team is "Here for Fireball": it has a team-season in Summer 1 AND Summer 2 2025.
--       Only the Summer 1 row goes, so a test of the team alone would still find a live row.
SAVEPOINT dt_g5;
DELETE FROM public.team_season_stats
 WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
   AND team_id = (SELECT id FROM public.teams WHERE lower(btrim(name)) = 'here for fireball');
:s07head
;
-- Wipe LAST_ERROR_MESSAGE first, so a message left by an earlier test cannot pass this one.
SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
SELECT 1 / 0;
\o
ROLLBACK TO SAVEPOINT dt_clear;
RELEASE SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
:s07do
;
\o
ROLLBACK TO SAVEPOINT dt_g5;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: 1 saved row\(s\) have no live row in team_season_stats any more\..* Nothing was dropped\.$' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 07 did not stop for a saved row with no live row'; END $$;
\endif
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    RAISE EXCEPTION 'script 07 stopped on a saved row with no live row, but the backup table is gone';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.team_season_stats
                  WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
                    AND team_id = (SELECT id FROM public.teams WHERE lower(btrim(name)) = 'here for fireball')) THEN
    RAISE EXCEPTION 'the savepoint did not bring the deleted team-season back';
  END IF;
  IF (SELECT count(*) FROM public.team_season_stats_pre_division_truth
       WHERE team_id = (SELECT id FROM public.teams WHERE lower(btrim(name)) = 'here for fireball')) < 2 THEN
    RAISE EXCEPTION 'the fixture team should have two saved team-seasons';
  END IF;
END $$;

-- (a3c) no CASCADE: a view that depends on the backup makes the drop fail, and nothing goes.
SAVEPOINT dt_g6;
CREATE VIEW public.dt_depends_on_backup AS
SELECT season_id, team_id FROM public.team_season_stats_pre_division_truth;
:s07head
;
-- Wipe LAST_ERROR_MESSAGE first, so a message left by an earlier test cannot pass this one.
SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
SELECT 1 / 0;
\o
ROLLBACK TO SAVEPOINT dt_clear;
RELEASE SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
:s07do
;
\o
ROLLBACK TO SAVEPOINT dt_g6;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^cannot drop table team_season_stats_pre_division_truth because other objects depend on it' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 07 did not fail on a view that depends on the backup (CASCADE?)'; END $$;
\endif
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    RAISE EXCEPTION 'script 07 failed on a dependent view, but the backup table is gone';
  END IF;
  IF to_regclass('public.dt_depends_on_backup') IS NOT NULL THEN
    RAISE EXCEPTION 'the savepoint did not remove the test view';
  END IF;
END $$;

-- (a1b) a stored SOS 0.01 off, power and career equal to the rules: STOP too. (Without
--       the sos comparison in script 07 only this case would catch it.)
SAVEPOINT dt_g7;
UPDATE public.team_season_stats SET sos = sos + 0.01
 WHERE ctid = (SELECT ctid FROM public.team_season_stats
                WHERE season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a' AND sos IS NOT NULL
                ORDER BY team_id LIMIT 1);
DO $$
BEGIN
  -- Only sos is off, by a material amount: power and career still match the rules.
  IF (SELECT count(*) FROM public.team_season_stats s
        JOIN public.v_team_season_agg a ON a.season_id = s.season_id AND a.team_id = s.team_id
       WHERE abs(COALESCE(s.sos, -1) - COALESCE(a.sos, -1)) > 0.0006) IS DISTINCT FROM 1
     OR EXISTS (SELECT 1 FROM public.team_season_stats s
                  JOIN public.v_team_season_agg a ON a.season_id = s.season_id AND a.team_id = s.team_id
                 WHERE abs(COALESCE(s.power_score, -1) - COALESCE(a.power_score, -1)) > 0.0006
                    OR s.career_power_score IS DISTINCT FROM a.career_power_score) THEN
    RAISE EXCEPTION 'the sos-only case is wrong: exactly one sos should be off, and no power or career score';
  END IF;
END $$;
:s07head
;
-- Wipe LAST_ERROR_MESSAGE first, so a message left by an earlier test cannot pass this one.
SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
SELECT 1 / 0;
\o
ROLLBACK TO SAVEPOINT dt_clear;
RELEASE SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
:s07do
;
\o
ROLLBACK TO SAVEPOINT dt_g7;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: 1 stored score\(s\) in the six seasons still differ from the rules now by more than rounding\..* Nothing was dropped\.$' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 07 did not stop for a stored sos that is off by 0.01'; END $$;
\endif
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    RAISE EXCEPTION 'script 07 stopped on an sos gap, but the backup table is gone';
  END IF;
END $$;

-- (a3d) a saved row whose live row is still there but whose RECORD changed (wins): STOP.
--       Power, sos and career are equal to the rules, so only the record guard can fire.
SAVEPOINT dt_g8;
UPDATE public.team_season_stats SET match_wins = match_wins + 1
 WHERE ctid = (SELECT s.ctid FROM public.team_season_stats s
                 JOIN public.team_season_stats_pre_division_truth b ON b.season_id = s.season_id AND b.team_id = s.team_id
                WHERE s.season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a'
                ORDER BY s.team_id LIMIT 1);
:s07head
;
-- Wipe LAST_ERROR_MESSAGE first, so a message left by an earlier test cannot pass this one.
SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
SELECT 1 / 0;
\o
ROLLBACK TO SAVEPOINT dt_clear;
RELEASE SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
:s07do
;
\o
ROLLBACK TO SAVEPOINT dt_g8;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: 1 saved row\(s\) have a different record in team_season_stats now \(wins, losses, games, division, champion, runner-up or playoff rank\)\..* Nothing was dropped\.$' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 07 did not stop for a saved row whose wins changed'; END $$;
\endif
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    RAISE EXCEPTION 'script 07 stopped on a changed record, but the backup table is gone';
  END IF;
END $$;

-- (a3e) the same with a playoff rank that was empty when saved and is set now (NULL against
--       a number must count as a change).
SAVEPOINT dt_g9;
UPDATE public.team_season_stats SET playoff_rank = 1
 WHERE ctid = (SELECT s.ctid FROM public.team_season_stats s
                 JOIN public.team_season_stats_pre_division_truth b ON b.season_id = s.season_id AND b.team_id = s.team_id
                WHERE s.season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30' AND b.playoff_rank IS NULL
                ORDER BY s.team_id LIMIT 1);
:s07head
;
-- Wipe LAST_ERROR_MESSAGE first, so a message left by an earlier test cannot pass this one.
SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
SELECT 1 / 0;
\o
ROLLBACK TO SAVEPOINT dt_clear;
RELEASE SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
:s07do
;
\o
ROLLBACK TO SAVEPOINT dt_g9;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: 1 saved row\(s\) have a different record in team_season_stats now' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 07 did not stop for a saved row whose playoff rank went from empty to a number'; END $$;
\endif

-- (a3f) the OLD rated view is installed (undo path 2 puts it back): STOP before any score
--       is compared. The stored scores are the new ones, so without this guard the score
--       test would fail with another message: this case also proves the view comes first.
\set s05oldview `sed -n '/^    CREATE OR REPLACE VIEW public.v_power_score_team_matches_rated/,/^      LEFT JOIN public.v_division_rateable dw ON dw.id = r.opp_division_id;$/p' supabase/scripts/division_truth_05_undo.sql`
SAVEPOINT dt_g10;
:s05oldview
;
DO $$
BEGIN
  IF position('manual_override' IN pg_get_viewdef('public.v_power_score_team_matches_rated'::regclass, true)) > 0 THEN
    RAISE EXCEPTION 'the old-view case is wrong: the test view still has the override step';
  END IF;
END $$;
:s07head
;
-- Wipe LAST_ERROR_MESSAGE first, so a message left by an earlier test cannot pass this one.
SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
SELECT 1 / 0;
\o
ROLLBACK TO SAVEPOINT dt_clear;
RELEASE SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
:s07do
;
\o
ROLLBACK TO SAVEPOINT dt_g10;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: the rated view is not the override-aware version \(undo path 2 puts the old view back\)\. Nothing was dropped\.$' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 07 did not stop when the old rated view is installed'; END $$;
\endif
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    RAISE EXCEPTION 'script 07 stopped on the old view, but the backup table is gone';
  END IF;
  IF position('manual_override' IN pg_get_viewdef('public.v_power_score_team_matches_rated'::regclass, true)) = 0 THEN
    RAISE EXCEPTION 'the savepoint did not bring the override-aware view back';
  END IF;
END $$;

-- (a3g) an override row for a season OUTSIDE the six: STOP (undo path 2 would refuse to
--       run, so retiring the backup would leave no way back).
SAVEPOINT dt_g11;
INSERT INTO public.seasons (id, name, start_date, is_active, is_archived)
VALUES ('00000000-0000-0000-0000-0000000dd0f8', 'DT Eighth 2026', '2026-07-01', false, true);
INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason)
VALUES ('00000000-0000-0000-0000-0000000dd001', '00000000-0000-0000-0000-0000000dd0f8',
        (SELECT id FROM public.divisions WHERE lower(btrim(name)) = 'competitive'),
        'League owner, test: a row outside the six seasons');
:s07head
;
-- Wipe LAST_ERROR_MESSAGE first, so a message left by an earlier test cannot pass this one.
SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
SELECT 1 / 0;
\o
ROLLBACK TO SAVEPOINT dt_clear;
RELEASE SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
:s07do
;
\o
ROLLBACK TO SAVEPOINT dt_g11;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: 1 override row\(s\) are for seasons outside the six\. Undo path 2 would refuse to run\. Resolve them first \(see OPERATIONS 6g\)\. Nothing was dropped\.$' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 07 did not stop for an override row outside the six seasons'; END $$;
\endif
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    RAISE EXCEPTION 'script 07 stopped on an override row outside the six, but the backup table is gone';
  END IF;
  IF EXISTS (SELECT 1 FROM public.power_score_division_override WHERE season_id = '00000000-0000-0000-0000-0000000dd0f8') THEN
    RAISE EXCEPTION 'the savepoint did not remove the test override row';
  END IF;
END $$;

-- (a3h) the ACCEPTED change passes: every saved power score, sos and career score is far from
--       the stored one (+0.5, +0.2, +0.3), the records are the same. 07 drops the table.
--       It also holds the two locks: a share lock on team_season_stats (no live row can be
--       deleted between the guards and the drop), and it takes the weight-save lock and that
--       table lock BEFORE it looks for the backup (read from the order of the lines).
SAVEPOINT dt_g12;
UPDATE public.team_season_stats_pre_division_truth
   SET power_score = COALESCE(power_score, 0) + 0.5,
       sos = COALESCE(sos, 0) + 0.2,
       career_power_score = COALESCE(career_power_score, 0) + 0.3;
:s07head
;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'relation' AND granted AND pid = pg_backend_pid()
                AND relation = 'public.team_season_stats'::regclass AND mode = 'ShareLock') THEN
    RAISE EXCEPTION 'a share lock was held before script 07 ran, so the lock check below would prove nothing';
  END IF;
END $$;
\o /dev/null
:s07do
;
\o
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NOT NULL THEN
    RAISE EXCEPTION 'script 07 stopped although only the accepted change (power, sos, career) differs';
  END IF;
  IF (SELECT val FROM division_truth_drop WHERE what = 'saved rows whose record differs from the live row (must be 0)') IS DISTINCT FROM '0' THEN
    RAISE EXCEPTION 'script 07 should count 0 saved rows with a changed record';
  END IF;
  IF (SELECT val::bigint FROM division_truth_drop WHERE what LIKE 'six seasons: saved rows that differ from the stored numbers now%') IS NULL
     OR (SELECT val::bigint FROM division_truth_drop WHERE what LIKE 'six seasons: saved rows that differ from the stored numbers now%') < 1 THEN
    RAISE EXCEPTION 'script 07 should count the accepted change';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'relation' AND granted AND pid = pg_backend_pid()
                    AND relation = 'public.team_season_stats'::regclass AND mode = 'ShareLock') THEN
    RAISE EXCEPTION 'script 07 did not hold a share lock on team_season_stats';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT dt_g12;
RELEASE SAVEPOINT dt_g12;

\set s07order `awk '$0 !~ /^[ \t]*--/ { if ($0 ~ /pg_advisory_xact_lock\(hashtext\(.power_score_weights.\)\)/ && !a) a = NR; if ($0 ~ /LOCK TABLE public\.team_season_stats IN SHARE MODE/ && !l) l = NR; if ($0 ~ /IF to_regclass\(.public\.team_season_stats_pre_division_truth.\) IS NULL THEN/ && !e) e = NR } END { print (a > 0 && l > a && e > l) ? "ok" : "bad" }' supabase/scripts/division_truth_07_drop_backup.sql`
SELECT :'s07order' = 'ok' AS ordered \gset
\if :ordered
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 07 must take the advisory lock, then the table lock, then look for the backup'; END $$;
\endif

-- (a4) a gap of 0.0004 is rounding: the guard lets it through (the drop is rolled back).
SAVEPOINT dt_g4;
UPDATE public.team_season_stats SET power_score = power_score + 0.0004
 WHERE ctid = (SELECT ctid FROM public.team_season_stats
                WHERE season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a' AND power_score IS NOT NULL
                ORDER BY team_id LIMIT 1);
:s07head
;
\o /dev/null
:s07do
;
\o
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NOT NULL THEN
    RAISE EXCEPTION 'script 07 stopped for a gap of 0.0004, which is only rounding';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT dt_g4;
RELEASE SAVEPOINT dt_g4;

-- (a5) a backup table that EXISTS but holds 0 rows: script 06 says "backup table is empty",
--      not "backup retired" (that wording is for a missing table). Normal rows keep their words.
SAVEPOINT dt_g13;
DELETE FROM public.team_season_stats_pre_division_truth;
\o /dev/null
\i supabase/scripts/division_truth_06_checks.sql
\o
CREATE TEMP TABLE dt_06empty AS :l4tail
;
DO $$
DECLARE
  v_n bigint;
BEGIN
  SELECT count(*) INTO v_n FROM dt_06empty
   WHERE check_name IN ('L6b old scores re-derived', 'L6c no changed game, no change',
                        'L6d three newer seasons: who moved', 'L7 records identical to backup')
     AND result = 'INFO' AND (detail LIKE 'backup table is empty%') IS TRUE
     AND (detail LIKE '%retired%') IS NOT TRUE;
  IF v_n IS DISTINCT FROM 4 THEN
    RAISE EXCEPTION 'script 06 with an empty (not missing) backup: L6b, L6c, L6d and L7 should each say INFO, backup table is empty; found % that do', v_n;
  END IF;
END $$;
ROLLBACK TO SAVEPOINT dt_g13;
RELEASE SAVEPOINT dt_g13;
-- With the saved rows back, the same four checks run for real (no "skipped", no "empty").
\o /dev/null
\i supabase/scripts/division_truth_06_checks.sql
\o
CREATE TEMP TABLE dt_06full AS :l4tail
;
DO $$
BEGIN
  IF (SELECT count(*) FROM dt_06full
       WHERE check_name IN ('L6b old scores re-derived', 'L6c no changed game, no change',
                            'L6d three newer seasons: who moved', 'L7 records identical to backup')
         AND ((detail LIKE 'skipped%') IS TRUE OR (detail LIKE 'backup table is empty%') IS TRUE)) IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'script 06 with a normal backup should not skip L6b, L6c, L6d or L7';
  END IF;
  IF (SELECT count(*) FROM dt_06full WHERE check_name LIKE 'L7 %' AND result = 'PASS') IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'script 06 with a normal backup: L7 should PASS';
  END IF;
END $$;
DROP TABLE dt_06full;

-- (b) the real run.
CREATE TEMP TABLE dt_07_before AS
SELECT (SELECT count(*) FROM public.team_season_stats_pre_division_truth) AS saved,
       (SELECT count(*) FROM public.power_score_division_override) AS overrides,
       (SELECT count(*) FROM public.team_season_stats_pre_division_truth
         WHERE season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a') AS saved_spring,
       (SELECT md5(string_agg(s::text, '|' ORDER BY s.season_id, s.team_id)) FROM public.team_season_stats s) AS stats_md5,
       (SELECT md5(string_agg(o::text, '|' ORDER BY o.team_id, o.season_id)) FROM public.power_score_division_override o) AS override_md5,
       md5(pg_get_viewdef('public.v_power_score_team_matches_rated'::regclass)) AS view_md5;
\o /dev/null
\i supabase/scripts/division_truth_07_drop_backup.sql
\o
CREATE TEMP TABLE dt_07a AS :s07tail
;
\o /dev/null
\i supabase/scripts/division_truth_07_drop_backup.sql
\o
CREATE TEMP TABLE dt_07b AS :s07tail
;

DO $$
DECLARE
  b dt_07_before%ROWTYPE;
BEGIN
  SELECT * INTO b FROM dt_07_before;
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NOT NULL THEN
    RAISE EXCEPTION 'script 07 did not drop the backup table';
  END IF;
  IF b.saved < 1 OR b.overrides < 1 THEN
    RAISE EXCEPTION 'the fixture should hold saved rows and override rows, got % and %', b.saved, b.overrides;
  END IF;
  -- Only the backup went: the stored scores, the override rows and the view are the same.
  IF (SELECT md5(string_agg(s::text, '|' ORDER BY s.season_id, s.team_id)) FROM public.team_season_stats s) IS DISTINCT FROM b.stats_md5 THEN
    RAISE EXCEPTION 'script 07 changed team_season_stats';
  END IF;
  IF (SELECT md5(string_agg(o::text, '|' ORDER BY o.team_id, o.season_id)) FROM public.power_score_division_override o) IS DISTINCT FROM b.override_md5 THEN
    RAISE EXCEPTION 'script 07 changed the override rows';
  END IF;
  IF md5(pg_get_viewdef('public.v_power_score_team_matches_rated'::regclass)) IS DISTINCT FROM b.view_md5 THEN
    RAISE EXCEPTION 'script 07 changed the rated view';
  END IF;

  -- The result of the first run: the pre-check lines, the table is gone, the verdict.
  IF (SELECT val FROM dt_07a WHERE what = 'verdict') IS DISTINCT FROM 'OK: backup dropped' THEN
    RAISE EXCEPTION 'script 07, first run: expected OK: backup dropped, got %', (SELECT val FROM dt_07a WHERE what = 'verdict');
  END IF;
  IF (SELECT val FROM dt_07a WHERE what = 'table exists now') IS DISTINCT FROM 'no' THEN
    RAISE EXCEPTION 'script 07, first run: "table exists now" should say no';
  END IF;
  IF (SELECT val FROM dt_07a WHERE what = 'rows saved') IS DISTINCT FROM b.saved::text THEN
    RAISE EXCEPTION 'script 07, "rows saved" should say %, got %', b.saved, (SELECT val FROM dt_07a WHERE what = 'rows saved');
  END IF;
  IF (SELECT val FROM dt_07a WHERE what = 'saved rows in DT Spring 2025') IS DISTINCT FROM b.saved_spring::text THEN
    RAISE EXCEPTION 'script 07, "saved rows in DT Spring 2025" should say %, got %', b.saved_spring,
      (SELECT val FROM dt_07a WHERE what = 'saved rows in DT Spring 2025');
  END IF;
  IF (SELECT count(*) FROM dt_07a WHERE what LIKE 'saved rows in %') IS DISTINCT FROM 6 THEN
    RAISE EXCEPTION 'script 07 should list the saved rows of all six seasons';
  END IF;
  IF (SELECT val FROM dt_07a WHERE what LIKE 'six seasons: stored rows that differ from the rules NOW%') IS DISTINCT FROM '0' THEN
    RAISE EXCEPTION 'script 07, stored rows that differ from the rules NOW should say 0';
  END IF;
  IF (SELECT val::bigint FROM dt_07a WHERE what LIKE 'six seasons: saved rows that differ from the stored numbers now%') IS NULL
     OR (SELECT val::bigint FROM dt_07a WHERE what LIKE 'six seasons: saved rows that differ from the stored numbers now%') < 1 THEN
    RAISE EXCEPTION 'script 07, the accepted change should count at least 1 saved row (the fixture saved empty scores)';
  END IF;
  IF (SELECT val FROM dt_07a WHERE what = 'saved rows with no live row (must be 0)') IS DISTINCT FROM '0' THEN
    RAISE EXCEPTION 'script 07, saved rows with no live row should say 0';
  END IF;
  IF (SELECT val FROM dt_07a WHERE what = 'saved rows whose record differs from the live row (must be 0)') IS DISTINCT FROM '0' THEN
    RAISE EXCEPTION 'script 07, saved rows whose record differs from the live row should say 0';
  END IF;
  IF (SELECT val FROM dt_07a WHERE what = 'rows for seasons outside the six, in the override table (must be 0)') IS DISTINCT FROM '0' THEN
    RAISE EXCEPTION 'script 07, override rows for seasons outside the six should say 0';
  END IF;
  IF (SELECT val FROM dt_07a WHERE what = 'rated view has the override step') IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION 'script 07, the rated view line should say yes';
  END IF;
  IF (SELECT val FROM dt_07a WHERE what LIKE 'override rows%') IS DISTINCT FROM b.overrides::text THEN
    RAISE EXCEPTION 'script 07, override rows should say %, got %', b.overrides, (SELECT val FROM dt_07a WHERE what LIKE 'override rows%');
  END IF;
  IF (SELECT val FROM dt_07a WHERE what = 'taken at (UTC)') IS NULL THEN
    RAISE EXCEPTION 'script 07 should say when the backup was taken';
  END IF;

  -- A second run: no error, and it says so.
  IF ((SELECT val FROM dt_07b WHERE what = 'verdict') LIKE 'already gone%') IS NOT TRUE THEN
    RAISE EXCEPTION 'script 07, second run: expected already gone, got %', (SELECT val FROM dt_07b WHERE what = 'verdict');
  END IF;
  IF (SELECT val FROM dt_07b WHERE what = 'table exists now') IS DISTINCT FROM 'no' THEN
    RAISE EXCEPTION 'script 07, second run: "table exists now" should say no';
  END IF;
END $$;

-- (c) after the drop. Script 06 still runs; the four checks that need the backup are skipped.
\o /dev/null
\i supabase/scripts/division_truth_06_checks.sql
\o
CREATE TEMP TABLE dt_06gone AS :l4tail
;
DO $$
DECLARE
  v_n bigint;
BEGIN
  SELECT count(*) INTO v_n FROM dt_06gone;
  IF v_n IS DISTINCT FROM 12 THEN RAISE EXCEPTION 'script 06 after the drop: expected 12 rows, got %', v_n; END IF;
  SELECT count(*) INTO v_n FROM dt_06gone
   WHERE check_name IN ('L6b old scores re-derived', 'L6c no changed game, no change',
                        'L6d three newer seasons: who moved', 'L7 records identical to backup')
     AND result = 'INFO' AND (detail LIKE 'skipped, backup retired%') IS TRUE;
  IF v_n IS DISTINCT FROM 4 THEN
    RAISE EXCEPTION 'script 06 after the drop: L6b, L6c, L6d and L7 should each say INFO, skipped, backup retired; found % that do', v_n;
  END IF;
  -- L6a does not need the backup: it still checks every team-season of the six seasons.
  SELECT count(*) INTO v_n FROM dt_06gone
   WHERE check_name = 'L6a new scores re-derived' AND result = 'PASS'
     AND (detail LIKE '0 of % team-seasons differ from the live formula applied to the game rows') IS TRUE
     AND (detail LIKE '0 of 0 %') IS NOT TRUE;
  IF v_n IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'script 06 after the drop: L6a should still PASS and count the team-seasons, found % matching rows', v_n;
  END IF;
  -- The checks that never needed the backup are still there.
  SELECT count(*) INTO v_n FROM dt_06gone
   WHERE check_name IN ('L1 solid answers unchanged', 'L2 rows and records unchanged', 'L4 stored vs rules now',
                        'L5 live-season views untouched', 'L8 TypeScript list = SQL rows')
     AND result IN ('PASS', 'INFO', 'FAIL');
  IF v_n IS DISTINCT FROM 5 THEN RAISE EXCEPTION 'script 06 after the drop: L1, L2, L4, L5 and L8 should all be listed'; END IF;
END $$;

-- 03 (preview) STOPs with a plain message.
SAVEPOINT dt_s03;
-- Wipe LAST_ERROR_MESSAGE first, so a message left by an earlier test cannot pass this one.
SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
SELECT 1 / 0;
\o
ROLLBACK TO SAVEPOINT dt_clear;
RELEASE SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
:s03do
;
\o
ROLLBACK TO SAVEPOINT dt_s03;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: the backup table is missing, and this script cannot tell why\. First install \(the backup was never taken\): run script 01 first\. Retired \(script 07 dropped it\): do NOT recreate it; this preview was a one-time step \(see docs/OPERATIONS\.md 6g\)\.$' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 03 did not stop with the "retired" message after the backup was dropped'; END $$;
\endif

-- 02 (data) STOPs with a message that names both reasons: first install (run script 01
-- BEFORE any override row) and retired (do NOT recreate it).
SAVEPOINT dt_s02;
-- Wipe LAST_ERROR_MESSAGE first, so a message left by an earlier test cannot pass this one.
SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
SELECT 1 / 0;
\o
ROLLBACK TO SAVEPOINT dt_clear;
RELEASE SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
:s02do
;
\o
ROLLBACK TO SAVEPOINT dt_s02;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: the backup table is missing, and this script cannot tell why\. First install \(the backup was never taken\): run script 01 BEFORE you write any override row\. Retired \(script 07 dropped it\): do NOT recreate it; script 02 was a one-time job, and later override rows are added by hand \(see docs/OPERATIONS\.md section 6g\)\.$' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 02 did not stop with the "retired" message after the backup was dropped'; END $$;
\endif

-- 02a (dry run) lists a CHECK row for the missing backup, with the same words.
\set dry_gone `cat supabase/scripts/division_truth_02a_dryrun.sql`
CREATE TEMP TABLE dt_dry_gone AS :dry_gone
;
DO $$
BEGIN
  IF (SELECT count(*) FROM dt_dry_gone
       WHERE action = 'CHECK: script 02 would STOP' AND team = 'backup table'
         AND (stored_label LIKE 'the backup table is missing, and this script cannot tell why.%') IS TRUE
         AND (stored_label LIKE '%First install (never taken): run script 01 BEFORE you write any override row.%') IS TRUE
         AND (stored_label LIKE '%Retired (script 07 dropped it): do NOT recreate it;%') IS TRUE) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'the dry run should list one CHECK row for the missing backup, naming both reasons (first install, retired)';
  END IF;
END $$;

ROLLBACK TO SAVEPOINT dt_retire;
RELEASE SAVEPOINT dt_retire;
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    RAISE EXCEPTION 'the savepoint did not bring the backup table back';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Undo. Path 2 saves the rows first, removes them, puts the old view back.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE dt_override_before AS
SELECT team_id, season_id, division_id, reason FROM public.power_score_division_override;

\set s05b `sed "s/TYPE-1-OR-2-HERE/2/" supabase/scripts/division_truth_05_undo.sql`

-- A row for a season outside the six: path 2 must STOP and write nothing.
INSERT INTO public.seasons (id, name, start_date, is_active, is_archived)
VALUES ('00000000-0000-0000-0000-0000000dd0f7', 'DT Seventh 2026', '2026-06-01', false, true);
INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason)
VALUES ('00000000-0000-0000-0000-0000000dd001', '00000000-0000-0000-0000-0000000dd0f7',
        (SELECT id FROM public.divisions WHERE lower(btrim(name)) = 'competitive'),
        'League owner, test: a row outside the six seasons');
CREATE TEMP TABLE dt_before_stop AS SELECT count(*) AS n FROM public.power_score_division_override;
-- Only the first block of the script (the DO block that does the work) runs here, so
-- the STOP is the last error psql sees. psql sends each statement of a variable
-- separately, and a later statement would overwrite LAST_ERROR_MESSAGE.
\set s05b_do `sed "s/TYPE-1-OR-2-HERE/2/" supabase/scripts/division_truth_05_undo.sql | sed -n '/^DO /,/^END .*;$/p'`
SAVEPOINT dt_undo_stop;
\set ON_ERROR_STOP off
\o /dev/null
:s05b_do
;
\o
ROLLBACK TO SAVEPOINT dt_undo_stop;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: the override table holds rows for season\(s\) outside the six: 00000000-0000-0000-0000-0000000dd0f7\.' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'undo path 2 did not stop for a row in a seventh season'; END $$;
\endif
DO $$
BEGIN
  IF (SELECT count(*) FROM public.power_score_division_override) IS DISTINCT FROM (SELECT n FROM dt_before_stop) THEN
    RAISE EXCEPTION 'undo path 2 stopped but still changed the override rows';
  END IF;
  IF to_regclass('public.power_score_division_override_pre_undo') IS NOT NULL THEN
    RAISE EXCEPTION 'undo path 2 stopped but still created the pre_undo table';
  END IF;
  IF position('manual_override' IN pg_get_viewdef('public.v_power_score_team_matches_rated'::regclass)) = 0 THEN
    RAISE EXCEPTION 'undo path 2 stopped but still changed the view';
  END IF;
END $$;
DELETE FROM public.power_score_division_override WHERE season_id = '00000000-0000-0000-0000-0000000dd0f7';
DELETE FROM public.seasons WHERE id = '00000000-0000-0000-0000-0000000dd0f7';

-- Rows only in the six seasons: path 2 works.
\o /dev/null
:s05b
;
\o

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.power_score_division_override) THEN
    RAISE EXCEPTION 'undo path 2 left override rows';
  END IF;
  IF (SELECT count(*) FROM public.power_score_division_override_pre_undo) <> (SELECT count(*) FROM dt_override_before) THEN
    RAISE EXCEPTION 'undo path 2 did not save every override row first';
  END IF;
  IF EXISTS (
    SELECT team_id, season_id, division_id, reason FROM dt_override_before
    EXCEPT
    SELECT team_id, season_id, division_id, reason FROM public.power_score_division_override_pre_undo
  ) THEN
    RAISE EXCEPTION 'the saved copy differs from the override rows';
  END IF;
  IF position('manual_override' IN pg_get_viewdef('public.v_power_score_team_matches_rated'::regclass)) > 0 THEN
    RAISE EXCEPTION 'undo path 2 did not put the old view back';
  END IF;
  IF has_table_privilege('anon', 'public.power_score_division_override_pre_undo', 'SELECT')
     OR has_table_privilege('authenticated', 'public.power_score_division_override_pre_undo', 'SELECT')
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.power_score_division_override_pre_undo'::regclass) THEN
    RAISE EXCEPTION 'the pre_undo table must be locked (row-level security on, no access for anon or signed-in users)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.team_season_stats s
    JOIN public.v_team_season_agg a ON a.season_id = s.season_id AND a.team_id = s.team_id
    WHERE s.season_id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                          'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                          '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca')
      AND (s.power_score IS DISTINCT FROM a.power_score OR s.career_power_score IS DISTINCT FROM a.career_power_score
        OR s.sos IS DISTINCT FROM a.sos)
  ) THEN
    RAISE EXCEPTION 'undo path 2 left a stored score different from the old rules';
  END IF;
END $$;

-- A second path 2 run has nothing to save and adds nothing.
CREATE TEMP TABLE dt_pre_undo_n AS SELECT count(*) AS n FROM public.power_score_division_override_pre_undo;
\o /dev/null
:s05b
;
\o
DO $$
BEGIN
  IF (SELECT count(*) FROM public.power_score_division_override_pre_undo) <> (SELECT n FROM dt_pre_undo_n) THEN
    RAISE EXCEPTION 'a second undo path 2 added rows to the pre_undo table';
  END IF;
END $$;

-- Path 1 puts the saved scores back (the backup holds the scores from before the fix).
\set s05a `sed "s/TYPE-1-OR-2-HERE/1/" supabase/scripts/division_truth_05_undo.sql`
\o /dev/null
:s05a
;
\o
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.team_season_stats s
    JOIN public.team_season_stats_pre_division_truth b ON b.season_id = s.season_id AND b.team_id = s.team_id
    WHERE s.power_score IS DISTINCT FROM b.power_score OR s.career_power_score IS DISTINCT FROM b.career_power_score
       OR s.sos IS DISTINCT FROM b.sos OR s.recorded_at IS DISTINCT FROM b.recorded_at
  ) THEN
    RAISE EXCEPTION 'undo path 1 did not put the saved scores back';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8. A missing dropped-out team and a missing season. The dry run must say
--    "script 02 would STOP", and script 02 must really stop. (Last, because it
--    deletes The Tomato Saucers and Winter 2 2026 from the fixture.)
-- ---------------------------------------------------------------------------
DELETE FROM public.power_score_division_override WHERE season_id = '9cd55eb8-672c-4a43-a9df-3552a7759cca';
DELETE FROM public.team_season_stats WHERE season_id = '9cd55eb8-672c-4a43-a9df-3552a7759cca';
DELETE FROM public.matches_archive WHERE season_id = '9cd55eb8-672c-4a43-a9df-3552a7759cca';
DELETE FROM public.power_score_snapshots WHERE season_id = '9cd55eb8-672c-4a43-a9df-3552a7759cca';
DELETE FROM public.team_season_stats WHERE team_id = 'accd6e20-f761-4769-8cdc-6c9495cc231c';
DELETE FROM public.teams WHERE id = 'accd6e20-f761-4769-8cdc-6c9495cc231c';
DELETE FROM public.seasons WHERE id = '9cd55eb8-672c-4a43-a9df-3552a7759cca';

\set dry3 `cat supabase/scripts/division_truth_02a_dryrun.sql`
CREATE TEMP TABLE dt_dry3 AS :dry3
;

DO $$
DECLARE
  v_n bigint;
BEGIN
  SELECT count(*) INTO v_n FROM dt_dry3
   WHERE action = 'CHECK: script 02 would STOP (a dropped-out team is missing)' AND team = 'The Tomato Saucers'
     AND stored_label LIKE '%accd6e20-f761-4769-8cdc-6c9495cc231c%';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'the dry run should say that The Tomato Saucers is missing, found % rows', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM dt_dry3
   WHERE action = 'CHECK: script 02 would STOP (a season is missing)' AND team = 'Winter 2 2026';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'the dry run should say that Winter 2 2026 is missing, found % rows', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM dt_dry3 WHERE action LIKE 'CHECK:%';
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'the dry run should hold exactly these 2 CHECK rows, found %', v_n;
  END IF;
END $$;

-- Run the first block of script 02 (its guard) inside a savepoint. It must raise
-- "STOP". psql keeps the message in LAST_ERROR_MESSAGE (psql 12 and later). The
-- "ERROR: STOP: ..." lines in the log are those expected errors.
\set guard `sed -n '/^DO /,/^END .*;$/p' supabase/scripts/division_truth_02_data.sql`

-- (a) the team is missing: the guard stops on the team.
SAVEPOINT dt_guard;
\set ON_ERROR_STOP off
\o /dev/null
:guard
;
\o
ROLLBACK TO SAVEPOINT dt_guard;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: only 2 of the 3 dropped-out teams' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 02 did not stop for a missing dropped-out team'; END $$;
\endif

-- (b) the team is back, the season is still missing: the guard stops on the season.
INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses)
VALUES ('accd6e20-f761-4769-8cdc-6c9495cc231c', 'The Tomato Saucers', NULL, 0, 0, 0, 0);
SAVEPOINT dt_guard2;
\set ON_ERROR_STOP off
\o /dev/null
:guard
;
\o
ROLLBACK TO SAVEPOINT dt_guard2;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: only 5 of the 6 seasons' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'script 02 did not stop for a missing season'; END $$;
\endif

-- ---------------------------------------------------------------------------
-- 9. Script 07 retires the backup for real. Undo path 1 then STOPs (it needs the
--    backup) and path 2 must still end in its report (it used to fail on a missing
--    table), and it must undo a correction that is really in the stored numbers.
--    The guard of 07 needs a state it accepts: the override-aware view in place, stored
--    scores equal to the rules, and override rows in place. Sections 7 and 8 left none
--    of them, so build it like the real run did: path 2 once more (old view, override
--    rows gone, six seasons recomputed by the old rules: these are the OLD-RULE scores),
--    put the override rows back with the recipe in the header of script 05, put the
--    override-aware view back (the view part of migration 20261117130000) and recompute
--    the six seasons with script 04. The subject team gets a team-season row first, so a
--    stored score exists that the overrides really change (its opponents are the
--    overridden teams). Rows of seasons and teams that still exist only: section 8
--    deleted one season, so its saved rows leave the backup too.
-- ---------------------------------------------------------------------------
INSERT INTO public.team_season_stats (season_id, team_id, match_wins, match_losses, game_wins, game_losses, division_name)
VALUES ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', '00000000-0000-0000-0000-0000000dd001', 3, 0, 6, 0, 'Competitive')
ON CONFLICT (season_id, team_id) DO NOTHING;
\o /dev/null
:s05b
;
\o
INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason, created_at)
SELECT DISTINCT ON (p.team_id, p.season_id) p.team_id, p.season_id, p.division_id, p.reason, p.created_at
FROM public.power_score_division_override_pre_undo p
WHERE p.season_id IN (SELECT id FROM public.seasons) AND p.team_id IN (SELECT id FROM public.teams)
ORDER BY p.team_id, p.season_id, p.saved_at DESC
ON CONFLICT (team_id, season_id) DO NOTHING;
-- The scores the OLD rules give (path 2 has just recomputed them). The override rows are
-- not back yet.
CREATE TEMP TABLE dt_old_rule_scores AS
SELECT season_id, team_id, power_score, sos, career_power_score FROM public.team_season_stats
 WHERE season_id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                     'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                     '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca');
-- The override-aware view, taken from the migration file, and the six seasons recomputed.
\set s09newview `sed -n '/^CREATE OR REPLACE VIEW public.v_power_score_team_matches_rated/,/^LEFT JOIN public.v_division_rateable dw ON dw.id = r.opp_division_id;$/p' supabase/migrations/20261117130000_power_score_division_override.sql`
:s09newview
;
-- (Winter 2 2026 is gone since section 8, so script 04 would refuse it: five seasons.)
\o /dev/null
:s04r2
;
:s04r3
;
:s04r4
;
:s04r5
;
:s04r6
;
\o
DO $$
BEGIN
  IF position('manual_override' IN pg_get_viewdef('public.v_power_score_team_matches_rated'::regclass, true)) = 0 THEN
    RAISE EXCEPTION 'the override-aware view did not come back';
  END IF;
  -- The correction is in the stored numbers: the subject team's score is not the old-rule score.
  IF NOT EXISTS (
    SELECT 1 FROM public.team_season_stats s
    JOIN dt_old_rule_scores o ON o.season_id = s.season_id AND o.team_id = s.team_id
    WHERE s.team_id = '00000000-0000-0000-0000-0000000dd001'
      AND abs(COALESCE(s.power_score, -1) - COALESCE(o.power_score, -1)) > 0.0006
  ) THEN
    RAISE EXCEPTION 'with the overrides back, the subject team should hold a score that is not the old-rule score';
  END IF;
END $$;
-- Section 8 deleted Winter 2 2026 and its team-seasons. Script 07 refuses to drop a
-- backup that is the only record of them (6c tests that), so take those saved rows out.
DELETE FROM public.team_season_stats_pre_division_truth b
 WHERE NOT EXISTS (SELECT 1 FROM public.team_season_stats s WHERE s.season_id = b.season_id AND s.team_id = b.team_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.power_score_division_override) THEN
    RAISE EXCEPTION 'the override rows did not come back from the pre_undo copy';
  END IF;
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    RAISE EXCEPTION 'the backup table should still be there before script 07 runs';
  END IF;
END $$;

\o /dev/null
\i supabase/scripts/division_truth_07_drop_backup.sql
\o
\set s07tail `sed -n '/^-- ONE result/,$p' supabase/scripts/division_truth_07_drop_backup.sql`
CREATE TEMP TABLE dt_07c AS :s07tail
;
\o /dev/null
\i supabase/scripts/division_truth_07_drop_backup.sql
\o
CREATE TEMP TABLE dt_07d AS :s07tail
;
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NOT NULL THEN
    RAISE EXCEPTION 'script 07 did not drop the backup table';
  END IF;
  IF (SELECT val FROM dt_07c WHERE what = 'verdict') IS DISTINCT FROM 'OK: backup dropped' THEN
    RAISE EXCEPTION 'script 07 (section 9): expected OK: backup dropped, got %', (SELECT val FROM dt_07c WHERE what = 'verdict');
  END IF;
  IF ((SELECT val FROM dt_07d WHERE what = 'verdict') LIKE 'already gone%') IS NOT TRUE THEN
    RAISE EXCEPTION 'script 07 (section 9), second run: expected already gone, got %', (SELECT val FROM dt_07d WHERE what = 'verdict');
  END IF;
END $$;

-- Path 1 STOPs, writing nothing: its UPDATE reads the backup, which is gone.
\set s05a_do `sed "s/TYPE-1-OR-2-HERE/1/" supabase/scripts/division_truth_05_undo.sql | sed -n '/^DO /,/^END .*;$/p'`
SAVEPOINT dt_undo1_gone;
-- Wipe LAST_ERROR_MESSAGE first, so a message left by an earlier test cannot pass this one.
SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
SELECT 1 / 0;
\o
ROLLBACK TO SAVEPOINT dt_clear;
RELEASE SAVEPOINT dt_clear;
\set ON_ERROR_STOP off
\o /dev/null
:s05a_do
;
\o
ROLLBACK TO SAVEPOINT dt_undo1_gone;
\set ON_ERROR_STOP on
SELECT :'LAST_ERROR_MESSAGE' ~ '^STOP: there is no backup table, so path 1 has nothing to restore\. Nothing was changed\.$' AS stopped \gset
\if :stopped
\else
  DO $$ BEGIN RAISE EXCEPTION 'undo path 1 did not stop after the backup table was dropped'; END $$;
\endif

-- Path 2 still works, and its report says the backup is unavailable.
\set s05tail `sed -n '/^-- ONE result/,$p' supabase/scripts/division_truth_05_undo.sql`
\o /dev/null
:s05b
;
\o
CREATE TEMP TABLE dt_rep AS :s05tail
;
DO $$
BEGIN
  -- The correction is undone: every stored score is the old-rule score again, and that
  -- includes the subject team, whose score the overrides had moved.
  IF EXISTS (
    SELECT 1 FROM public.team_season_stats s
    JOIN dt_old_rule_scores o ON o.season_id = s.season_id AND o.team_id = s.team_id
    WHERE s.power_score IS DISTINCT FROM o.power_score OR s.sos IS DISTINCT FROM o.sos
       OR s.career_power_score IS DISTINCT FROM o.career_power_score
  ) THEN
    RAISE EXCEPTION 'undo path 2, after the backup was retired, did not bring the old-rule scores back';
  END IF;
  IF EXISTS (SELECT 1 FROM public.power_score_division_override)
     OR position('manual_override' IN pg_get_viewdef('public.v_power_score_team_matches_rated'::regclass, true)) > 0 THEN
    RAISE EXCEPTION 'undo path 2, after the backup was retired, left override rows or the new view';
  END IF;
  IF (SELECT count(*) FROM dt_rep) < 8 THEN
    RAISE EXCEPTION 'the undo report came back with % rows', (SELECT count(*) FROM dt_rep);
  END IF;
  IF (SELECT val FROM dt_rep WHERE what LIKE 'six seasons: rows that differ from the SAVED BACKUP%')
       IS DISTINCT FROM 'backup unavailable' THEN
    RAISE EXCEPTION 'with no backup table the report should say "backup unavailable"';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'division_truth_scripts smoke test passed'; END $$;

ROLLBACK;
