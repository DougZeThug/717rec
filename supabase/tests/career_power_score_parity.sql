\set ON_ERROR_STOP on

-- Career power score: the database must agree with the app.
--
-- calculate_career_power_score() (20260901120000_career_power_score_match_app.sql)
-- decides the King Slayer badge. src/services/career/calculateCareerPowerScore.ts
-- produces the number shown on screen. They have to be the same number, and
-- they drifted apart for months without anything noticing — see B-35 in
-- docs/product-description/bug-triage.md.
--
-- The fixtures below are asserted with the SAME inputs and the SAME expected
-- totals in
-- src/services/career/__tests__/calculateCareerPowerScore.test.ts
-- ("parity with supabase/tests/career_power_score_parity.sql").
-- Change one side and the other fails. The one exception is fixture 13, a KNOWN
-- DIFFERENCE: a tab in a division name is unrated here (50) but rated by the app
-- (57), and the TypeScript test pins that other number.
--
-- Fixtures 1-4 are the original known-division totals (53.43, 57.35, 56.3175,
-- 0). Fixtures 5 onward pin the unrated-division rule
-- (20261117120000_unrated_division_career_bonus.sql): a division with no known
-- weight is left out of the bonus instead of counting as 0.85. Fixture 5 was
-- 55.0575 and fixture 6 was 58.4875 before that rule. Fixtures 14, 16 and 17 are
-- known-division cases (old and new functions agree): 14 pins the cap as the
-- HIGHEST rated weight, 16 that a playoff season can set the cap, and 17 that
-- the playoff weight is the AVERAGE of the rated playoff seasons.
--
-- Everything runs inside one rolled-back transaction.

BEGIN;

DO $$
DECLARE
  v_div_comp uuid;
  v_season_1 uuid   := '00000000-0000-0000-0000-0000000cb301';
  v_season_2 uuid   := '00000000-0000-0000-0000-0000000cb302';
  v_season_3 uuid   := '00000000-0000-0000-0000-0000000cb303';
  v_team_a uuid     := '00000000-0000-0000-0000-0000000cb401';
  v_team_b uuid     := '00000000-0000-0000-0000-0000000cb402';
  v_team_c uuid     := '00000000-0000-0000-0000-0000000cb403';
  v_team_d uuid     := '00000000-0000-0000-0000-0000000cb404';
  -- Fixtures 5 onward. v_team_opp is the opponent every probe playoff win is
  -- scored against, so Parity D stays a team that has never played.
  v_team_e uuid     := '00000000-0000-0000-0000-0000000cb405';
  v_team_f uuid     := '00000000-0000-0000-0000-0000000cb406';
  v_team_g uuid     := '00000000-0000-0000-0000-0000000cb407';
  v_team_h uuid     := '00000000-0000-0000-0000-0000000cb408';
  v_team_i uuid     := '00000000-0000-0000-0000-0000000cb409';
  v_team_j uuid     := '00000000-0000-0000-0000-0000000cb40a';
  v_team_k uuid     := '00000000-0000-0000-0000-0000000cb40b';
  v_team_l uuid     := '00000000-0000-0000-0000-0000000cb40c';
  v_team_m uuid     := '00000000-0000-0000-0000-0000000cb40d';
  v_team_opp uuid   := '00000000-0000-0000-0000-0000000cb40e';
  v_team_n uuid     := '00000000-0000-0000-0000-0000000cb40f';
  v_team_o uuid     := '00000000-0000-0000-0000-0000000cb410';
  v_team_p uuid     := '00000000-0000-0000-0000-0000000cb411';
  v_team_q uuid     := '00000000-0000-0000-0000-0000000cb412';
  -- Probe divisions, with names no real division has.
  v_div_zero uuid   := '00000000-0000-0000-0000-0000000cb501';
  v_div_null uuid   := '00000000-0000-0000-0000-0000000cb502';
  v_div_half uuid   := '00000000-0000-0000-0000-0000000cb503';
  v_div_word uuid   := '00000000-0000-0000-0000-0000000cb504';
  v_div_word_null uuid := '00000000-0000-0000-0000-0000000cb505';
  v_div_root_null uuid := '00000000-0000-0000-0000-0000000cb506';
  -- A bracket in the Competitive division (its wins count as competitive) and
  -- one with no division (its wins do not).
  v_bracket_comp uuid := '00000000-0000-0000-0000-0000000cb601';
  v_bracket_none uuid := '00000000-0000-0000-0000-0000000cb602';
  v_score numeric;
  v_weight numeric;
BEGIN
  PERFORM set_config('session_replication_role', 'replica', true);

  DELETE FROM public.playoff_matches WHERE bracket_id IN (v_bracket_comp, v_bracket_none);
  DELETE FROM public.brackets WHERE id IN (v_bracket_comp, v_bracket_none);
  DELETE FROM public.team_season_stats WHERE team_id IN
    (v_team_a, v_team_b, v_team_c, v_team_d, v_team_e, v_team_f, v_team_g, v_team_h,
     v_team_i, v_team_j, v_team_k, v_team_l, v_team_m, v_team_opp, v_team_n, v_team_o, v_team_p, v_team_q);
  DELETE FROM public.teams WHERE id IN
    (v_team_a, v_team_b, v_team_c, v_team_d, v_team_e, v_team_f, v_team_g, v_team_h,
     v_team_i, v_team_j, v_team_k, v_team_l, v_team_m, v_team_opp, v_team_n, v_team_o, v_team_p, v_team_q);
  DELETE FROM public.divisions WHERE id IN
    (v_div_zero, v_div_null, v_div_half, v_div_word, v_div_word_null, v_div_root_null);
  DELETE FROM public.seasons WHERE id IN (v_season_1, v_season_2, v_season_3);

  -- Pin the live weights of the seeded divisions for the length of the
  -- transaction. These are UPDATEs rather than INSERTs on purpose:
  -- divisions.name has no unique constraint, so adding a second "Competitive"
  -- would leave the lookup picking between two rows.
  --
  -- The old SQL carried its own hardcoded copy of these numbers and could not
  -- see an admin re-weight a division. Re-weighting them here and expecting the
  -- totals to follow is the whole point.
  UPDATE public.divisions SET division_weight = 1.00 WHERE lower(btrim(name)) = 'competitive';
  UPDATE public.divisions SET division_weight = 0.70 WHERE lower(btrim(name)) = 'intermediate high';
  UPDATE public.divisions SET division_weight = 0.95 WHERE lower(btrim(name)) = 'cuspers';

  SELECT id INTO v_div_comp FROM public.divisions
  WHERE lower(btrim(name)) = 'competitive' ORDER BY name DESC, id DESC LIMIT 1;

  -- Non-active seasons, so every fixture row counts as history and nothing is
  -- double-counted against v_team_details.
  INSERT INTO public.seasons (id, name, is_active, is_archived) VALUES
    (v_season_1, 'Parity Season 1', false, true),
    (v_season_2, 'Parity Season 2', false, true),
    (v_season_3, 'Parity Season 3', false, true);

  INSERT INTO public.teams (id, name, division_id) VALUES
    (v_team_a, 'Parity A', v_div_comp),
    (v_team_b, 'Parity B', v_div_comp),
    (v_team_c, 'Parity C', v_div_comp),
    -- Never played: no team_season_stats row is inserted for it below.
    (v_team_d, 'Parity D', v_div_comp);

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 1 — the floored season score, and a squared title bonus.
  --
  -- One archived season: 10 matches, career_power_score 0.50, power_score 0.90.
  -- The career (floored) score is the one the career rankings use, so the base
  -- is 50, not 90. Champion of "Intermediate 1" — a synthetic label that
  -- resolves through the alias map to Intermediate High, weight 0.70.
  --
  --   base  = 50
  --   title = 7 x 0.70^2                  =  3.43
  --   cap   = 15 x 0.70^2                 =  7.35   (not reached)
  --   total = 53.43
  --
  -- The old formula read power_score (90) and applied a linear 7 x 0.70 = 4.9
  -- under a flat cap of 15, giving 94.90.
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up)
  VALUES
    (v_season_1, v_team_a, 6, 4, 12, 8, 'Intermediate 1', 0.90, 0.50, true, false);

  v_score := public.calculate_career_power_score(v_team_a);
  IF round(v_score, 4) <> 53.4300 THEN
    RAISE EXCEPTION 'Fixture 1: expected 53.43, got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 2 — the cap is scaled by division strength, not flat.
  --
  -- Three Intermediate High titles, base 50 throughout.
  --
  --   titles = 3 x 7 x 0.70^2             = 10.29
  --   cap    = 15 x 0.70^2                =  7.35   (binds)
  --   total  = 57.35
  --
  -- This is the same number as the "scales the bonus cap by division strength
  -- for soft-division titles" case in the TypeScript unit test. The old
  -- formula gave 3 x 7 x 0.70 = 14.70 under a flat 15, so 64.70.
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up)
  VALUES
    (v_season_1, v_team_b, 5, 5, 10, 10, 'Intermediate High', 0.50, 0.50, true, false),
    (v_season_2, v_team_b, 5, 5, 10, 10, 'Intermediate High', 0.50, 0.50, true, false),
    (v_season_3, v_team_b, 5, 5, 10, 10, 'Intermediate High', 0.50, 0.50, true, false);

  v_score := public.calculate_career_power_score(v_team_b);
  IF round(v_score, 4) <> 57.3500 THEN
    RAISE EXCEPTION 'Fixture 2: expected 57.35, got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 3 — weights come from the divisions table, not from the code.
  --
  -- "Cuspers" is a real division here, weight 0.95. The old SQL had it in a
  -- hardcoded CASE at 0.70 and could never see an admin re-weight it.
  --
  --   base  = 50
  --   title = 7 x 0.95^2                  =  6.3175
  --   cap   = 15 x 0.95^2                 = 13.5375  (not reached)
  --   total = 56.3175
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up)
  VALUES
    (v_season_1, v_team_c, 5, 5, 10, 10, 'Cuspers', 0.50, 0.50, true, false);

  v_score := public.calculate_career_power_score(v_team_c);
  IF round(v_score, 4) <> 56.3175 THEN
    RAISE EXCEPTION 'Fixture 3: expected 56.3175, got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 4 — a team that has played nothing scores 0.
  --
  -- No team_season_stats row at all, no playoff matches, so there is no base to
  -- average and no bonus to add. It sits at the foot of the career table. The
  -- base used to be 50, which placed such a team mid-table above teams with a
  -- real losing record.
  -- ────────────────────────────────────────────────────────────────────────
  v_score := public.calculate_career_power_score(v_team_d);
  IF round(v_score, 4) <> 0.0000 THEN
    RAISE EXCEPTION 'Fixture 4: expected 0, got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Setup for fixtures 5 onward: probe divisions, teams, two brackets.
  --
  -- The probes are INSERTs on purpose (unlike the UPDATEs above): their names are
  -- ones no real division has, so the name lookup cannot pick a second row.
  --   Parity Zero Probe       weight 0     a real 0, not "unknown"
  --   Parity Null Probe       weight NULL  a division that exists but has no weight
  --   Parity Half Probe       weight 0.50  a team division with a known weight
  --   Parityword              weight 0.55  a base tier word ...
  --   Parityword Nullprobe    weight NULL  ... and a division that begins with it
  --   Parityroot              weight NULL  a base tier word whose division has no weight
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.divisions (id, name, division_weight) VALUES
    (v_div_zero,      'Parity Zero Probe',    0),
    (v_div_null,      'Parity Null Probe',    NULL),
    (v_div_half,      'Parity Half Probe',    0.50),
    (v_div_word,      'Parityword',           0.55),
    (v_div_word_null, 'Parityword Nullprobe', NULL),
    (v_div_root_null, 'Parityroot',           NULL);

  INSERT INTO public.teams (id, name, division_id) VALUES
    (v_team_e,   'Parity E', v_div_comp),
    (v_team_f,   'Parity F', v_div_comp),
    (v_team_g,   'Parity G', v_div_comp),
    (v_team_h,   'Parity H', v_div_half),
    -- No division at all: this team's own weight is unrated (NULL).
    (v_team_i,   'Parity I', NULL),
    (v_team_j,   'Parity J', NULL),
    (v_team_k,   'Parity K', v_div_comp),
    (v_team_l,   'Parity L', v_div_comp),
    (v_team_m,   'Parity M', v_div_comp),
    (v_team_n,   'Parity N', v_div_comp),
    (v_team_o,   'Parity O', v_div_comp),
    (v_team_p,   'Parity P', v_div_comp),
    (v_team_q,   'Parity Q', v_div_half),
    (v_team_opp, 'Parity Opponent', v_div_comp);

  INSERT INTO public.brackets (id, title, format, state, division_id, season_id, uses_brackets_manager) VALUES
    (v_bracket_comp, 'Parity Competitive Bracket', 'Single Elimination', 'completed', v_div_comp, v_season_1, false),
    (v_bracket_none, 'Parity No-Division Bracket', 'Single Elimination', 'completed', NULL, v_season_1, false);

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 5 — a title in an unknown division adds nothing.
  --
  -- One archived season, base 50, champion of "Nothing Like A Division", a name
  -- that matches no division. It used to count as the 0.85 default:
  -- 7 x 0.85^2 = 5.0575, total 55.0575. Now the division is unrated:
  --
  --   base  = 50
  --   title = 0                           (unrated)
  --   cap   = 15 x 1.00^2 = 15            (no rated division: the team weight)
  --   total = 50
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up)
  VALUES
    (v_season_1, v_team_e, 5, 5, 10, 10, 'Nothing Like A Division', 0.50, 0.50, true, false);

  v_score := public.calculate_career_power_score(v_team_e);
  IF round(v_score, 4) <> 50.0000 THEN
    RAISE EXCEPTION 'Fixture 5: expected 50 (was 55.0575), got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 6 — a known title plus an unknown title adds only the known one.
  --
  -- Base 50. Champion of "Intermediate High" (0.70) in one season and of
  -- "Nothing Like A Division" in another.
  --
  --   titles = 7 x 0.70^2 + 0             =  3.43
  --   cap    = 15 x 0.70^2                =  7.35   (the unrated title cannot
  --                                                  raise it to 15 x 0.85^2)
  --   total  = 53.43
  --
  -- It was 58.4875: 3.43 + 5.0575 = 8.4875 under a cap of 10.8375.
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up)
  VALUES
    (v_season_1, v_team_f, 5, 5, 10, 10, 'Intermediate High',       0.50, 0.50, true, false),
    (v_season_2, v_team_f, 5, 5, 10, 10, 'Nothing Like A Division', 0.50, 0.50, true, false);

  v_score := public.calculate_career_power_score(v_team_f);
  IF round(v_score, 4) <> 53.4300 THEN
    RAISE EXCEPTION 'Fixture 6: expected 53.43 (was 58.4875), got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 7 — a runner-up finish in an unknown division adds nothing.
  -- It was 4 x 0.85^2 = 2.89, total 52.89.
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up)
  VALUES
    (v_season_1, v_team_g, 5, 5, 10, 10, 'Nothing Like A Division', 0.50, 0.50, false, true);

  v_score := public.calculate_career_power_score(v_team_g);
  IF round(v_score, 4) <> 50.0000 THEN
    RAISE EXCEPTION 'Fixture 7: expected 50 (was 52.89), got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 8 — a playoff run in only unknown seasons uses the team weight.
  --
  -- Parity H sits in a 0.50 division. Its one playoff season is in an unknown
  -- division, and it won 10 playoff matches and lost none. It used to rate the run
  -- at 0.85 (bonus 1.7); now it uses the team weight:
  --
  --   base    = 50
  --   playoff = (1.0 - 0.5) x 4 x 0.50    =  1.0
  --   cap     = 15 x 0.50^2               =  3.75   (the team weight)
  --   total   = 51
  --
  -- The 10 wins are in a bracket with no division, so none is a competitive win.
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up, playoff_rank)
  VALUES
    (v_season_1, v_team_h, 5, 5, 10, 10, 'Nothing Like A Division', 0.50, 0.50, false, false, 2);

  INSERT INTO public.playoff_matches
    (bracket_id, match_type, round, position, status, team1_id, team2_id, winner_id, loser_id)
  SELECT v_bracket_none, 'winners', 1, n, 'completed', v_team_h, v_team_opp, v_team_h, v_team_opp
  FROM generate_series(1, 10) AS n;

  v_score := public.calculate_career_power_score(v_team_h);
  IF round(v_score, 4) <> 51.0000 THEN
    RAISE EXCEPTION 'Fixture 8: expected 51 (was 51.7), got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 9 — no weight to rate the run by: the win-rate bonus is 0.
  --
  -- Parity I has no division, so its own weight is NULL. It won a Competitive
  -- title (7 x 1.00^2 = 7, under a cap of 15) and reached the playoffs in an
  -- unknown division, winning 10 playoff matches. Its playoff weight has no rated
  -- season and no team weight to fall back on, so the win-rate bonus is 0, not
  -- NULL and not 0.85:
  --
  --   total = 50 + 7 = 57
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up, playoff_rank)
  VALUES
    (v_season_1, v_team_i, 5, 5, 10, 10, 'Competitive',             0.50, 0.50, true,  false, NULL),
    (v_season_2, v_team_i, 5, 5, 10, 10, 'Nothing Like A Division', 0.50, 0.50, false, false, 1);

  INSERT INTO public.playoff_matches
    (bracket_id, match_type, round, position, status, team1_id, team2_id, winner_id, loser_id)
  SELECT v_bracket_none, 'winners', 2, n, 'completed', v_team_i, v_team_opp, v_team_i, v_team_opp
  FROM generate_series(1, 10) AS n;

  v_score := public.calculate_career_power_score(v_team_i);
  IF round(v_score, 4) <> 57.0000 THEN
    RAISE EXCEPTION 'Fixture 9: expected 57, got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 10 — the LEAST guard: an all-unrated team gets its base score, never
  -- 100 and never an uncapped bonus.
  --
  -- Parity J has no division (team weight NULL), an unknown title, an unknown
  -- runner-up finish, and ONE playoff win in the Competitive bracket (+0.5 as a
  -- competitive win). There is no rated division and no team weight, so the cap
  -- is 0 and the whole bonus is 0:
  --
  --   total = 50
  --
  -- Postgres LEAST() skips a NULL argument. Without COALESCE the cap would be NULL
  -- and LEAST(NULL, 0.5) = 0.5 would leave the bonus uncapped (50.5). A NULL bonus
  -- would reach LEAST(100, base + NULL), which is 100: a perfect score and a King
  -- Slayer badge.
  -- ────────────────────────────────────────────────────────────────────────
  IF LEAST(100, 50::numeric + NULL::numeric) <> 100 THEN
    RAISE EXCEPTION 'Fixture 10 premise: LEAST(100, base + NULL) should be 100 in Postgres';
  END IF;
  IF LEAST(NULL::numeric, 0.5) <> 0.5 THEN
    RAISE EXCEPTION 'Fixture 10 premise: LEAST(NULL, 0.5) should be 0.5 in Postgres';
  END IF;

  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up)
  VALUES
    (v_season_1, v_team_j, 5, 5, 10, 10, 'Nothing Like A Division', 0.50, 0.50, true,  false),
    (v_season_2, v_team_j, 5, 5, 10, 10, 'Nothing Like A Division', 0.50, 0.50, false, true);

  INSERT INTO public.playoff_matches
    (bracket_id, match_type, round, position, status, team1_id, team2_id, winner_id, loser_id)
  VALUES
    (v_bracket_comp, 'winners', 1, 1, 'completed', v_team_j, v_team_opp, v_team_j, v_team_opp);

  v_score := public.calculate_career_power_score(v_team_j);
  IF v_score IS NULL THEN
    RAISE EXCEPTION 'Fixture 10: score must never be NULL';
  END IF;
  IF round(v_score, 4) = 100.0000 THEN
    RAISE EXCEPTION 'Fixture 10: a NULL bonus reached LEAST and gave 100';
  END IF;
  IF round(v_score, 4) <> 50.0000 THEN
    RAISE EXCEPTION 'Fixture 10: expected 50 (cap 0, no bonus), got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 11 — a weight of 0 is a real 0, not "unknown".
  --
  -- Parity K (a 1.00 team) won a title in "Parity Zero Probe" (weight 0). The
  -- title is worth 7 x 0^2 = 0, and the cap is 15 x 0^2 = 0: a rated 0 sets the
  -- cap. It does NOT fall back to the team weight (cap 15), which would let the
  -- one Competitive playoff win (+0.5) through.
  --
  --   total = 50
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up)
  VALUES
    (v_season_1, v_team_k, 5, 5, 10, 10, 'Parity Zero Probe', 0.50, 0.50, true, false);

  INSERT INTO public.playoff_matches
    (bracket_id, match_type, round, position, status, team1_id, team2_id, winner_id, loser_id)
  VALUES
    (v_bracket_comp, 'winners', 1, 2, 'completed', v_team_k, v_team_opp, v_team_k, v_team_opp);

  v_score := public.calculate_career_power_score(v_team_k);
  IF round(v_score, 4) <> 50.0000 THEN
    RAISE EXCEPTION 'Fixture 11: expected 50 (a weight of 0 caps the bonus at 0), got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 12 — a division with no weight does not borrow a base-word weight.
  --
  -- Parity L won a title in "Parityword Nullprobe", which exists and has no
  -- weight. Its first word, "parityword", is a division with weight 0.55. The
  -- matched row is final: the title is unrated and adds 0, instead of
  -- 7 x 0.55^2 = 2.1175.
  --
  --   total = 50
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up)
  VALUES
    (v_season_1, v_team_l, 5, 5, 10, 10, 'Parityword Nullprobe', 0.50, 0.50, true, false);

  v_score := public.calculate_career_power_score(v_team_l);
  IF round(v_score, 4) <> 50.0000 THEN
    RAISE EXCEPTION 'Fixture 12: expected 50 (no base-word fall-through), got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 13 — KNOWN DIFFERENCE FROM TYPESCRIPT: a tab in the name.
  --
  -- btrim() only strips plain spaces, so a tab keeps "<tab>Competitive" from
  -- matching. The title is unrated here (total 50). The app rates it, because
  -- JavaScript trim() strips a tab (7 x 1.00^2, total 57). This pins the SQL side;
  -- the TypeScript side is pinned in divisionBonusWeight.test.ts. A name like this
  -- is not expected in real data.
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up)
  VALUES
    (v_season_1, v_team_m, 5, 5, 10, 10, E'\tCompetitive', 0.50, 0.50, true, false);

  v_score := public.calculate_career_power_score(v_team_m);
  IF round(v_score, 4) <> 50.0000 THEN
    RAISE EXCEPTION 'Fixture 13: expected 50 (a tab is not trimmed), got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 14 — the cap is the HIGHEST rated weight, not the lowest.
  --
  -- Parity N has two rated bonus divisions with DIFFERENT weights: a runner-up
  -- finish in Competitive (1.00) and a title in Intermediate High (0.70). It also
  -- won 20 playoff matches in the Competitive bracket (20 competitive wins), so
  -- the bonus is far above any cap. The total depends on which weight sets the cap:
  --
  --   runner-up = 4 x 1.00^2                =  4
  --   title     = 7 x 0.70^2               =  3.43
  --   win rate  = (1.0 - 0.5) x 4 x 1.00    =  2     (no playoff season: the team
  --                                                  weight, 1.00)
  --   competitive wins = 20 x 0.5           = 10
  --   sum                                   = 19.43
  --   cap = 15 x MAX(1.00, 0.70)^2 = 15     (binds)  -> total 50 + 15 = 65
  --   (a cap built from the LOWEST weight would be 15 x 0.70^2 = 7.35 -> 57.35)
  --
  -- Every division here is known, so the old function gives the same 65.
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up)
  VALUES
    (v_season_1, v_team_n, 5, 5, 10, 10, 'Competitive',       0.50, 0.50, false, true),
    (v_season_2, v_team_n, 5, 5, 10, 10, 'Intermediate High', 0.50, 0.50, true,  false);

  INSERT INTO public.playoff_matches
    (bracket_id, match_type, round, position, status, team1_id, team2_id, winner_id, loser_id)
  SELECT v_bracket_comp, 'winners', 3, n, 'completed', v_team_n, v_team_opp, v_team_n, v_team_opp
  FROM generate_series(1, 20) AS n;

  v_score := public.calculate_career_power_score(v_team_n);
  IF round(v_score, 4) <> 65.0000 THEN
    RAISE EXCEPTION 'Fixture 14: expected 65 (cap from the highest rated weight, 15 x 1.00^2), got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 15 — a base tier word whose division has no weight is unrated.
  --
  -- "Parityroot" is a division with no weight. Parity O won a title in
  -- "Parityroot 3": no exact match, no synthetic label, so the lookup reaches the
  -- base tier word "parityroot", finds that row, and its NULL weight is final. The
  -- title is unrated and adds 0 (not 7 x 0.85^2 = 5.0575, which would be a default
  -- weight handed to a division that has none).
  --
  --   total = 50
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up)
  VALUES
    (v_season_1, v_team_o, 5, 5, 10, 10, 'Parityroot 3', 0.50, 0.50, true, false);

  v_score := public.calculate_career_power_score(v_team_o);
  IF round(v_score, 4) <> 50.0000 THEN
    RAISE EXCEPTION 'Fixture 15: expected 50 (base word with no weight is unrated), got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 16 — a PLAYOFF season can set the cap.
  --
  -- Parity P's only Competitive (1.00) row is a playoff season: it was never
  -- champion or runner-up there. Its title and runner-up finish are both in
  -- Intermediate High (0.70). The cap takes the strongest division across titles,
  -- runner-ups AND playoff seasons, and the bonus is large enough to bind:
  --
  --   title     = 7 x 0.70^2                =  3.43
  --   runner-up = 4 x 0.70^2                =  1.96
  --   win rate  = (1.0 - 0.5) x 4 x 1.00    =  2     (16-0; the one playoff
  --                                                  season is Competitive)
  --   competitive wins = 16 x 0.5           =  8
  --   sum                                   = 15.39
  --   cap = 15 x 1.00^2 = 15                (binds)  -> total 50 + 15 = 65
  --   (a cap that ignored playoff seasons would be 15 x 0.70^2 = 7.35 -> 57.35)
  --
  -- Every division is known, so the old function gives the same 65.
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up, playoff_rank)
  VALUES
    (v_season_1, v_team_p, 5, 5, 10, 10, 'Intermediate High', 0.50, 0.50, true,  false, NULL),
    (v_season_2, v_team_p, 5, 5, 10, 10, 'Intermediate High', 0.50, 0.50, false, true,  NULL),
    (v_season_3, v_team_p, 5, 5, 10, 10, 'Competitive',       0.50, 0.50, false, false, 3);

  INSERT INTO public.playoff_matches
    (bracket_id, match_type, round, position, status, team1_id, team2_id, winner_id, loser_id)
  SELECT v_bracket_comp, 'winners', 5, n, 'completed', v_team_p, v_team_opp, v_team_p, v_team_opp
  FROM generate_series(1, 16) AS n;

  v_score := public.calculate_career_power_score(v_team_p);
  IF round(v_score, 4) <> 65.0000 THEN
    RAISE EXCEPTION 'Fixture 16: expected 65 (a playoff season sets the cap), got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- Fixture 17 — the playoff weight is the AVERAGE of the rated playoff seasons.
  --
  -- Parity Q sits in a 0.50 division and reached the playoffs in two rated
  -- seasons with different weights: Competitive (1.00) and Intermediate High
  -- (0.70). It won 9 playoff matches and lost 1, none of them competitive wins.
  -- No title and no runner-up, so the bonus is small and the cap (15) does not
  -- bind:
  --
  --   playoff weight = (1.00 + 0.70) / 2    =  0.85   (not 1.00, 0.70 or 0.50)
  --   win rate       = 9 / 10 = 0.9
  --   bonus          = (0.9 - 0.5) x 4 x 0.85 = 1.36
  --   total          = 51.36
  --   (the highest weight would give 1.60, the lowest 1.12, the team weight 0.80)
  --
  -- Every division is known, so the old function gives the same 51.36.
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     division_name, power_score, career_power_score, champion, runner_up, playoff_rank)
  VALUES
    (v_season_1, v_team_q, 5, 5, 10, 10, 'Competitive',       0.50, 0.50, false, false, 1),
    (v_season_2, v_team_q, 5, 5, 10, 10, 'Intermediate High', 0.50, 0.50, false, false, 2);

  INSERT INTO public.playoff_matches
    (bracket_id, match_type, round, position, status, team1_id, team2_id, winner_id, loser_id)
  SELECT v_bracket_none, 'winners', 4, n, 'completed', v_team_q, v_team_opp,
         CASE WHEN n <= 9 THEN v_team_q ELSE v_team_opp END,
         CASE WHEN n <= 9 THEN v_team_opp ELSE v_team_q END
  FROM generate_series(1, 10) AS n;

  v_score := public.calculate_career_power_score(v_team_q);
  IF round(v_score, 4) <> 51.3600 THEN
    RAISE EXCEPTION 'Fixture 17: expected 51.36 (playoff weight is the average, 0.85), got %', v_score;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- resolve_division_bonus_weight: the three resolution steps of
  -- src/utils/career/divisionBonusWeight.ts, in order.
  -- ────────────────────────────────────────────────────────────────────────
  v_weight := public.resolve_division_bonus_weight('  CoMpEtItIvE ');
  IF v_weight <> 1.00 THEN
    RAISE EXCEPTION 'Exact match (trimmed, case-folded): expected 1.00, got %', v_weight;
  END IF;

  v_weight := public.resolve_division_bonus_weight('Intermediate 1');
  IF v_weight <> 0.70 THEN
    RAISE EXCEPTION 'Synthetic alias: expected 0.70, got %', v_weight;
  END IF;

  v_weight := public.resolve_division_bonus_weight('Competitive 3');
  IF v_weight <> 1.00 THEN
    RAISE EXCEPTION 'Base tier word: expected 1.00, got %', v_weight;
  END IF;

  -- An unknown, blank or NULL name is UNRATED: NULL, not a guessed weight. It was
  -- the 0.85 default (and 0.25 before that).
  v_weight := public.resolve_division_bonus_weight('Nothing Like A Division');
  IF v_weight IS NOT NULL THEN
    RAISE EXCEPTION 'Unknown division: expected NULL (unrated), got %', v_weight;
  END IF;

  v_weight := public.resolve_division_bonus_weight(NULL);
  IF v_weight IS NOT NULL THEN
    RAISE EXCEPTION 'NULL division: expected NULL (unrated), got %', v_weight;
  END IF;

  v_weight := public.resolve_division_bonus_weight('');
  IF v_weight IS NOT NULL THEN
    RAISE EXCEPTION 'Empty division: expected NULL (unrated), got %', v_weight;
  END IF;

  v_weight := public.resolve_division_bonus_weight('   ');
  IF v_weight IS NOT NULL THEN
    RAISE EXCEPTION 'Blank division: expected NULL (unrated), got %', v_weight;
  END IF;

  -- A real weight of 0 is not unknown.
  v_weight := public.resolve_division_bonus_weight('Parity Zero Probe');
  IF v_weight IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'Weight of 0: expected 0, got %', v_weight;
  END IF;

  -- A division that exists but has no weight is unrated.
  v_weight := public.resolve_division_bonus_weight('Parity Null Probe');
  IF v_weight IS NOT NULL THEN
    RAISE EXCEPTION 'Division with a NULL weight: expected NULL, got %', v_weight;
  END IF;

  -- ... and its answer is final: it does not fall through to the base tier word.
  -- "Parityword Nullprobe" matches a row with no weight, so it is NULL. The word
  -- "parityword" alone is a division with weight 0.55, and a name that only STARTS
  -- with it still takes that weight.
  v_weight := public.resolve_division_bonus_weight('Parityword Nullprobe');
  IF v_weight IS NOT NULL THEN
    RAISE EXCEPTION 'NULL weight must not fall through to a base word: expected NULL, got %', v_weight;
  END IF;

  v_weight := public.resolve_division_bonus_weight('Parityword 7');
  IF v_weight IS DISTINCT FROM 0.55 THEN
    RAISE EXCEPTION 'Base tier word: expected 0.55, got %', v_weight;
  END IF;

  -- The base tier word step too: "Parityroot 3" reaches the division "Parityroot",
  -- which has no weight. That is a match, so the answer is NULL, not a default.
  v_weight := public.resolve_division_bonus_weight('Parityroot 3');
  IF v_weight IS NOT NULL THEN
    RAISE EXCEPTION 'Base word with a NULL weight: expected NULL, got %', v_weight;
  END IF;

  v_weight := public.resolve_division_bonus_weight('Parityroot');
  IF v_weight IS NOT NULL THEN
    RAISE EXCEPTION 'Exact division with a NULL weight: expected NULL, got %', v_weight;
  END IF;

  -- KNOWN DIFFERENCE FROM TYPESCRIPT: btrim() and split_part(' ') only know the
  -- plain space. A tab or a non-breaking space is NOT trimmed and does NOT split
  -- the tier word, so each of these is unrated here. The app rates all four
  -- (JavaScript trim() and split(/\s+/)), at 1.00 for these names. Pinned in
  -- src/utils/career/__tests__/divisionBonusWeight.test.ts.
  v_weight := public.resolve_division_bonus_weight(E'\tCompetitive');
  IF v_weight IS NOT NULL THEN
    RAISE EXCEPTION 'Leading tab: expected NULL (not trimmed), got %', v_weight;
  END IF;

  v_weight := public.resolve_division_bonus_weight(E'Competitive\u00a0');
  IF v_weight IS NOT NULL THEN
    RAISE EXCEPTION 'Trailing non-breaking space: expected NULL (not trimmed), got %', v_weight;
  END IF;

  v_weight := public.resolve_division_bonus_weight(E'Competitive\t3');
  IF v_weight IS NOT NULL THEN
    RAISE EXCEPTION 'Tab before the tier number: expected NULL (no base word), got %', v_weight;
  END IF;

  v_weight := public.resolve_division_bonus_weight(E'Competitive\u00a03');
  IF v_weight IS NOT NULL THEN
    RAISE EXCEPTION 'Non-breaking space before the tier number: expected NULL (no base word), got %', v_weight;
  END IF;

  -- A synthetic label whose target has no weight is unrated too, and does not fall
  -- through to the base tier word. "Intermediate 2" maps to "intermediate low".
  -- Both rows are set here (inside this rolled-back transaction) so the check does
  -- not depend on seed data: "intermediate" gets a real weight that must NOT be
  -- used, "intermediate low" gets none.
  UPDATE public.divisions SET division_weight = 0.70 WHERE lower(btrim(name)) = 'intermediate';
  IF NOT FOUND THEN
    INSERT INTO public.divisions (name, division_weight) VALUES ('Intermediate', 0.70);
  END IF;
  UPDATE public.divisions SET division_weight = NULL WHERE lower(btrim(name)) = 'intermediate low';
  IF NOT FOUND THEN
    INSERT INTO public.divisions (name, division_weight) VALUES ('Intermediate Low', NULL);
  END IF;

  v_weight := public.resolve_division_bonus_weight('Intermediate 2');
  IF v_weight IS NOT NULL THEN
    RAISE EXCEPTION 'Alias to a division with no weight: expected NULL, got %', v_weight;
  END IF;

  v_weight := public.resolve_division_bonus_weight('Intermediate 9');
  IF v_weight IS DISTINCT FROM 0.70 THEN
    RAISE EXCEPTION 'Base tier word "intermediate": expected 0.70, got %', v_weight;
  END IF;

  -- Nothing may ever grant these two functions to signed-in users or the public:
  -- only the database itself calls them.
  IF has_function_privilege('anon', 'public.resolve_division_bonus_weight(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.resolve_division_bonus_weight(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.calculate_career_power_score(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.calculate_career_power_score(uuid)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'anon or authenticated can execute a career bonus function';
  END IF;

  RAISE NOTICE 'career_power_score_parity: all fixtures match the TypeScript totals';
END;
$$;

ROLLBACK;
