\set ON_ERROR_STOP on

-- Regression test for 20261006120000_exclude_ties_from_win_rate.sql.
--
-- Doug's rule (2026-10-06): a tie does not count in Win % or in the Power
-- Score match-win term. Win % = W / (W + L). The game term and SOS still count
-- a tie: the games were played and the opponent was faced.
--
-- Every opponent is in one division of weight 0.50 and the weights are the
-- standard 40/45/15, so the arithmetic stays checkable by hand:
--
--   Team A  W 2-0, L 1-2, T 1-1
--           Win %             1 / (1 + 1)               = 0.5   (old 1/3)
--           weighted_win_pct  0.5 / (0.5 + 0.5)         = 0.5   (old 1/3)
--           game term         (2+1+1) / (2+1+1+0+2+1)   = 4/7
--           power             0.5*40 + 0.5*45 + 4/7*15  = 51.0714...
--   Team B  W 2-0, L 0-2, no tie: the same before and after
--           power             0.5*40 + 0.5*45 + 0.5*15  = 50.0
--   Team E  one 1-1 tie and nothing else
--           Win % 0, weighted_win_pct 0 (never NULL)
--           standings power   0*40 + 0.5*45 + 0.5*15    = 30.0
--           season-agg power  NULL (no win and no loss)

BEGIN;

DO $$
DECLARE
  v_season_id uuid := '00000000-0000-0000-0000-00000000e601';
  v_div       uuid := '00000000-0000-0000-0000-00000000e602';
  v_team_a    uuid := '00000000-0000-0000-0000-00000000e611';
  v_team_b    uuid := '00000000-0000-0000-0000-00000000e612';
  v_team_e    uuid := '00000000-0000-0000-0000-00000000e615';
  v_opp_1     uuid := '00000000-0000-0000-0000-00000000e621';
  v_opp_2     uuid := '00000000-0000-0000-0000-00000000e622';
  v_opp_3     uuid := '00000000-0000-0000-0000-00000000e623';
  v_opp_4     uuid := '00000000-0000-0000-0000-00000000e624';
  v_tie_e     uuid := '00000000-0000-0000-0000-00000000e631';
  v_all_teams uuid[];
  v_num       numeric;
  v_num2      numeric;
  v_wins      bigint;
  v_losses    bigint;
  v_played    bigint;
BEGIN
  v_all_teams := ARRAY[v_team_a, v_team_b, v_team_e, v_opp_1, v_opp_2, v_opp_3, v_opp_4];

  -- Fixture reset (harmless on a clean CI database; helps local reruns)
  DELETE FROM public.matches WHERE season_id = v_season_id;
  DELETE FROM public.team_season_stats WHERE season_id = v_season_id;
  DELETE FROM public.teams WHERE id = ANY(v_all_teams);
  DELETE FROM public.divisions WHERE id = v_div;
  DELETE FROM public.seasons WHERE id = v_season_id;

  INSERT INTO public.seasons (id, name, start_date, is_active)
  VALUES (v_season_id, 'Tie Exclusion Season', '2026-01-01', false);

  INSERT INTO public.divisions (id, name, display_division, division_weight)
  VALUES (v_div, 'TX Recreational', 'Recreational', 0.50);

  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team_a, 'TX Team A', v_div, 0, 0, 0, 0),
    (v_team_b, 'TX Team B', v_div, 0, 0, 0, 0),
    (v_team_e, 'TX Team E', v_div, 0, 0, 0, 0),
    (v_opp_1,  'TX Opp 1',  v_div, 0, 0, 0, 0),
    (v_opp_2,  'TX Opp 2',  v_div, 0, 0, 0, 0),
    (v_opp_3,  'TX Opp 3',  v_div, 0, 0, 0, 0),
    (v_opp_4,  'TX Opp 4',  v_div, 0, 0, 0, 0);

  -- A tie is a completed match with no winner and no loser.
  INSERT INTO public.matches
    (id, team1_id, team2_id, season_id, round_number, iscompleted,
     team1_game_wins, team2_game_wins, winner_id, loser_id)
  VALUES
    (gen_random_uuid(), v_team_a, v_opp_1, v_season_id, 1, true, 2, 0, v_team_a, v_opp_1),
    (gen_random_uuid(), v_team_a, v_opp_2, v_season_id, 2, true, 1, 2, v_opp_2, v_team_a),
    (gen_random_uuid(), v_team_a, v_opp_3, v_season_id, 3, true, 1, 1, NULL, NULL),
    (gen_random_uuid(), v_team_b, v_opp_1, v_season_id, 4, true, 2, 0, v_team_b, v_opp_1),
    (gen_random_uuid(), v_team_b, v_opp_2, v_season_id, 5, true, 0, 2, v_opp_2, v_team_b),
    (v_tie_e,           v_team_e, v_opp_4, v_season_id, 6, true, 1, 1, NULL, NULL);

  -- 1. Standings Win % (v_team_details reads v_team_match_stats): the tie is
  --    out of the bottom. The record itself is untouched.
  SELECT win_percentage, wins, losses INTO v_num, v_wins, v_losses
  FROM public.v_team_details WHERE team_id = v_team_a;
  IF abs(v_num - 0.5) > 1e-9 THEN
    RAISE EXCEPTION 'Team A Win %% should be 1/(1+1) = 0.5, got %', v_num;
  END IF;
  IF v_wins <> 1 OR v_losses <> 1 THEN
    RAISE EXCEPTION 'Team A record should stay 1-1, got %-%', v_wins, v_losses;
  END IF;

  -- 2. Power Score match term, per-season view: ties out of top and bottom.
  --    matches_played still counts the tie.
  SELECT weighted_win_pct, matches_played INTO v_num, v_played
  FROM public.v_power_score_components
  WHERE season_id = v_season_id AND team_id = v_team_a;
  IF abs(v_num - 0.5) > 1e-9 THEN
    RAISE EXCEPTION 'Team A weighted_win_pct should be 0.5, got %', v_num;
  END IF;
  IF v_played <> 3 THEN
    RAISE EXCEPTION 'Team A matches_played should still count the tie (3), got %', v_played;
  END IF;

  -- 3. The live-season view uses the same rule.
  SELECT weighted_win_pct INTO v_num
  FROM public.v_power_score_components_current WHERE team_id = v_team_a;
  IF abs(v_num - 0.5) > 1e-9 THEN
    RAISE EXCEPTION 'Team A weighted_win_pct (current) should be 0.5, got %', v_num;
  END IF;

  -- 4. Stored-season power (0-1 scale) and standings power (0-100) agree.
  --    The game term still counts the tied games: 4/7.
  SELECT power_score INTO v_num
  FROM public.v_team_season_agg WHERE season_id = v_season_id AND team_id = v_team_a;
  IF abs(v_num - (0.5 * 40 + 0.5 * 45 + (4.0 / 7) * 15) / 100.0) > 1e-9 THEN
    RAISE EXCEPTION 'Team A season power should be 0.510714..., got %', v_num;
  END IF;
  SELECT power_score INTO v_num FROM public.v_team_details WHERE team_id = v_team_a;
  IF abs(v_num - (0.5 * 40 + 0.5 * 45 + (4.0 / 7) * 15)) > 1e-9 THEN
    RAISE EXCEPTION 'Team A standings power should be 51.0714..., got %', v_num;
  END IF;

  -- 5. A team with no tie scores exactly as before.
  SELECT win_percentage, power_score INTO v_num, v_num2
  FROM public.v_team_details WHERE team_id = v_team_b;
  IF abs(v_num - 0.5) > 1e-9 OR abs(v_num2 - 50.0) > 1e-9 THEN
    RAISE EXCEPTION 'Team B (no tie) should read 0.5 and 50.0, got % and %', v_num, v_num2;
  END IF;

  -- 6. A team with only a tie: 0, never NULL, on the standings; still rated,
  --    because it played. The stored season row has no win and no loss, so
  --    v_team_season_agg leaves it unrated, as it always has.
  SELECT win_percentage, weighted_win_percentage INTO v_num, v_num2
  FROM public.v_team_details WHERE team_id = v_team_e;
  IF v_num IS DISTINCT FROM 0 OR v_num2 IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'Team E (tie only) should read 0 and 0, got % and %', v_num, v_num2;
  END IF;
  SELECT power_score INTO v_num FROM public.v_team_details WHERE team_id = v_team_e;
  IF abs(v_num - 30.0) > 1e-9 THEN
    RAISE EXCEPTION 'Team E standings power should be 30.0, got %', v_num;
  END IF;
  SELECT power_score INTO v_num
  FROM public.v_team_season_agg WHERE season_id = v_season_id AND team_id = v_team_e;
  IF v_num IS NOT NULL THEN
    RAISE EXCEPTION 'Team E season power should be NULL (no win, no loss), got %', v_num;
  END IF;

  -- 7. A tie later corrected to a win: the views follow the match at once.
  UPDATE public.matches
  SET team1_game_wins = 2, team2_game_wins = 1, winner_id = v_team_e, loser_id = v_opp_4
  WHERE id = v_tie_e;
  SELECT win_percentage, power_score INTO v_num, v_num2
  FROM public.v_team_details WHERE team_id = v_team_e;
  IF abs(v_num - 1.0) > 1e-9 OR abs(v_num2 - (1.0 * 40 + 0.5 * 45 + (2.0 / 3) * 15)) > 1e-9 THEN
    RAISE EXCEPTION 'Team E after the correction should read 1.0 and 72.5, got % and %',
      v_num, v_num2;
  END IF;

  RAISE NOTICE 'power_score_ties_excluded smoke test passed';
END $$;

ROLLBACK;
