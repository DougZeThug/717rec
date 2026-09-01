\set ON_ERROR_STOP on

-- Career power score: the database must agree with the app.
--
-- calculate_career_power_score() (20260901120000_career_power_score_match_app.sql)
-- decides the King Slayer badge. src/utils/career/calculateCareerPowerScore.ts
-- produces the number shown on screen. They have to be the same number, and
-- they drifted apart for months without anything noticing — see B-35 in
-- docs/product-description/bug-triage.md.
--
-- The four fixtures below are asserted with the SAME inputs and the SAME
-- expected totals in
-- src/utils/career/__tests__/calculateCareerPowerScore.test.ts
-- ("shares fixtures with supabase/tests/career_power_score_parity.sql").
-- Change one side and the other fails.
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
  v_score numeric;
  v_weight numeric;
BEGIN
  PERFORM set_config('session_replication_role', 'replica', true);

  DELETE FROM public.team_season_stats WHERE team_id IN (v_team_a, v_team_b, v_team_c, v_team_d);
  DELETE FROM public.teams WHERE id IN (v_team_a, v_team_b, v_team_c, v_team_d);
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

  -- DEFAULT_DIVISION_WEIGHT in divisionWeightsCache.ts. The old SQL used 0.25.
  v_weight := public.resolve_division_bonus_weight('Nothing Like A Division');
  IF v_weight <> 0.85 THEN
    RAISE EXCEPTION 'Unknown division: expected the 0.85 default, got %', v_weight;
  END IF;

  v_weight := public.resolve_division_bonus_weight(NULL);
  IF v_weight <> 0.85 THEN
    RAISE EXCEPTION 'NULL division: expected the 0.85 default, got %', v_weight;
  END IF;

  RAISE NOTICE 'career_power_score_parity: all fixtures match the TypeScript totals';
END;
$$;

ROLLBACK;
