\set ON_ERROR_STOP on

-- Regression test for 20260811210000_power_score_weighted_denominators.sql.
--
-- Two defects are pinned here:
--
--   1. weighted_win_pct and weighted_game_win_pct divided by an UNWEIGHTED
--      denominator while their numerators carried the opponent's division
--      weight. That capped every team at 100 * (average opponent weight): an
--      undefeated Recreational team could not pass 50.0, and results lost to
--      schedule.
--   2. The Hidden division carries division_weight = -1.0 as a sentinel and was
--      never excluded from the rating maths, so beating a Hidden team
--      SUBTRACTED from the winner's score.
--
-- Fixtures use two matches per team so the arithmetic stays checkable by hand.

BEGIN;

DO $$
DECLARE
  v_season_id   uuid := '00000000-0000-0000-0000-00000000f201';
  v_div_comp    uuid := '00000000-0000-0000-0000-00000000f301';
  v_div_rec     uuid := '00000000-0000-0000-0000-00000000f302';
  v_div_hidden  uuid := '00000000-0000-0000-0000-00000000f303';
  v_team_a      uuid := '00000000-0000-0000-0000-00000000f401'; -- perfect, Competitive schedule
  v_team_b      uuid := '00000000-0000-0000-0000-00000000f402'; -- perfect, Recreational schedule
  v_team_d      uuid := '00000000-0000-0000-0000-00000000f403'; -- one win over a Hidden team
  v_team_e      uuid := '00000000-0000-0000-0000-00000000f404'; -- beat the strong opponent
  v_team_f      uuid := '00000000-0000-0000-0000-00000000f405'; -- beat the weak opponent
  v_team_h      uuid := '00000000-0000-0000-0000-00000000f406'; -- the Hidden team itself
  v_opp_c1      uuid := '00000000-0000-0000-0000-00000000f501';
  v_opp_c2      uuid := '00000000-0000-0000-0000-00000000f502';
  v_opp_r1      uuid := '00000000-0000-0000-0000-00000000f503';
  v_opp_r2      uuid := '00000000-0000-0000-0000-00000000f504';
  v_all_teams   uuid[];
  v_score_a     numeric;
  v_score_b     numeric;
  v_score_d     numeric;
  v_score_e     numeric;
  v_score_f     numeric;
  v_mp_d        bigint;
  v_wins_d      bigint;
  v_power_h     numeric;
  v_power_a     numeric;
BEGIN
  v_all_teams := ARRAY[v_team_a, v_team_b, v_team_d, v_team_e, v_team_f, v_team_h,
                       v_opp_c1, v_opp_c2, v_opp_r1, v_opp_r2];

  -- Fixture reset (harmless on a clean CI database; helps local reruns)
  DELETE FROM public.matches WHERE season_id = v_season_id;
  DELETE FROM public.team_season_stats WHERE season_id = v_season_id;
  DELETE FROM public.teams WHERE id = ANY(v_all_teams);
  DELETE FROM public.divisions WHERE id IN (v_div_comp, v_div_rec, v_div_hidden);
  DELETE FROM public.seasons WHERE id = v_season_id;

  -- is_active stays false: every assertion below reads the per-season component
  -- view, and regular-season rows reach v_team_details regardless of the flag.
  INSERT INTO public.seasons (id, name, start_date, is_active)
  VALUES (v_season_id, 'Weighted Denominator Season', '2026-01-01', false);

  -- The three weights that matter, matching the seeded production values.
  INSERT INTO public.divisions (id, name, display_division, division_weight) VALUES
    (v_div_comp,   'WD Competitive Low',   'Competitive',   0.925),
    (v_div_rec,    'WD Recreational High', 'Recreational',  0.50),
    (v_div_hidden, 'WD Hidden',            'Hidden',       -1.0);

  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team_a, 'WD Team A', v_div_comp,   0, 0, 0, 0),
    (v_team_b, 'WD Team B', v_div_rec,    0, 0, 0, 0),
    (v_team_d, 'WD Team D', v_div_comp,   0, 0, 0, 0),
    (v_team_e, 'WD Team E', v_div_comp,   0, 0, 0, 0),
    (v_team_f, 'WD Team F', v_div_comp,   0, 0, 0, 0),
    (v_team_h, 'WD Team H', v_div_hidden, 0, 0, 0, 0),
    (v_opp_c1, 'WD Opp C1', v_div_comp,   0, 0, 0, 0),
    (v_opp_c2, 'WD Opp C2', v_div_comp,   0, 0, 0, 0),
    (v_opp_r1, 'WD Opp R1', v_div_rec,    0, 0, 0, 0),
    (v_opp_r2, 'WD Opp R2', v_div_rec,    0, 0, 0, 0);

  INSERT INTO public.matches
    (id, team1_id, team2_id, season_id, round_number, iscompleted,
     team1_game_wins, team2_game_wins, winner_id, loser_id)
  VALUES
    -- A sweeps two Competitive opponents
    (gen_random_uuid(), v_team_a, v_opp_c1, v_season_id, 1, true, 2, 0, v_team_a, v_opp_c1),
    (gen_random_uuid(), v_team_a, v_opp_c2, v_season_id, 2, true, 2, 0, v_team_a, v_opp_c2),
    -- B sweeps two Recreational opponents: identical record, softer schedule
    (gen_random_uuid(), v_team_b, v_opp_r1, v_season_id, 1, true, 2, 0, v_team_b, v_opp_r1),
    (gen_random_uuid(), v_team_b, v_opp_r2, v_season_id, 2, true, 2, 0, v_team_b, v_opp_r2),
    -- D wins one Competitive match and one against the Hidden team
    (gen_random_uuid(), v_team_d, v_opp_c1, v_season_id, 3, true, 2, 0, v_team_d, v_opp_c1),
    (gen_random_uuid(), v_team_d, v_team_h,  v_season_id, 4, true, 2, 0, v_team_d, v_team_h),
    -- E beats the strong opponent and loses to the weak one
    (gen_random_uuid(), v_team_e, v_opp_c2, v_season_id, 5, true, 2, 1, v_team_e, v_opp_c2),
    (gen_random_uuid(), v_team_e, v_opp_r1, v_season_id, 6, true, 1, 2, v_opp_r1, v_team_e),
    -- F is the mirror image: beats the weak opponent, loses to the strong one
    (gen_random_uuid(), v_team_f, v_opp_c2, v_season_id, 7, true, 1, 2, v_opp_c2, v_team_f),
    (gen_random_uuid(), v_team_f, v_opp_r1, v_season_id, 8, true, 2, 1, v_team_f, v_opp_r1);

  SELECT public.power_score_100(c.weighted_win_pct, c.sos, c.weighted_game_win_pct)
    INTO v_score_a
  FROM public.v_power_score_components c
  WHERE c.season_id = v_season_id AND c.team_id = v_team_a;

  SELECT public.power_score_100(c.weighted_win_pct, c.sos, c.weighted_game_win_pct)
    INTO v_score_b
  FROM public.v_power_score_components c
  WHERE c.season_id = v_season_id AND c.team_id = v_team_b;

  SELECT public.power_score_100(c.weighted_win_pct, c.sos, c.weighted_game_win_pct),
         c.matches_played, c.wins
    INTO v_score_d, v_mp_d, v_wins_d
  FROM public.v_power_score_components c
  WHERE c.season_id = v_season_id AND c.team_id = v_team_d;

  SELECT public.power_score_100(c.weighted_win_pct, c.sos, c.weighted_game_win_pct)
    INTO v_score_e
  FROM public.v_power_score_components c
  WHERE c.season_id = v_season_id AND c.team_id = v_team_e;

  SELECT public.power_score_100(c.weighted_win_pct, c.sos, c.weighted_game_win_pct)
    INTO v_score_f
  FROM public.v_power_score_components c
  WHERE c.season_id = v_season_id AND c.team_id = v_team_f;

  -- 1. A perfect team reads 1.0 on both performance terms whoever it played,
  --    so the total is 40 + 45*0.925 + 15 = 96.625. Before the fix the win and
  --    game terms were scaled by 0.925 and the ceiling was 92.5.
  IF abs(v_score_a - 96.625) > 1e-6 THEN
    RAISE EXCEPTION 'perfect Competitive team should score 96.625, got %', v_score_a;
  END IF;

  -- 2. The same, on a Recreational schedule: 40 + 45*0.50 + 15 = 77.5. Before
  --    the fix this team was capped at exactly 50.0 and coloured "Average".
  IF abs(v_score_b - 77.5) > 1e-6 THEN
    RAISE EXCEPTION 'perfect Recreational team should score 77.5, got %', v_score_b;
  END IF;

  -- 3. Strength of schedule still separates identical records, by 45*(0.925-0.50).
  IF abs((v_score_a - v_score_b) - 19.125) > 1e-6 THEN
    RAISE EXCEPTION 'schedule gap between equal records should be 19.125, got %',
      v_score_a - v_score_b;
  END IF;

  -- 4. This pins the LAST RESORT of the resolution chain, not a "Hidden is
  --    always excluded" rule -- that rule no longer exists. Since
  --    20260812130000, a match against a team that is Hidden *today* is rated at
  --    the division that team was actually in when the match was played; see
  --    supabase/tests/power_score_historical_opponent_division.sql.
  --
  --    This fixture's Hidden team has no snapshot, no archive row and no
  --    bracket, so every step of the chain fails and it resolves to
  --    'unresolved' -- which drops it from the three weighted terms. D
  --    therefore scores the same as a team that only played the Competitive
  --    opponent. Before the denominator fix, the -1.0 weight dragged this to
  --    roughly 28.
  IF abs(v_score_d - 96.625) > 1e-6 THEN
    RAISE EXCEPTION 'an unresolvable opponent must not change the score, got %', v_score_d;
  END IF;

  -- 5. ...but the record still counts it. Only the rating terms filter.
  IF v_mp_d <> 2 OR v_wins_d <> 2 THEN
    RAISE EXCEPTION 'Hidden matches must still count in the record, got %-% ', v_mp_d, v_wins_d;
  END IF;

  -- 6. Within one schedule, beating the stronger opponent is worth more.
  IF v_score_e <= v_score_f THEN
    RAISE EXCEPTION 'beating the strong opponent (%) should beat beating the weak one (%)',
      v_score_e, v_score_f;
  END IF;

  -- 7. The exclusion is one-directional. A Hidden team still gets a rating of
  --    its own from the opponents IT played, because admin surfaces
  --    (useCareerRankingsWithHidden, the power-migration comparison) fetch
  --    Hidden teams on purpose and expect a number. Keeping them out of public
  --    listings is a read-layer concern, handled in the MCP tools.
  SELECT power_score INTO v_power_h FROM public.v_team_details WHERE team_id = v_team_h;
  IF v_power_h IS NULL THEN
    RAISE EXCEPTION 'Hidden teams should still carry a score of their own for admin surfaces';
  END IF;

  -- 8. Ranked teams are unaffected.
  SELECT power_score INTO v_power_a FROM public.v_team_details WHERE team_id = v_team_a;
  IF v_power_a IS NULL THEN
    RAISE EXCEPTION 'a ranked team should still have a power score';
  END IF;

  RAISE NOTICE 'power_score_weighted_denominators smoke test passed';
END $$;

ROLLBACK;
