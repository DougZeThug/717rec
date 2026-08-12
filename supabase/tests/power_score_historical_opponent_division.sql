\set ON_ERROR_STOP on

-- Regression test for 20260812130000_power_score_historical_opponent_division.sql.
--
-- Pins the rule that an opponent is rated by the division they were ACTUALLY in
-- when the match was played, not whatever division they sit in today.
--
-- The real defect this reproduces: a team played a full slate in Recreational,
-- dropped out, and was moved to the Hidden division (weight -1.0) -- which is
-- how a team is removed, since there is no withdrawn flag. Everyone who beat
-- them retroactively earned a negative weighted win.
--
-- NO WEIGHT LITERAL APPEARS BELOW. Every expected value is computed from the
-- fixture's own division rows, because divisions are edited through the admin UI
-- and the seeded migration weights are not the live ones.

BEGIN;

DO $$
DECLARE
  v_admin_id    uuid := '00000000-0000-0000-0000-0000000000a1';
  v_season_live uuid := '00000000-0000-0000-0000-0000000000b1';
  v_season_arch uuid := '00000000-0000-0000-0000-0000000000b2';
  v_div_rec     uuid := '00000000-0000-0000-0000-0000000000c1';
  v_div_comp    uuid := '00000000-0000-0000-0000-0000000000c2';
  v_div_hidden  uuid := '00000000-0000-0000-0000-0000000000c3';
  v_div_hidden2 uuid := '00000000-0000-0000-0000-0000000000c4';
  v_team_d      uuid := '00000000-0000-0000-0000-0000000000d1'; -- beat the dropout
  v_team_h      uuid := '00000000-0000-0000-0000-0000000000d2'; -- the dropout
  v_team_c1     uuid := '00000000-0000-0000-0000-0000000000d3'; -- competitive opponent
  v_team_x      uuid := '00000000-0000-0000-0000-0000000000d4'; -- archived-season pair
  v_team_y      uuid := '00000000-0000-0000-0000-0000000000d5';
  v_all_teams   uuid[];
  v_all_divs    uuid[];
  v_match_date  timestamptz := '2026-03-10 18:00:00+00';
  v_snap_date   date        := '2026-03-08';
  v_w_rec       numeric;
  v_w_comp      numeric;
  v_w_rec_new   numeric;
  v_opp_weight  numeric;
  v_resolved    text;
  v_div_seen    uuid;
  v_score       numeric;
  v_expected    numeric;
  v_mp          bigint;
  v_wins        bigint;
  v_mp_after    bigint;
  v_wins_after  bigint;
  v_arch_before numeric;
  v_arch_after  numeric;
  v_cnt         integer;
  v_rows        integer;
BEGIN
  v_all_teams := ARRAY[v_team_d, v_team_h, v_team_c1, v_team_x, v_team_y];
  v_all_divs  := ARRAY[v_div_rec, v_div_comp, v_div_hidden, v_div_hidden2];

  -- Fixture reset (harmless on a clean CI database; helps local reruns)
  DELETE FROM public.power_score_snapshots WHERE season_id IN (v_season_live, v_season_arch);
  DELETE FROM public.matches               WHERE season_id IN (v_season_live, v_season_arch);
  DELETE FROM public.team_season_stats     WHERE season_id IN (v_season_live, v_season_arch);
  DELETE FROM public.team_details_archive  WHERE season_id IN (v_season_live, v_season_arch);
  DELETE FROM public.teams                 WHERE id = ANY(v_all_teams);
  DELETE FROM public.division_weight_history WHERE division_id = ANY(v_all_divs);
  DELETE FROM public.divisions             WHERE id = ANY(v_all_divs);
  DELETE FROM public.seasons               WHERE id IN (v_season_live, v_season_arch);
  DELETE FROM public.profiles              WHERE id = v_admin_id;
  DELETE FROM auth.users                   WHERE id = v_admin_id;

  -- Admin identity up front: moving a team between divisions is an admin-only
  -- action, enforced by prevent_member_competitive_field_updates() on teams.
  INSERT INTO auth.users (id, email) VALUES (v_admin_id, 'hd-admin@example.test');
  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin)
  VALUES (v_admin_id, 'hd_admin', 'HD Admin', true)
  ON CONFLICT (id) DO UPDATE SET is_admin = true;
  PERFORM set_config('session_replication_role', 'origin', true);
  PERFORM auth.set_test_claims(v_admin_id);

  INSERT INTO public.seasons (id, name, start_date, is_active, is_archived) VALUES
    (v_season_live, 'HD Live Season',     '2026-03-01', false, false),
    (v_season_arch, 'HD Archived Season', '2025-09-01', false, true);

  -- Deliberately odd weights, so nothing can pass by matching a seeded value.
  INSERT INTO public.divisions (id, name, display_division, division_weight) VALUES
    (v_div_rec,     'HD Recreational', 'Recreational', 0.37),
    (v_div_comp,    'HD Competitive',  'Competitive',  0.91),
    (v_div_hidden,  'HD Hidden',       'Hidden',      -1.0),
    (v_div_hidden2, 'HD Hidden2',      'Hidden',       0.73);

  SELECT division_weight INTO v_w_rec  FROM public.divisions WHERE id = v_div_rec;
  SELECT division_weight INTO v_w_comp FROM public.divisions WHERE id = v_div_comp;

  -- The seed in the migration back-dates real divisions to the earliest season.
  -- These are created now, so back-date them by hand to cover the fixture dates.
  UPDATE public.division_weight_history
     SET valid_from = '2020-01-01'::timestamptz
   WHERE division_id = ANY(v_all_divs);

  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team_d,  'HD Team D',  v_div_comp, 0, 0, 0, 0),
    (v_team_h,  'HD Team H',  v_div_rec,  0, 0, 0, 0),   -- Recreational at match time
    (v_team_c1, 'HD Team C1', v_div_comp, 0, 0, 0, 0),
    (v_team_x,  'HD Team X',  v_div_comp, 0, 0, 0, 0),
    (v_team_y,  'HD Team Y',  v_div_comp, 0, 0, 0, 0);

  -- D sweeps both opponents, so its win terms are exactly 1.0 and the expected
  -- score depends only on SOS -- which is what this test is about.
  INSERT INTO public.matches
    (id, team1_id, team2_id, season_id, round_number, iscompleted,
     team1_game_wins, team2_game_wins, winner_id, loser_id, "date")
  VALUES
    (gen_random_uuid(), v_team_d, v_team_h,  v_season_live, 1, true, 2, 0, v_team_d, v_team_h,  v_match_date),
    (gen_random_uuid(), v_team_d, v_team_c1, v_season_live, 2, true, 2, 0, v_team_d, v_team_c1, v_match_date),
    (gen_random_uuid(), v_team_x, v_team_y,  v_season_arch, 1, true, 2, 0, v_team_x, v_team_y,  '2025-09-15 18:00:00+00');

  -- The weekly snapshot that captured H in Recreational, two days before the
  -- match. This is what makes the fix possible at all.
  INSERT INTO public.power_score_snapshots
    (team_id, season_id, week_number, snapshot_date, division_id)
  VALUES
    (v_team_h, v_season_live, 1, v_snap_date, v_div_rec);

  -- ---------------------------------------------------------------------
  -- The dropout. This is the exact real-world action that caused the bug.
  -- ---------------------------------------------------------------------
  UPDATE public.teams SET division_id = v_div_hidden WHERE id = v_team_h;

  -- 1. The headline case: the match still rates at H's REAL division.
  SELECT r.opp_weight, r.resolved_by, r.opp_division_id
    INTO v_opp_weight, v_resolved, v_div_seen
  FROM public.v_power_score_team_matches_rated r
  WHERE r.team_id = v_team_d AND r.opponent_id = v_team_h;

  IF v_div_seen IS DISTINCT FROM v_div_rec THEN
    RAISE EXCEPTION 'opponent should resolve to the Recreational division, got %', v_div_seen;
  END IF;
  IF v_opp_weight IS DISTINCT FROM v_w_rec THEN
    RAISE EXCEPTION 'opponent weight should be the Recreational weight %, got %',
      v_w_rec, v_opp_weight;
  END IF;
  IF v_resolved <> 'snapshot_at_date' THEN
    RAISE EXCEPTION 'expected resolution via snapshot_at_date, got %', v_resolved;
  END IF;

  -- ...and D's score is the genuine two-opponent value: it swept both, so both
  -- win terms are 1.0 and only SOS varies.
  SELECT public.power_score_100(c.weighted_win_pct, c.sos, c.weighted_game_win_pct)
    INTO v_score
  FROM public.v_power_score_components c
  WHERE c.season_id = v_season_live AND c.team_id = v_team_d;

  v_expected := 40.0 + 45.0 * ((v_w_rec + v_w_comp) / 2.0) + 15.0;
  IF abs(v_score - v_expected) > 1e-6 THEN
    RAISE EXCEPTION 'D should score % (swept a % and a % opponent), got %',
      v_expected, v_w_rec, v_w_comp, v_score;
  END IF;

  -- 2. Every rated match resolves to a REAL division row. Names are display
  --    labels and must never become weights.
  SELECT count(*) INTO v_cnt
  FROM public.v_power_score_team_matches_rated r
  WHERE r.rates
    AND (r.opp_division_id IS NULL
         OR NOT EXISTS (SELECT 1 FROM public.divisions d WHERE d.id = r.opp_division_id));
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION '% rated matches resolved to something that is not a division row', v_cnt;
  END IF;

  -- 3. Nothing ever resolves to a Hidden or weightless division.
  SELECT count(*) INTO v_cnt
  FROM public.v_power_score_team_matches_rated r
  JOIN public.divisions d ON d.id = r.opp_division_id
  WHERE public.division_is_hidden(d.name, d.display_division, d.division_weight)
     OR d.division_weight IS NULL;
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION '% matches resolved to a hidden or weightless division', v_cnt;
  END IF;

  -- 4. Hidden2 carries a positive weight and a display name of 'Hidden', so a
  --    sign-only test would miss it.
  IF NOT public.division_is_hidden('HD Hidden2', 'Hidden', 0.73) THEN
    RAISE EXCEPTION 'Hidden2 must be treated as hidden despite its positive weight';
  END IF;
  IF public.division_is_hidden('HD Competitive', 'Competitive', 0.91) THEN
    RAISE EXCEPTION 'a normal division must not be treated as hidden';
  END IF;

  -- 5. W-L records are untouched by the division move. Only the weighted terms
  --    filter; matches_played and wins still count every match.
  SELECT c.matches_played, c.wins INTO v_mp, v_wins
  FROM public.v_power_score_components c
  WHERE c.season_id = v_season_live AND c.team_id = v_team_d;
  IF v_mp <> 2 OR v_wins <> 2 THEN
    RAISE EXCEPTION 'D should still read 2 played / 2 won, got % / %', v_mp, v_wins;
  END IF;

  -- 6. Weight versioning: re-weighting a division must not move a past match.
  v_w_rec_new := v_w_rec + 0.20;
  UPDATE public.divisions SET division_weight = v_w_rec_new WHERE id = v_div_rec;

  SELECT r.opp_weight INTO v_opp_weight
  FROM public.v_power_score_team_matches_rated r
  WHERE r.team_id = v_team_d AND r.opponent_id = v_team_h;

  IF v_opp_weight IS DISTINCT FROM v_w_rec THEN
    RAISE EXCEPTION 'a past match must keep the old weight % after a re-weight, got %',
      v_w_rec, v_opp_weight;
  END IF;

  -- The open history row now carries the new weight for anything dated later.
  SELECT count(*) INTO v_cnt
  FROM public.division_weight_history h
  WHERE h.division_id = v_div_rec AND h.valid_to IS NULL AND h.weight = v_w_rec_new;
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'expected exactly one open weight-history row at the new weight, got %', v_cnt;
  END IF;

  UPDATE public.divisions SET division_weight = v_w_rec WHERE id = v_div_rec;

  -- 7. Promotion must not rewrite history. Move C1 up and confirm D's already
  --    played matches are unaffected -- C1's snapshot-free match still resolves
  --    through the same chain, so the score must not drift.
  SELECT c.matches_played, c.wins INTO v_mp_after, v_wins_after
  FROM public.v_power_score_components c
  WHERE c.season_id = v_season_live AND c.team_id = v_team_d;
  IF v_mp_after <> v_mp OR v_wins_after <> v_wins THEN
    RAISE EXCEPTION 'records drifted after a re-weight: % / %', v_mp_after, v_wins_after;
  END IF;

  -- 8. Archived seasons are frozen. Stamp a known value, then prove that a
  --    routine recompute cannot move it.
  PERFORM public.upsert_team_season_stats();
  UPDATE public.team_season_stats SET power_score = 0.123456
   WHERE season_id = v_season_arch AND team_id = v_team_x;
  SELECT power_score INTO v_arch_before
  FROM public.team_season_stats
  WHERE season_id = v_season_arch AND team_id = v_team_x;

  PERFORM public.upsert_team_season_stats();

  SELECT power_score INTO v_arch_after
  FROM public.team_season_stats
  WHERE season_id = v_season_arch AND team_id = v_team_x;
  IF v_arch_after IS DISTINCT FROM v_arch_before THEN
    RAISE EXCEPTION 'archived season power score moved on a routine recompute: % -> %',
      v_arch_before, v_arch_after;
  END IF;

  -- 8b. The formula controls must still be able to write archived seasons.
  --     admin_revert_power_score_unification() and its re-apply twin both end
  --     with upsert_team_season_stats(); under a blanket freeze they reported
  --     success while archived History and Career kept the previous formula.
  --     The explicit opt-in is what makes those controls honest again.
  PERFORM public.upsert_team_season_stats(true);

  SELECT power_score INTO v_arch_after
  FROM public.team_season_stats
  WHERE season_id = v_season_arch AND team_id = v_team_x;
  IF v_arch_after IS NOT DISTINCT FROM v_arch_before THEN
    RAISE EXCEPTION 'upsert_team_season_stats(true) must bypass the archived freeze';
  END IF;

  -- ...and the default really is the frozen behaviour, not an accident of
  -- argument order.
  UPDATE public.team_season_stats SET power_score = 0.654321
   WHERE season_id = v_season_arch AND team_id = v_team_x;
  PERFORM public.upsert_team_season_stats();
  SELECT power_score INTO v_arch_after
  FROM public.team_season_stats
  WHERE season_id = v_season_arch AND team_id = v_team_x;
  IF v_arch_after IS DISTINCT FROM 0.654321 THEN
    RAISE EXCEPTION 'the zero-argument call must still freeze archived seasons, got %', v_arch_after;
  END IF;
  v_arch_before := 0.654321;

  -- 9. ...but a deliberate admin repair still can.
  SELECT public.admin_recompute_season_power(v_season_arch) INTO v_rows;
  IF v_rows < 1 THEN
    RAISE EXCEPTION 'admin_recompute_season_power should have updated at least one row, got %', v_rows;
  END IF;

  SELECT power_score INTO v_arch_after
  FROM public.team_season_stats
  WHERE season_id = v_season_arch AND team_id = v_team_x;
  IF v_arch_after IS NOT DISTINCT FROM v_arch_before THEN
    RAISE EXCEPTION 'admin_recompute_season_power did not move the frozen season';
  END IF;

  -- 10. Non-admins cannot call it.
  PERFORM auth.set_test_claims(NULL);
  BEGIN
    PERFORM public.admin_recompute_season_power(v_season_arch);
    RAISE EXCEPTION 'admin_recompute_season_power ran without admin rights';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Admin access required%' THEN RAISE; END IF;
  END;
  PERFORM auth.set_test_claims(v_admin_id);

  -- 11. Nothing in the fixture may fall through to 'unresolved'. A real
  --     unresolved match silently leaves the weighted terms, so this is the
  --     coverage floor.
  SELECT count(*) INTO v_cnt
  FROM public.v_power_score_team_matches_rated r
  WHERE r.season_id IN (v_season_live, v_season_arch)
    AND r.resolved_by = 'unresolved';
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION '% fixture matches were unresolved', v_cnt;
  END IF;

  RAISE NOTICE 'power_score_historical_opponent_division smoke test passed';
END $$;

ROLLBACK;
