-- Undo 20261117120000_unrated_division_career_bonus.sql: an unknown division
-- counts as 0.85 in the career bonus again (and a team with no weight is 0.85).
--
-- NOT A MIGRATION. This file lives outside supabase/migrations/ on purpose: CI
-- replays every migration, and if this were one it would undo the change on
-- every run. Paste it into the Supabase SQL Editor only when you actually want
-- to go back. See docs/OPERATIONS.md section 6f.
--
-- It puts back the two previous function bodies, copied verbatim from
-- 20260901173600_d02f40b1-7217-45fb-ad55-1d751b07566c.sql (the latest
-- definition before the change): resolve_division_bonus_weight() and
-- calculate_career_power_score(). The grants are re-stated: only the database
-- itself calls these two functions, so anon and authenticated stay revoked.
--
-- It changes no table and no stored number, and it does NOT re-check the King
-- Slayer badges: that recheck re-stamps awarded_at. With every live division
-- weighted the old and new bodies give the same number, so no badge moves. If a
-- division was unknown while the new rule was live, a badge may differ until the
-- team next plays.
--
-- Runs in a single transaction. If any step raises, nothing is applied.
--
-- AFTER RUNNING: the migration file is still in the repo, so anyone applying
-- migrations by hand will re-apply the change. Revert the PR too: the app half
-- (the TypeScript change) must go back with it, or the screen and the badge
-- disagree.

BEGIN;

-- ---------------------------------------------------------------------------
-- Division weight for a season's division name (the previous body).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_division_bonus_weight(p_division_name text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  -- DEFAULT_DIVISION_WEIGHT in src/utils/rankingUtils/divisionWeightsCache.ts
  v_default numeric := 0.85;
  v_key     text;
  v_alias   text;
  v_weight  numeric;
BEGIN
  IF p_division_name IS NULL OR btrim(p_division_name) = '' THEN
    RETURN v_default;
  END IF;

  v_key := lower(btrim(p_division_name));

  -- 1. Exact match against a live division name.
  --
  -- divisions.name has no unique constraint, so two rows can normalise to the
  -- same key. fetchDivisionWeightsByName() reads them ordered by name and lets
  -- each overwrite the last, so the greatest name wins; ORDER BY ... DESC picks
  -- the same row.
  SELECT COALESCE(d.division_weight, v_default) INTO v_weight
  FROM public.divisions d
  WHERE lower(btrim(d.name)) = v_key
  ORDER BY d.name DESC, d.id DESC
  LIMIT 1;
  IF FOUND THEN
    RETURN v_weight;
  END IF;

  -- 2. Known synthetic season label.
  v_alias := CASE v_key
    WHEN 'intermediate 1' THEN 'intermediate high'
    WHEN 'intermediate 2' THEN 'intermediate low'
    WHEN 'competitive 1'  THEN 'competitive'
    WHEN 'competitive 2'  THEN 'competitive low'
    WHEN 'recreational 1' THEN 'recreational high'
    WHEN 'recreational 2' THEN 'recreational'
    ELSE NULL
  END;

  IF v_alias IS NOT NULL THEN
    SELECT COALESCE(d.division_weight, v_default) INTO v_weight
    FROM public.divisions d
    WHERE lower(btrim(d.name)) = v_alias
    ORDER BY d.name DESC, d.id DESC
    LIMIT 1;
    IF FOUND THEN
      RETURN v_weight;
    END IF;
  END IF;

  -- 3. Base tier word ("Intermediate 3" -> "intermediate").
  SELECT COALESCE(d.division_weight, v_default) INTO v_weight
  FROM public.divisions d
  WHERE lower(btrim(d.name)) = split_part(v_key, ' ', 1)
  ORDER BY d.name DESC, d.id DESC
  LIMIT 1;
  IF FOUND THEN
    RETURN v_weight;
  END IF;

  RETURN v_default;
END;
$function$;

COMMENT ON FUNCTION public.resolve_division_bonus_weight(text) IS
  'Live divisions.division_weight for a season division name, including the synthetic labels team_season_stats holds. Mirrors src/utils/career/divisionBonusWeight.ts.';

REVOKE EXECUTE ON FUNCTION public.resolve_division_bonus_weight(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_division_bonus_weight(text) FROM anon;

-- ---------------------------------------------------------------------------
-- Career power score (the previous body).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_career_power_score(p_team_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_total_weighted_score numeric := 0;
  v_total_matches int := 0;
  v_base_career_score numeric;
  v_championship_bonus numeric := 0;
  v_runner_up_bonus numeric := 0;
  v_playoff_bonus numeric := 0;
  v_competitive_playoff_bonus numeric := 0;
  v_total_playoff_bonus numeric;
  v_bonus_cap numeric;
  v_max_bonus_weight numeric;
  v_playoff_weight numeric;
  v_team_division_weight numeric;
  v_career_playoff_wins int := 0;
  v_career_playoff_losses int := 0;
  v_competitive_playoff_wins int := 0;
  v_playoff_win_rate numeric;
  v_total_playoff_matches int;
  v_season_rec record;
  v_current_rec record;
  v_champ_rec record;
  v_div_weight numeric;
  v_current_season_id uuid;
BEGIN
  -- The team's current division weight. 0.85 matches
  -- CareerFetchService.ts: `teamData?.divisions?.division_weight || 0.85`.
  SELECT d.division_weight INTO v_team_division_weight
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE t.id = p_team_id;

  IF v_team_division_weight IS NULL THEN
    v_team_division_weight := 0.85;
  END IF;

  SELECT id INTO v_current_season_id
  FROM public.seasons
  WHERE is_active = true
  LIMIT 1;

  -- Historical seasons, weighted by matches played. The current season is
  -- excluded because v_team_details below already represents it.
  -- career_power_score is the floored (earned-schedule) score the career
  -- rankings use; power_score is the fallback for rows written before the two
  -- were split.
  FOR v_season_rec IN
    SELECT COALESCE(career_power_score, power_score) AS season_score,
           match_wins,
           match_losses
    FROM public.team_season_stats
    WHERE team_id = p_team_id
      AND COALESCE(career_power_score, power_score) IS NOT NULL
      AND (v_current_season_id IS NULL OR season_id != v_current_season_id)
  LOOP
    DECLARE
      v_season_matches int;
    BEGIN
      v_season_matches := COALESCE(v_season_rec.match_wins, 0) + COALESCE(v_season_rec.match_losses, 0);
      IF v_season_matches > 0 THEN
        -- team_season_stats holds a 0-1 scale; multiply by 100.
        v_total_weighted_score := v_total_weighted_score + (v_season_rec.season_score * 100 * v_season_matches);
        v_total_matches := v_total_matches + v_season_matches;
      END IF;
    END;
  END LOOP;

  -- Current season, already on a 0-100 scale.
  SELECT COALESCE(career_power_score, power_score) AS season_score, wins, losses
  INTO v_current_rec
  FROM public.v_team_details
  WHERE team_id = p_team_id;

  IF v_current_rec IS NOT NULL AND v_current_rec.season_score IS NOT NULL THEN
    DECLARE
      v_current_matches int;
    BEGIN
      v_current_matches := COALESCE(v_current_rec.wins, 0) + COALESCE(v_current_rec.losses, 0);
      IF v_current_matches > 0 THEN
        v_total_weighted_score := v_total_weighted_score + (v_current_rec.season_score * v_current_matches);
        v_total_matches := v_total_matches + v_current_matches;
      END IF;
    END;
  END IF;

  IF v_total_matches > 0 THEN
    v_base_career_score := v_total_weighted_score / v_total_matches;
  ELSE
    -- A team that has played nothing scores 0, not a mid-table 50. Must match
    -- calculateCareerPowerScore.ts; the parity test asserts both sides.
    v_base_career_score := 0;
  END IF;

  -- Championship bonus, scaled by the SQUARED live weight of the division the
  -- title was won in, so a soft-field title cannot out-earn a hard schedule.
  FOR v_champ_rec IN
    SELECT division_name FROM public.team_season_stats
    WHERE team_id = p_team_id AND champion = true
  LOOP
    v_div_weight := public.resolve_division_bonus_weight(v_champ_rec.division_name);
    v_championship_bonus := v_championship_bonus + (7 * v_div_weight * v_div_weight);
  END LOOP;

  -- Runner-up bonus, same squared scaling.
  FOR v_champ_rec IN
    SELECT division_name FROM public.team_season_stats
    WHERE team_id = p_team_id AND runner_up = true
  LOOP
    v_div_weight := public.resolve_division_bonus_weight(v_champ_rec.division_name);
    v_runner_up_bonus := v_runner_up_bonus + (4 * v_div_weight * v_div_weight);
  END LOOP;

  -- Career playoff record.
  SELECT
    COALESCE(SUM(CASE WHEN pm.winner_id = p_team_id THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pm.loser_id = p_team_id THEN 1 ELSE 0 END), 0)
  INTO v_career_playoff_wins, v_career_playoff_losses
  FROM public.playoff_matches pm
  WHERE (pm.team1_id = p_team_id OR pm.team2_id = p_team_id)
    AND pm.winner_id IS NOT NULL;

  -- Competitive playoff wins. 0.89 matches calculatePlayoffStats.ts.
  SELECT COALESCE(COUNT(*), 0) INTO v_competitive_playoff_wins
  FROM public.playoff_matches pm
  JOIN public.brackets b ON b.id = pm.bracket_id
  JOIN public.divisions d ON d.id = b.division_id
  WHERE pm.winner_id = p_team_id
    AND d.division_weight >= 0.89;

  -- Playoff performance bonus, rated by the divisions the playoff runs actually
  -- happened in, falling back to the team's current division weight.
  SELECT AVG(public.resolve_division_bonus_weight(division_name))
  INTO v_playoff_weight
  FROM public.team_season_stats
  WHERE team_id = p_team_id AND playoff_rank IS NOT NULL;

  IF v_playoff_weight IS NULL THEN
    v_playoff_weight := v_team_division_weight;
  END IF;

  v_total_playoff_matches := v_career_playoff_wins + v_career_playoff_losses;
  IF v_total_playoff_matches > 0 THEN
    v_playoff_win_rate := v_career_playoff_wins::numeric / v_total_playoff_matches;
    v_playoff_bonus := GREATEST(0, (v_playoff_win_rate - 0.5) * 4 * v_playoff_weight);
  END IF;

  v_competitive_playoff_bonus := v_competitive_playoff_wins * 0.5;

  -- The cap is scaled by the strongest division the team earned bonuses in, so a
  -- pile of soft-division titles cannot reach the ceiling a Competitive record
  -- can. With no bonus-qualifying division, it stays tied to a real division.
  SELECT MAX(public.resolve_division_bonus_weight(division_name))
  INTO v_max_bonus_weight
  FROM public.team_season_stats
  WHERE team_id = p_team_id
    AND (champion = true OR runner_up = true OR playoff_rank IS NOT NULL);

  IF v_max_bonus_weight IS NULL THEN
    v_max_bonus_weight := v_team_division_weight;
  END IF;

  v_bonus_cap := 15 * v_max_bonus_weight * v_max_bonus_weight;

  v_total_playoff_bonus := LEAST(v_bonus_cap,
    v_championship_bonus + v_runner_up_bonus + v_playoff_bonus + v_competitive_playoff_bonus
  );

  RETURN LEAST(100, v_base_career_score + v_total_playoff_bonus);
END;
$function$;

COMMENT ON FUNCTION public.calculate_career_power_score(uuid) IS
  'Career power score for badge checks. Must stay identical to src/utils/career/calculateCareerPowerScore.ts; supabase/tests/career_power_score_parity.sql shares fixtures with its unit test.';

-- Re-stated from 20260504143401: CREATE OR REPLACE keeps grants, but a fresh
-- replay of the migrations must end in the same state.
REVOKE EXECUTE ON FUNCTION public.calculate_career_power_score(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_career_power_score(uuid) FROM anon;

-- Re-stated from 20261003192751: only the database itself calls these two
-- functions, so signed-in users stay revoked. No GRANT is added.
REVOKE EXECUTE ON FUNCTION public.resolve_division_bonus_weight(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_career_power_score(uuid) FROM PUBLIC, anon, authenticated;

COMMIT;
