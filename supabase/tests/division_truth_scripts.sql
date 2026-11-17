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
--      second run changes 0, and no other column of team_season_stats moves.
--   8. Script 05 path 2 copies the override rows to power_score_division_override_pre_undo
--      BEFORE it deletes them, and a second run adds nothing; path 1 puts the saved
--      scores back.
--
-- The fixture gives the six map divisions their own odd weights, so nothing depends
-- on the live weights.

BEGIN;

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
-- 7. Undo. Path 2 saves the rows first, removes them, puts the old view back.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE dt_override_before AS
SELECT team_id, season_id, division_id, reason FROM public.power_score_division_override;

\set s05b `sed "s/TYPE-1-OR-2-HERE/2/" supabase/scripts/division_truth_05_undo.sql`
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
  RAISE NOTICE 'division_truth_scripts smoke test passed';
END $$;

ROLLBACK;
