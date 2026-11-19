\set ON_ERROR_STOP on

-- Regression test for 20261117130000_power_score_division_override.sql.
--
-- Pins the rule: an opponent can be pinned to the division it had in ONE
-- season (power_score_division_override), and a game against it is then rated by
-- that division. Nothing else about the view changes.
--
-- What it proves, in league terms:
--   1. With NO override rows the view is byte-for-byte the old view (md5 of every
--      column of every row, against the old body copied from 20261003183939).
--   2. An override changes the opponent division and weight of that team-season's
--      games only. Who won, the games, the date and the row count stay.
--   3. It beats the weekly snapshot, the archive and the current division, and it
--      rates a game against a team that sits in Hidden now (the real case: a team
--      that dropped out, 7 games in the live database).
--   4. An override to a Hidden or an unweighted division is ignored.
--   5. The same team in another season, and every other team, is unchanged.
--   6. Public roles can read rateable override keys and the view, but not notes
--      or entry times. RLS is on and the invoker view keeps its 14 columns.
--   7. The Sandbox save (upsert_team_season_stats(true)) keeps the override
--      numbers, and a second run changes nothing. A routine run leaves an
--      archived season alone.
--   8. A score entered and then corrected (to a tie) keeps its override.
--   9. A division an override uses cannot be deleted; reason cannot be NULL, empty or
--      blank (spaces only).
--
-- NO REAL WEIGHT APPEARS BELOW. The fixture divisions carry odd weights (0.40,
-- 0.65, 0.90) and every expected number is worked out from them by hand, then fed
-- to the live power_score_100(), so the test holds for any Power Score weights.
--
-- Hand arithmetic, Team X in the old season (it beat P 2-0 and lost to Q 1-2):
--   P is in Low (0.40) today. The override says High (0.90). Q is Mid (0.65).
--   before  win term  0.40 / (0.40 + 0.65)                 = 0.380952...
--           SOS       (0.40 + 0.65) / 2                    = 0.525
--           game term (2*0.40 + 1*0.65) / (2*0.40 + 3*0.65) = 1.45 / 2.75
--   after   win term  0.90 / (0.90 + 0.65)                 = 0.580645...
--           SOS       (0.90 + 0.65) / 2                    = 0.775
--           game term (2*0.90 + 1*0.65) / (2*0.90 + 3*0.65) = 2.45 / 3.75

BEGIN;

DO $$
DECLARE
  v_season_a   uuid := '00000000-0000-0000-0000-0000000dc001'; -- old, archived
  v_season_c   uuid := '00000000-0000-0000-0000-0000000dc002'; -- another season
  v_div_lo     uuid := '00000000-0000-0000-0000-0000000dc011'; -- 0.40
  v_div_mid    uuid := '00000000-0000-0000-0000-0000000dc012'; -- 0.65
  v_div_hi     uuid := '00000000-0000-0000-0000-0000000dc013'; -- 0.90
  v_div_hid    uuid := '00000000-0000-0000-0000-0000000dc014'; -- Hidden (display name)
  v_div_nul    uuid := '00000000-0000-0000-0000-0000000dc015'; -- no weight
  v_div_spare  uuid := '00000000-0000-0000-0000-0000000dc016'; -- used by no team
  v_div_ret    uuid := '00000000-0000-0000-0000-0000000dc017'; -- weight edited since the games
  v_team_x     uuid := '00000000-0000-0000-0000-0000000dc021'; -- plays P and Q
  v_team_k     uuid := '00000000-0000-0000-0000-0000000dc022'; -- plays S, A, H, W, Z
  v_team_p     uuid := '00000000-0000-0000-0000-0000000dc031'; -- Low today, no other answer
  v_team_q     uuid := '00000000-0000-0000-0000-0000000dc032'; -- Mid today, no override
  v_team_s     uuid := '00000000-0000-0000-0000-0000000dc033'; -- weekly snapshot says Mid
  v_team_ar    uuid := '00000000-0000-0000-0000-0000000dc034'; -- archive says Mid
  v_team_h     uuid := '00000000-0000-0000-0000-0000000dc035'; -- Hidden today (dropped out)
  v_team_w     uuid := '00000000-0000-0000-0000-0000000dc036'; -- override to unweighted: ignored
  v_team_z     uuid := '00000000-0000-0000-0000-0000000dc037'; -- override to Hidden: ignored
  v_team_g     uuid := '00000000-0000-0000-0000-0000000dc038'; -- throwaway, for the cascade
  v_team_m     uuid := '00000000-0000-0000-0000-0000000dc023'; -- plays T1 to T5
  v_team_t1    uuid := '00000000-0000-0000-0000-0000000dc051'; -- snapshot AFTER the game
  v_team_t2    uuid := '00000000-0000-0000-0000-0000000dc052'; -- in a bracket
  v_team_t3    uuid := '00000000-0000-0000-0000-0000000dc053'; -- division history row
  v_team_t4    uuid := '00000000-0000-0000-0000-0000000dc054'; -- only a snapshot in another season
  v_team_t5    uuid := '00000000-0000-0000-0000-0000000dc055'; -- override to a re-weighted division
  v_bracket    uuid := '00000000-0000-0000-0000-0000000dc061';
  v_match_h    uuid := '00000000-0000-0000-0000-0000000dc041'; -- K v H
  v_all_teams  uuid[];
  v_all_divs   uuid[];
  v_all_seas   uuid[];
  v_w_lo       numeric;
  v_w_mid      numeric;
  v_w_hi       numeric;
  v_w_ret_then numeric;
  v_n          bigint;
  v_n2         bigint;
  v_n3         bigint;
  v_md5_old    text;
  v_md5_new    text;
  v_text       text;
  v_text2      text;
  v_num        numeric;
  v_num2       numeric;
  v_num3       numeric;
  v_exp        numeric;
  v_stored_old numeric;
  v_stored_mid numeric;
  v_cols_old   text;
  v_cols_new   text;
  v_con        text;
  v_win        boolean;
  v_loss       boolean;
  v_gw         integer;
  v_gl         integer;
  v_rows       integer;
  v_div_seen   uuid;
  v_wt_seen    numeric;
  v_by_seen    text;
  v_rel        record;
  v_role       text;
BEGIN
  v_all_teams := ARRAY[v_team_x, v_team_k, v_team_p, v_team_q, v_team_s, v_team_ar,
                       v_team_h, v_team_w, v_team_z, v_team_g, v_team_m,
                       v_team_t1, v_team_t2, v_team_t3, v_team_t4, v_team_t5];
  v_all_divs  := ARRAY[v_div_lo, v_div_mid, v_div_hi, v_div_hid, v_div_nul, v_div_spare, v_div_ret];
  v_all_seas  := ARRAY[v_season_a, v_season_c];

  IF EXISTS (SELECT 1 FROM public.power_score_division_override) THEN
    RAISE EXCEPTION 'this test needs an EMPTY power_score_division_override: run it on a throwaway database';
  END IF;

  -- Fixture reset (harmless on a clean CI database; helps local reruns)
  DELETE FROM public.power_score_snapshots   WHERE season_id = ANY(v_all_seas);
  DELETE FROM public.matches                 WHERE season_id = ANY(v_all_seas);
  DELETE FROM public.team_season_stats       WHERE season_id = ANY(v_all_seas);
  DELETE FROM public.team_details_archive    WHERE season_id = ANY(v_all_seas);
  DELETE FROM public.participants            WHERE bracket_id = v_bracket;
  DELETE FROM public.brackets                WHERE id = v_bracket;
  DELETE FROM public.teams                   WHERE id = ANY(v_all_teams);
  DELETE FROM public.division_weight_history WHERE division_id = ANY(v_all_divs);
  DELETE FROM public.divisions               WHERE id = ANY(v_all_divs);
  DELETE FROM public.seasons                 WHERE id = ANY(v_all_seas);

  INSERT INTO public.seasons (id, name, start_date, is_active, is_archived) VALUES
    (v_season_a, 'DO Old Season',   '2025-03-03', false, true),
    (v_season_c, 'DO Other Season', '2026-03-02', false, false);

  -- Deliberately odd weights, so nothing can pass by matching a seeded value.
  INSERT INTO public.divisions (id, name, display_division, division_weight) VALUES
    (v_div_lo,    'DO Low',        'Recreational', 0.40),
    (v_div_mid,   'DO Mid',        'Intermediate', 0.65),
    (v_div_hi,    'DO High',       'Competitive',  0.90),
    (v_div_hid,   'DO Dropped',    'Hidden',       0.55),
    (v_div_nul,   'DO Unweighted', 'Recreational', NULL),
    (v_div_spare, 'DO Spare',      'Recreational', 0.77),
    (v_div_ret,   'DO Retuned',    'Intermediate', 0.50);

  SELECT division_weight INTO v_w_lo  FROM public.divisions WHERE id = v_div_lo;
  SELECT division_weight INTO v_w_mid FROM public.divisions WHERE id = v_div_mid;
  SELECT division_weight INTO v_w_hi  FROM public.divisions WHERE id = v_div_hi;

  -- The weight history is stamped now(); back-date it past every fixture date.
  UPDATE public.division_weight_history
     SET valid_from = '2020-01-01'::timestamptz
   WHERE division_id = ANY(v_all_divs);

  -- DO Retuned was re-weighted AFTER the fixture games (the trigger stamps the
  -- new weight from now on): a game back then still rates at the old weight.
  v_w_ret_then := 0.50;
  UPDATE public.divisions SET division_weight = 0.30 WHERE id = v_div_ret;

  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team_x,  'DO Team X', v_div_mid, 0, 0, 0, 0),
    (v_team_k,  'DO Team K', v_div_mid, 0, 0, 0, 0),
    (v_team_p,  'DO Opp P',  v_div_lo,  0, 0, 0, 0),
    (v_team_q,  'DO Opp Q',  v_div_mid, 0, 0, 0, 0),
    (v_team_s,  'DO Opp S',  v_div_lo,  0, 0, 0, 0),
    (v_team_ar, 'DO Opp A',  v_div_lo,  0, 0, 0, 0),
    (v_team_h,  'DO Opp H',  v_div_hid, 0, 0, 0, 0),
    (v_team_w,  'DO Opp W',  v_div_lo,  0, 0, 0, 0),
    (v_team_z,  'DO Opp Z',  v_div_lo,  0, 0, 0, 0),
    (v_team_g,  'DO Opp G',  v_div_lo,  0, 0, 0, 0),
    (v_team_m,  'DO Team M', v_div_mid, 0, 0, 0, 0),
    (v_team_t1, 'DO Opp T1', v_div_lo,  0, 0, 0, 0),
    (v_team_t2, 'DO Opp T2', v_div_hid, 0, 0, 0, 0),
    (v_team_t3, 'DO Opp T3', v_div_hid, 0, 0, 0, 0),
    (v_team_t4, 'DO Opp T4', v_div_hid, 0, 0, 0, 0),
    (v_team_t5, 'DO Opp T5', v_div_lo,  0, 0, 0, 0);

  INSERT INTO public.matches
    (id, team1_id, team2_id, season_id, round_number, iscompleted,
     team1_game_wins, team2_game_wins, winner_id, loser_id, "date")
  VALUES
    -- Team X: beat P 2-0, lost to Q 1-2 (the hand arithmetic above)
    (gen_random_uuid(), v_team_x, v_team_p, v_season_a, 1, true, 2, 0, v_team_x, v_team_p, '2025-03-10 18:00:00+00'),
    (gen_random_uuid(), v_team_x, v_team_q, v_season_a, 2, true, 1, 2, v_team_q, v_team_x, '2025-03-17 18:00:00+00'),
    -- Team K: one opponent for every way the old view could answer
    (gen_random_uuid(), v_team_k, v_team_s,  v_season_a, 3, true, 2, 0, v_team_k, v_team_s,  '2025-03-24 18:00:00+00'),
    (gen_random_uuid(), v_team_k, v_team_ar, v_season_a, 4, true, 1, 2, v_team_ar, v_team_k, '2025-03-31 18:00:00+00'),
    (v_match_h,         v_team_k, v_team_h,  v_season_a, 5, true, 2, 0, v_team_k, v_team_h,  '2025-04-07 18:00:00+00'),
    (gen_random_uuid(), v_team_k, v_team_w,  v_season_a, 6, true, 2, 1, v_team_k, v_team_w,  '2025-04-14 18:00:00+00'),
    (gen_random_uuid(), v_team_k, v_team_z,  v_season_a, 7, true, 0, 2, v_team_z, v_team_k,  '2025-04-21 18:00:00+00'),
    -- Team M: one opponent for each of the other old steps, and a re-weighted division
    (gen_random_uuid(), v_team_m, v_team_t1, v_season_a, 8,  true, 2, 0, v_team_m, v_team_t1, '2025-05-05 18:00:00+00'),
    (gen_random_uuid(), v_team_m, v_team_t2, v_season_a, 9,  true, 2, 0, v_team_m, v_team_t2, '2025-05-12 18:00:00+00'),
    (gen_random_uuid(), v_team_m, v_team_t3, v_season_a, 10, true, 2, 0, v_team_m, v_team_t3, '2025-05-19 18:00:00+00'),
    (gen_random_uuid(), v_team_m, v_team_t4, v_season_a, 11, true, 2, 0, v_team_m, v_team_t4, '2025-05-26 18:00:00+00'),
    (gen_random_uuid(), v_team_m, v_team_t5, v_season_a, 12, true, 2, 0, v_team_m, v_team_t5, '2025-06-02 18:00:00+00'),
    -- The same P in ANOTHER season: an override for (P, old season) must not reach it
    (gen_random_uuid(), v_team_x, v_team_p, v_season_c, 1, true, 2, 0, v_team_x, v_team_p, '2026-03-10 18:00:00+00');

  -- S: a weekly snapshot two days before the match says Mid.
  INSERT INTO public.power_score_snapshots (team_id, season_id, week_number, snapshot_date, division_id)
  VALUES (v_team_s, v_season_a, 1, '2025-03-22', v_div_mid);

  -- T1: its only snapshot is AFTER the game: the earliest one in the season is used.
  -- T4: its only snapshot is in ANOTHER season: the last division ever seen is used.
  INSERT INTO public.power_score_snapshots (team_id, season_id, week_number, snapshot_date, division_id)
  VALUES (v_team_t1, v_season_a, 1, '2025-06-30', v_div_mid),
         (v_team_t4, v_season_c, 1, '2026-03-09', v_div_mid);

  -- T2: seen in a playoff bracket of the old season (Mid). T3: the division it
  -- had until it was moved, saved by the division-history trigger (Mid).
  INSERT INTO public.brackets (id, title, format, state, division_id, season_id)
  VALUES (v_bracket, 'DO bracket', 'Single Elimination', 'complete', v_div_mid, v_season_a);
  INSERT INTO public.participants (bracket_id, team_id) VALUES (v_bracket, v_team_t2);
  INSERT INTO public.team_division_history (team_id, division_id, changed_at)
  VALUES (v_team_t3, v_div_mid, '2025-12-01 12:00:00+00');

  -- A: the archive says Mid and its frozen name agrees with it.
  INSERT INTO public.team_details_archive (team_id, season_id, division_id, divisionname)
  VALUES (v_team_ar, v_season_a, v_div_mid, 'Intermediate');

  -- The old view body, copied verbatim from 20261003183939, as a temp view: the
  -- yardstick for "an empty table changes nothing".
  CREATE TEMP VIEW dt_old_rated WITH (security_invoker = on) AS
  WITH resolved AS (
    SELECT tm.match_id, tm.season_id, tm.source, tm.team_id, tm.opponent_id,
      tm.is_win, tm.is_loss, tm.game_wins, tm.game_losses, tm.match_date,
      COALESCE(snap.division_id, tda_id.id, brk.division_id, hist.division_id, dcur.division_id, lastk.division_id) AS opp_division_id,
      CASE
        WHEN snap.division_id IS NOT NULL AND snap.at_or_before THEN 'snapshot_at_date'
        WHEN snap.division_id IS NOT NULL THEN 'snapshot_earliest_in_season'
        WHEN tda_id.id IS NOT NULL THEN 'archive_division_id'
        WHEN brk.division_id IS NOT NULL THEN 'bracket_division_id'
        WHEN hist.division_id IS NOT NULL THEN 'division_history'
        WHEN dcur.division_id IS NOT NULL THEN 'current_division'
        WHEN lastk.division_id IS NOT NULL THEN 'last_known_division'
        ELSE 'unresolved'
      END AS resolved_by
    FROM public.v_power_score_team_matches tm
    LEFT JOIN LATERAL (
      SELECT dr.id AS division_id,
        (s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date)) AS at_or_before
      FROM public.power_score_snapshots s
      JOIN public.v_division_rateable dr ON dr.id = s.division_id
      WHERE s.team_id = tm.opponent_id AND s.season_id = tm.season_id
      ORDER BY (s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date)) DESC,
        CASE WHEN s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date) THEN s.snapshot_date END DESC NULLS LAST,
        s.snapshot_date
      LIMIT 1) snap ON true
    LEFT JOIN public.team_details_archive tda ON tda.team_id = tm.opponent_id AND tda.season_id = tm.season_id
      AND NOT EXISTS (SELECT 1 FROM public.division_archive_distrust dd WHERE dd.season_id = tda.season_id)
    LEFT JOIN public.v_division_rateable tda_id ON tda_id.id = tda.division_id
      AND (tda.divisionname IS NULL
        OR lower(btrim(tda_id.display_division)) = lower(btrim(tda.divisionname))
        OR lower(btrim(tda_id.name)) = lower(btrim(tda.divisionname)))
    LEFT JOIN LATERAL (
      SELECT dr.id AS division_id
      FROM public.participants p
      JOIN public.brackets b ON b.id = p.bracket_id
      JOIN public.v_division_rateable dr ON dr.id = b.division_id
      WHERE p.team_id = tm.opponent_id AND b.season_id = tm.season_id
      ORDER BY b.created_at, b.id LIMIT 1) brk ON true
    LEFT JOIN LATERAL (
      SELECT h.division_id
      FROM public.team_division_history h
      JOIN public.v_division_rateable dr ON dr.id = h.division_id
      WHERE h.team_id = tm.opponent_id AND h.changed_at > COALESCE(tm.match_date, now())
      ORDER BY h.changed_at LIMIT 1) hist ON true
    LEFT JOIN public.v_team_current_division dcur ON dcur.team_id = tm.opponent_id
    LEFT JOIN public.v_team_last_known_division lastk ON lastk.team_id = tm.opponent_id
  )
  SELECT r.match_id, r.season_id, r.source, r.team_id, r.opponent_id, r.is_win, r.is_loss,
    r.game_wins, r.game_losses, r.match_date, r.opp_division_id,
    COALESCE(wh.weight, dw.division_weight) AS opp_weight,
    (COALESCE(wh.weight, dw.division_weight) IS NOT NULL) AS rates,
    r.resolved_by
  FROM resolved r
  LEFT JOIN LATERAL (
    SELECT h.weight FROM public.division_weight_history h
    WHERE h.division_id = r.opp_division_id AND h.valid_from <= COALESCE(r.match_date, now())
    ORDER BY h.valid_from DESC LIMIT 1) wh ON true
  LEFT JOIN public.v_division_rateable dw ON dw.id = r.opp_division_id;

  -- ---------------------------------------------------------------------
  -- 1. EMPTY TABLE: the new view is the old view. Every column of every row,
  --    seeded league data included.
  -- ---------------------------------------------------------------------
  SELECT count(*), md5(string_agg(x::text, '|' ORDER BY x::text)) INTO v_n, v_md5_old
  FROM dt_old_rated x;
  SELECT count(*), md5(string_agg(x::text, '|' ORDER BY x::text)) INTO v_n2, v_md5_new
  FROM public.v_power_score_team_matches_rated x;

  SELECT count(*) INTO v_rows FROM dt_old_rated WHERE season_id = ANY(v_all_seas);
  IF v_rows IS DISTINCT FROM 26 THEN
    RAISE EXCEPTION 'the fixture should give 26 view rows (13 matches, 2 sides each), got %', v_rows;
  END IF;
  IF v_n2 IS DISTINCT FROM v_n THEN
    RAISE EXCEPTION 'empty table: row count changed % -> %', v_n, v_n2;
  END IF;
  IF v_md5_new IS DISTINCT FROM v_md5_old THEN
    RAISE EXCEPTION 'empty table: the new view is not identical to the old view (md5 % vs %)',
      v_md5_new, v_md5_old;
  END IF;

  -- The fixture really does reach all 8 old answers (otherwise "identical"
  -- proves little), and the re-weighted division rates at its OLD weight.
  SELECT count(DISTINCT resolved_by) INTO v_n
  FROM dt_old_rated
  WHERE season_id = v_season_a AND resolved_by IN (
    'snapshot_at_date', 'snapshot_earliest_in_season', 'archive_division_id',
    'bracket_division_id', 'division_history', 'current_division',
    'last_known_division', 'unresolved');
  IF v_n IS DISTINCT FROM 8 THEN
    RAISE EXCEPTION 'the fixture should reach all 8 old answers, reached %', v_n;
  END IF;
  IF EXISTS (SELECT 1 FROM public.v_power_score_team_matches_rated WHERE resolved_by = 'manual_override') THEN
    RAISE EXCEPTION 'an empty table must never give manual_override';
  END IF;

  -- Old-rule numbers into the stored rows (Sandbox-save path), for step 7.
  PERFORM public.upsert_team_season_stats(true);
  SELECT power_score INTO STRICT v_stored_old
  FROM public.team_season_stats WHERE season_id = v_season_a AND team_id = v_team_x;
  SELECT public.power_score_100(v_w_lo / (v_w_lo + v_w_mid),
                                (v_w_lo + v_w_mid) / 2,
                                (2 * v_w_lo + v_w_mid) / (2 * v_w_lo + 3 * v_w_mid)) / 100.0
    INTO v_exp;
  IF NOT COALESCE(abs(v_stored_old - v_exp) <= 1e-9, false) THEN
    RAISE EXCEPTION 'Team X old-rule score should be % (by hand), got %', v_exp, v_stored_old;
  END IF;

  -- ---------------------------------------------------------------------
  -- 2. One override: P was High in the old season (it is Low today).
  -- ---------------------------------------------------------------------
  INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason)
  VALUES (v_team_p, v_season_a, v_div_hi, 'test: P was High in the old season');

  SELECT resolved_by, opp_division_id, opp_weight INTO STRICT v_by_seen, v_div_seen, v_wt_seen
  FROM public.v_power_score_team_matches_rated
  WHERE season_id = v_season_a AND team_id = v_team_x AND opponent_id = v_team_p;
  IF v_by_seen IS DISTINCT FROM 'manual_override' OR v_div_seen IS DISTINCT FROM v_div_hi OR v_wt_seen IS DISTINCT FROM v_w_hi THEN
    RAISE EXCEPTION 'P override: expected manual_override / High / %, got % / % / %',
      v_w_hi, v_by_seen, v_div_seen, v_wt_seen;
  END IF;

  -- Who won, the games and the date are the old row's, and so is the row count.
  SELECT count(*) INTO v_n FROM public.v_power_score_team_matches_rated;
  SELECT count(*) INTO v_n2 FROM dt_old_rated;
  IF v_n IS DISTINCT FROM v_n2 THEN
    RAISE EXCEPTION 'an override must not add or drop a row: % vs %', v_n2, v_n;
  END IF;
  SELECT count(*) INTO v_n
  FROM public.v_power_score_team_matches_rated nw
  JOIN dt_old_rated od USING (match_id, team_id)
  WHERE nw.season_id = v_season_a AND nw.opponent_id = v_team_p
    AND (nw.season_id, nw.source, nw.opponent_id, nw.is_win, nw.is_loss,
         nw.game_wins, nw.game_losses, nw.match_date)
        IS NOT DISTINCT FROM
        (od.season_id, od.source, od.opponent_id, od.is_win, od.is_loss,
         od.game_wins, od.game_losses, od.match_date);
  IF v_n IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P override: the row of Team X v P should keep winner, games and date, % did', v_n;
  END IF;

  -- Every other row is byte-identical to the old view.
  SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) INTO v_md5_old
  FROM dt_old_rated x WHERE NOT (x.opponent_id = v_team_p AND x.season_id = v_season_a);
  SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) INTO v_md5_new
  FROM public.v_power_score_team_matches_rated x
  WHERE NOT (x.opponent_id = v_team_p AND x.season_id = v_season_a);
  IF v_md5_new IS DISTINCT FROM v_md5_old THEN
    RAISE EXCEPTION 'an override for (P, old season) moved a row of another team-season';
  END IF;

  -- 3. The score moves by the hand-worked amount. W-L does not move.
  SELECT public.power_score_100(c.weighted_win_pct, c.sos, c.weighted_game_win_pct) / 100.0, c.sos
    INTO STRICT v_num, v_num2
  FROM public.v_power_score_components c
  WHERE c.season_id = v_season_a AND c.team_id = v_team_x;
  SELECT public.power_score_100(v_w_hi / (v_w_hi + v_w_mid),
                                (v_w_hi + v_w_mid) / 2,
                                (2 * v_w_hi + v_w_mid) / (2 * v_w_hi + 3 * v_w_mid)) / 100.0
    INTO v_exp;
  SELECT power_score INTO STRICT v_num3
  FROM public.v_team_season_agg WHERE season_id = v_season_a AND team_id = v_team_x;
  IF NOT COALESCE(abs(v_num - v_exp) <= 1e-9 AND abs(v_num3 - v_exp) <= 1e-9, false) THEN
    RAISE EXCEPTION 'Team X after the override should score % (by hand), got % and %', v_exp, v_num, v_num3;
  END IF;
  IF NOT COALESCE(v_exp > v_stored_old, false) THEN
    RAISE EXCEPTION 'the override should lift Team X (Low -> High opponent): % -> %', v_stored_old, v_exp;
  END IF;
  IF NOT COALESCE(abs(v_num2 - (v_w_hi + v_w_mid) / 2) <= 1e-9, false) THEN
    RAISE EXCEPTION 'Team X SOS should be (High + Mid) / 2, got %', v_num2;
  END IF;
  SELECT c.matches_played, c.wins, c.losses INTO STRICT v_n, v_n2, v_n3
  FROM public.v_power_score_components c
  WHERE c.season_id = v_season_a AND c.team_id = v_team_x;
  IF v_n IS DISTINCT FROM 2 OR v_n2 IS DISTINCT FROM 1 OR v_n3 IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Team X should still read 2 played, 1-1, got % played, %-%', v_n, v_n2, v_n3;
  END IF;

  -- 4. The same P in ANOTHER season is not pinned.
  SELECT resolved_by, opp_weight INTO STRICT v_by_seen, v_wt_seen
  FROM public.v_power_score_team_matches_rated
  WHERE season_id = v_season_c AND opponent_id = v_team_p;
  IF v_by_seen IS DISTINCT FROM 'current_division' OR v_wt_seen IS DISTINCT FROM v_w_lo THEN
    RAISE EXCEPTION 'P in the other season must stay current_division / Low, got % / %', v_by_seen, v_wt_seen;
  END IF;
  -- ...and Q (no override row) in the old season is unchanged.
  SELECT resolved_by, opp_weight INTO STRICT v_by_seen, v_wt_seen
  FROM public.v_power_score_team_matches_rated
  WHERE season_id = v_season_a AND opponent_id = v_team_q;
  IF v_by_seen IS DISTINCT FROM 'current_division' OR v_wt_seen IS DISTINCT FROM v_w_mid THEN
    RAISE EXCEPTION 'Q (no override) must stay current_division / Mid, got % / %', v_by_seen, v_wt_seen;
  END IF;

  -- ---------------------------------------------------------------------
  -- 5. The override beats the snapshot, the archive and "no answer at all"
  --    (H sits in Hidden today: the real dropped-out team).
  -- ---------------------------------------------------------------------
  SELECT resolved_by INTO STRICT v_text FROM dt_old_rated
  WHERE season_id = v_season_a AND opponent_id = v_team_s;
  SELECT resolved_by INTO STRICT v_text2 FROM dt_old_rated
  WHERE season_id = v_season_a AND opponent_id = v_team_ar;
  IF v_text IS DISTINCT FROM 'snapshot_at_date' OR v_text2 IS DISTINCT FROM 'archive_division_id' THEN
    RAISE EXCEPTION 'fixture: S should be snapshot_at_date and A archive_division_id, got % and %', v_text, v_text2;
  END IF;
  SELECT resolved_by INTO STRICT v_text FROM dt_old_rated
  WHERE season_id = v_season_a AND opponent_id = v_team_h;
  IF v_text IS DISTINCT FROM 'unresolved' THEN
    RAISE EXCEPTION 'fixture: H (Hidden today) should be unresolved before the override, got %', v_text;
  END IF;

  INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason) VALUES
    (v_team_s,  v_season_a, v_div_hi, 'test: S was High (beats the snapshot)'),
    (v_team_ar, v_season_a, v_div_hi, 'test: A was High (beats the archive)'),
    (v_team_h,  v_season_a, v_div_hi, 'test: H was High (dropped out since)');

  SELECT count(*) INTO v_n
  FROM public.v_power_score_team_matches_rated
  WHERE season_id = v_season_a AND team_id = v_team_k
    AND opponent_id IN (v_team_s, v_team_ar, v_team_h)
    AND resolved_by = 'manual_override' AND opp_division_id = v_div_hi AND opp_weight = v_w_hi AND rates;
  IF v_n IS DISTINCT FROM 3 THEN
    RAISE EXCEPTION 'S, A and H should all be manual_override / High / rated, % were', v_n;
  END IF;

  -- 5b. It also beats the other old answers (earliest snapshot, bracket, division
  --     history, last division ever seen), and the weight it gives is the one the
  --     division carried on the game date, not today's.
  SELECT count(DISTINCT resolved_by) INTO v_n
  FROM dt_old_rated
  WHERE season_id = v_season_a AND opponent_id IN (v_team_t1, v_team_t2, v_team_t3, v_team_t4)
    AND resolved_by IN ('snapshot_earliest_in_season', 'bracket_division_id',
                        'division_history', 'last_known_division');
  IF v_n IS DISTINCT FROM 4 THEN
    RAISE EXCEPTION 'fixture: T1 to T4 should use 4 different old answers, got %', v_n;
  END IF;
  IF (SELECT opp_weight FROM dt_old_rated
      WHERE season_id = v_season_a AND opponent_id = v_team_t5) IS DISTINCT FROM v_w_lo THEN
    RAISE EXCEPTION 'fixture: T5 should be rated Low before its override';
  END IF;

  INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason) VALUES
    (v_team_t1, v_season_a, v_div_hi,  'test: T1 was High (beats the earliest snapshot)'),
    (v_team_t2, v_season_a, v_div_hi,  'test: T2 was High (beats the bracket)'),
    (v_team_t3, v_season_a, v_div_hi,  'test: T3 was High (beats the division history)'),
    (v_team_t4, v_season_a, v_div_hi,  'test: T4 was High (beats the last division seen)'),
    (v_team_t5, v_season_a, v_div_ret, 'test: T5 was Retuned (weight at the game date)');

  SELECT count(*) INTO v_n
  FROM public.v_power_score_team_matches_rated
  WHERE season_id = v_season_a AND team_id = v_team_m
    AND opponent_id IN (v_team_t1, v_team_t2, v_team_t3, v_team_t4)
    AND resolved_by = 'manual_override' AND opp_division_id = v_div_hi AND opp_weight = v_w_hi AND rates;
  IF v_n IS DISTINCT FROM 4 THEN
    RAISE EXCEPTION 'T1 to T4 should all be manual_override / High / rated, % were', v_n;
  END IF;
  SELECT resolved_by, opp_division_id, opp_weight INTO STRICT v_by_seen, v_div_seen, v_wt_seen
  FROM public.v_power_score_team_matches_rated
  WHERE season_id = v_season_a AND team_id = v_team_m AND opponent_id = v_team_t5;
  IF v_by_seen IS DISTINCT FROM 'manual_override' OR v_div_seen IS DISTINCT FROM v_div_ret OR v_wt_seen IS DISTINCT FROM v_w_ret_then THEN
    RAISE EXCEPTION 'T5 should be manual_override / Retuned / the weight AT THE GAME DATE %, got % / % / %',
      v_w_ret_then, v_by_seen, v_div_seen, v_wt_seen;
  END IF;

  -- 6. An override to a Hidden or an unweighted division is ignored: those two
  --    rows keep the old answer, and so does the whole of their old row.
  INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason) VALUES
    (v_team_w, v_season_a, v_div_nul, 'test: unweighted division, must be ignored'),
    (v_team_z, v_season_a, v_div_hid, 'test: Hidden division, must be ignored');

  SELECT count(*) INTO v_n
  FROM public.v_power_score_team_matches_rated nw
  JOIN dt_old_rated od USING (match_id, team_id)
  WHERE nw.season_id = v_season_a AND nw.opponent_id IN (v_team_w, v_team_z)
    AND nw.resolved_by = 'current_division' AND nw.opp_division_id = v_div_lo
    AND nw.opp_weight = v_w_lo
    AND nw::text = od::text;
  IF v_n IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'an override to a Hidden/unweighted division must be ignored; % of 2 rows were', v_n;
  END IF;

  -- Everything outside the nine pinned team-seasons is still the old row.
  SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) INTO v_md5_old
  FROM dt_old_rated x
  WHERE NOT (x.season_id = v_season_a AND x.opponent_id IN
    (v_team_p, v_team_s, v_team_ar, v_team_h, v_team_t1, v_team_t2, v_team_t3, v_team_t4, v_team_t5));
  SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) INTO v_md5_new
  FROM public.v_power_score_team_matches_rated x
  WHERE NOT (x.season_id = v_season_a AND x.opponent_id IN
    (v_team_p, v_team_s, v_team_ar, v_team_h, v_team_t1, v_team_t2, v_team_t3, v_team_t4, v_team_t5));
  IF v_md5_new IS DISTINCT FROM v_md5_old THEN
    RAISE EXCEPTION 'a team-season without a working override changed';
  END IF;

  -- W-L of Team K is the old W-L (the override changes weights, never records).
  SELECT c.wins, c.losses, c.game_wins, c.game_losses INTO STRICT v_n, v_n2, v_gw, v_gl
  FROM public.v_power_score_components c
  WHERE c.season_id = v_season_a AND c.team_id = v_team_k;
  IF v_n IS DISTINCT FROM 3 OR v_n2 IS DISTINCT FROM 2 OR v_gw IS DISTINCT FROM 7 OR v_gl IS DISTINCT FROM 5 THEN
    RAISE EXCEPTION 'Team K record should stay 3-2 (games 7-5), got %-% (%-%)', v_n, v_n2, v_gw, v_gl;
  END IF;

  -- ---------------------------------------------------------------------
  -- 7. A score entered, then corrected (to a tie). The override stays.
  -- ---------------------------------------------------------------------
  UPDATE public.matches
     SET team1_game_wins = 1, team2_game_wins = 1, winner_id = NULL, loser_id = NULL
   WHERE id = v_match_h;
  -- (For a tie the view gives is_win NULL and is_loss false: neither may be TRUE.)
  SELECT is_win, is_loss, game_wins, game_losses, resolved_by, opp_weight
    INTO STRICT v_win, v_loss, v_gw, v_gl, v_by_seen, v_wt_seen
  FROM public.v_power_score_team_matches_rated
  WHERE match_id = v_match_h AND team_id = v_team_k;
  IF v_win IS TRUE OR v_loss IS TRUE OR v_gw IS DISTINCT FROM 1 OR v_gl IS DISTINCT FROM 1 OR v_by_seen IS DISTINCT FROM 'manual_override'
     OR v_wt_seen IS DISTINCT FROM v_w_hi THEN
    RAISE EXCEPTION 'a corrected score (now a tie) should keep manual_override / High, got % % % % % %',
      v_win, v_loss, v_gw, v_gl, v_by_seen, v_wt_seen;
  END IF;
  SELECT c.wins, c.losses INTO STRICT v_n, v_n2
  FROM public.v_power_score_components c
  WHERE c.season_id = v_season_a AND c.team_id = v_team_k;
  IF v_n IS DISTINCT FROM 2 OR v_n2 IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'after the correction Team K should read 2-2 with a tie left out, got %-%', v_n, v_n2;
  END IF;

  -- ---------------------------------------------------------------------
  -- 8. The Sandbox save path and the archived freeze.
  -- ---------------------------------------------------------------------
  -- A routine recompute leaves the archived season alone...
  PERFORM public.upsert_team_season_stats();
  SELECT power_score INTO STRICT v_stored_mid
  FROM public.team_season_stats WHERE season_id = v_season_a AND team_id = v_team_x;
  IF v_stored_mid IS DISTINCT FROM v_stored_old THEN
    RAISE EXCEPTION 'a routine recompute moved an archived season: % -> %', v_stored_old, v_stored_mid;
  END IF;

  -- ...the Sandbox save (include archived) writes the override numbers...
  PERFORM public.upsert_team_season_stats(true);
  SELECT power_score INTO STRICT v_num
  FROM public.team_season_stats WHERE season_id = v_season_a AND team_id = v_team_x;
  IF NOT COALESCE(abs(v_num - v_exp) <= 1e-9, false) THEN
    RAISE EXCEPTION 'the Sandbox save should keep the override score % for Team X, got %', v_exp, v_num;
  END IF;

  -- ...and a second run changes nothing: stored rows equal the live agg, and
  -- the whole table reads the same before and after.
  SELECT count(*) INTO v_n
  FROM public.team_season_stats s
  JOIN public.v_team_season_agg a USING (season_id, team_id)
  WHERE s.power_score IS DISTINCT FROM a.power_score
     OR s.career_power_score IS DISTINCT FROM a.career_power_score
     OR s.sos IS DISTINCT FROM a.sos;
  IF v_n IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'after the Sandbox save % stored rows still differ from the live numbers', v_n;
  END IF;
  SELECT md5(string_agg(s::text, '|' ORDER BY s.season_id, s.team_id)) INTO v_md5_old
  FROM public.team_season_stats s;
  PERFORM public.upsert_team_season_stats(true);
  SELECT md5(string_agg(s::text, '|' ORDER BY s.season_id, s.team_id)) INTO v_md5_new
  FROM public.team_season_stats s;
  IF v_md5_new IS DISTINCT FROM v_md5_old THEN
    RAISE EXCEPTION 'a second recompute changed stored rows';
  END IF;

  -- The narrow UPDATE the hand-run recompute script uses: 0 rows the second time.
  UPDATE public.team_season_stats tss
     SET power_score = agg.power_score, career_power_score = agg.career_power_score,
         sos = agg.sos, recorded_at = now()
    FROM public.v_team_season_agg agg
   WHERE agg.season_id = tss.season_id AND agg.team_id = tss.team_id
     AND tss.season_id = v_season_a
     AND (tss.power_score IS DISTINCT FROM agg.power_score
          OR tss.career_power_score IS DISTINCT FROM agg.career_power_score
          OR tss.sos IS DISTINCT FROM agg.sos);
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'the narrow recompute should find nothing to change, changed %', v_rows;
  END IF;

  -- ---------------------------------------------------------------------
  -- 9. Who can read and who can write.
  -- ---------------------------------------------------------------------
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.power_score_division_override'::regclass) THEN
    RAISE EXCEPTION 'row-level security must be ON for power_score_division_override';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'power_score_division_override'
      AND cmd = 'SELECT' AND (qual = 'true' OR 'public' = ANY (roles))
  ) THEN
    RAISE EXCEPTION 'power_score_division_override must not have an unrestricted SELECT policy';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'power_score_division_override' AND cmd <> 'SELECT'
  ) THEN
    RAISE EXCEPTION 'power_score_division_override must have no write policy';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.power_score_division_override', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.power_score_division_override', 'INSERT') THEN
    RAISE EXCEPTION 'service_role must keep full read access and be able to write overrides';
  END IF;
  IF has_table_privilege('anon', 'public.power_score_division_override', 'INSERT, UPDATE, DELETE, TRUNCATE')
     OR has_table_privilege('authenticated', 'public.power_score_division_override', 'INSERT, UPDATE, DELETE, TRUNCATE') THEN
    RAISE EXCEPTION 'anon and authenticated must not be able to write power_score_division_override';
  END IF;

  -- Both public roles can read the view and the lookup keys it uses.
  -- A plain CI Postgres has no Supabase default privileges and no public read
  -- rule on divisions, so the OTHER tables the old view already reads
  -- (snapshots, archive, brackets, divisions...) are not open to anon here the
  -- way they are on Supabase. Open them inside this rolled-back transaction. The
  -- override table is left exactly as the migration granted it.
  FOR v_rel IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')
      AND c.relname <> 'power_score_division_override'
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', v_rel.relname);
  END LOOP;
  CREATE POLICY "test: public read of divisions" ON public.divisions FOR SELECT USING (true);
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_column_privilege(v_role, 'public.power_score_division_override', 'reason', 'SELECT')
       OR has_column_privilege(v_role, 'public.power_score_division_override', 'created_at', 'SELECT') THEN
      RAISE EXCEPTION '% can read internal override details', v_role;
    END IF;

    EXECUTE format('SET LOCAL ROLE %I', v_role);
    SELECT count(*) INTO v_n FROM public.v_power_score_team_matches_rated;
    SELECT count(team_id), count(*) FILTER (WHERE division_id IN (v_div_hid, v_div_nul))
      INTO v_n2, v_n3
      FROM public.power_score_division_override WHERE season_id = v_season_a;
    SELECT count(*) INTO v_rows FROM public.v_power_score_team_matches_rated WHERE resolved_by = 'manual_override';
    RESET ROLE;
    IF NOT COALESCE(v_n >= 16, false) OR v_n2 IS DISTINCT FROM 9
       OR v_n3 IS DISTINCT FROM 0 OR v_rows IS DISTINCT FROM 9 THEN
      RAISE EXCEPTION '% should read the view (>= 16 rows), 9 rateable overrides, 0 ignored overrides, and 9 manual override games; got %, %, %, %',
        v_role, v_n, v_n2, v_n3, v_rows;
    END IF;
  END LOOP;

  -- anon and authenticated cannot write.
  BEGIN
    SET LOCAL ROLE anon;
    INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason)
    VALUES (v_team_g, v_season_a, v_div_lo, 'test: anon must not insert');
    RESET ROLE;
    RAISE EXCEPTION 'anon could INSERT into power_score_division_override';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
  END;
  BEGIN
    SET LOCAL ROLE anon;
    UPDATE public.power_score_division_override SET division_id = v_div_lo;
    RESET ROLE;
    RAISE EXCEPTION 'anon could UPDATE power_score_division_override';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
  END;
  BEGIN
    SET LOCAL ROLE anon;
    DELETE FROM public.power_score_division_override;
    RESET ROLE;
    RAISE EXCEPTION 'anon could DELETE from power_score_division_override';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
  END;
  BEGIN
    SET LOCAL ROLE authenticated;
    INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason)
    VALUES (v_team_g, v_season_a, v_div_lo, 'test: signed-in must not insert');
    RESET ROLE;
    RAISE EXCEPTION 'authenticated could INSERT into power_score_division_override';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
  END;
  SELECT count(*) INTO v_n FROM public.power_score_division_override;
  IF v_n IS DISTINCT FROM 11 THEN
    RAISE EXCEPTION 'a refused write left % override rows (expected 11)', v_n;
  END IF;

  -- The view is still security_invoker, and keeps its 14 columns, names, order
  -- and types.
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.v_power_score_team_matches_rated'::regclass
      AND 'security_invoker=on' = ANY (reloptions)
  ) THEN
    RAISE EXCEPTION 'v_power_score_team_matches_rated must keep security_invoker=on';
  END IF;
  SELECT string_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod), ',' ORDER BY a.attnum)
    INTO v_cols_new
  FROM pg_attribute a
  WHERE a.attrelid = 'public.v_power_score_team_matches_rated'::regclass AND a.attnum > 0 AND NOT a.attisdropped;
  SELECT string_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod), ',' ORDER BY a.attnum)
    INTO v_cols_old
  FROM pg_attribute a
  WHERE a.attrelid = 'pg_temp.dt_old_rated'::regclass AND a.attnum > 0 AND NOT a.attisdropped;
  IF v_cols_new IS DISTINCT FROM v_cols_old THEN
    RAISE EXCEPTION 'view columns changed: % vs %', v_cols_old, v_cols_new;
  END IF;
  IF v_cols_new IS DISTINCT FROM 'match_id:uuid,season_id:uuid,source:text,team_id:uuid,opponent_id:uuid,is_win:boolean,is_loss:boolean,game_wins:numeric,game_losses:numeric,match_date:timestamp with time zone,opp_division_id:uuid,opp_weight:numeric,rates:boolean,resolved_by:text' THEN
    RAISE EXCEPTION 'view columns are not the expected 14: %', v_cols_new;
  END IF;

  -- ---------------------------------------------------------------------
  -- 10. Deleting things.
  -- ---------------------------------------------------------------------
  -- team and season go away: their override rows go with them. The division
  -- is RESTRICT: it cannot be deleted while an override uses it.
  SELECT string_agg(a.attname || ':' || c.confdeltype::text, ',' ORDER BY a.attname) INTO v_text
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
  WHERE c.conrelid = 'public.power_score_division_override'::regclass AND c.contype = 'f';
  IF v_text IS DISTINCT FROM 'division_id:r,season_id:c,team_id:c' THEN
    RAISE EXCEPTION 'foreign keys should be division RESTRICT, team and season CASCADE, got %', v_text;
  END IF;

  INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason)
  VALUES (v_team_g, v_season_a, v_div_spare, 'test: the only user of the Spare division');
  BEGIN
    DELETE FROM public.divisions WHERE id = v_div_spare;
    RAISE EXCEPTION 'a division that an override uses was deleted';
  EXCEPTION WHEN foreign_key_violation THEN
    GET STACKED DIAGNOSTICS v_con = CONSTRAINT_NAME;
    IF v_con IS DISTINCT FROM 'power_score_division_override_division_id_fkey' THEN
      RAISE EXCEPTION 'the delete was refused by % (expected the override foreign key)', v_con;
    END IF;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.divisions WHERE id = v_div_spare) THEN
    RAISE EXCEPTION 'the Spare division should still exist';
  END IF;

  DELETE FROM public.teams WHERE id = v_team_g;
  IF EXISTS (SELECT 1 FROM public.power_score_division_override WHERE team_id = v_team_g) THEN
    RAISE EXCEPTION 'deleting a team should delete its override rows';
  END IF;

  -- ---------------------------------------------------------------------
  -- 11. The table's own rules.
  -- ---------------------------------------------------------------------
  BEGIN
    INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason)
    VALUES (v_team_q, v_season_a, v_div_hi, NULL);
    RAISE EXCEPTION 'an override with no reason was accepted';
  EXCEPTION WHEN not_null_violation THEN
    NULL;
  END;
  BEGIN
    INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason)
    VALUES (v_team_q, v_season_a, v_div_hi, '');
    RAISE EXCEPTION 'an override with an empty reason was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
  BEGIN
    INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason)
    VALUES (v_team_q, v_season_a, v_div_hi, '   ');
    RAISE EXCEPTION 'an override with a blank reason (spaces) was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
  BEGIN
    INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason)
    VALUES (v_team_q, v_season_a, NULL, 'test: no division');
    RAISE EXCEPTION 'an override with no division was accepted';
  EXCEPTION WHEN not_null_violation THEN
    NULL;
  END;
  BEGIN
    INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason)
    VALUES (v_team_p, v_season_a, v_div_lo, 'test: P already has a row for this season');
    RAISE EXCEPTION 'a second override for the same team and season was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  RAISE NOTICE 'power_score_division_override smoke test passed';
END $$;

ROLLBACK;
