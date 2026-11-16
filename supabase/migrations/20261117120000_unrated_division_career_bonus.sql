-- Career bonus: a division with no known weight is UNRATED, not 0.85.
--
-- Doug's rule (2026-11-13, "Treat as unrated", docs/agents/LEAGUE_CONTEXT.md):
-- when a division is genuinely unknown, leave it out of the career bonus
-- instead of guessing a weight. The season Power Score already does this for
-- an unrated opponent. This file is the SQL half of the change. The app half is
-- src/utils/career/divisionBonusWeight.ts and
-- src/services/career/calculateCareerPowerScore.ts, and the two must give the
-- same number (B-35 in docs/product-description/bug-triage.md).
--
-- What "unrated" means (the same in TypeScript and here):
--   * Unrated = a blank name, a name that matches no division, or a matched
--     division with a NULL weight. A weight of 0 is a real 0.
--   * resolve_division_bonus_weight() returns NULL for an unrated name. A
--     matched division with a NULL weight stops the lookup: it does NOT fall
--     through to a synthetic label or a base tier word.
--   * Title and runner-up bonus: an unrated one adds 0.
--   * Playoff win-rate weight: the average over RATED seasons only. With none
--     rated it uses the team's current weight. If that is unrated too, the
--     win-rate bonus is 0. The win rate itself still counts every playoff match.
--   * Bonus cap: 15 x (the highest RATED weight)^2. With none rated it uses the
--     team's current weight. If that is unrated too, the cap is 0 and the whole
--     bonus is 0.
--   * The team's current weight has no default any more. A stored 0 stays 0.
--   * Not changed: the competitive-playoff count (an unknown bracket is not
--     counted, in both places), Hidden division names, the season Power Score.
--
-- No number changes today. A live read Doug shared on 2026-11-13 found every
-- division weighted and every champion, runner-up and playoff season name
-- matching a division. This is for the day a division is renamed (past seasons
-- find their weight by division NAME) or an odd name is typed in the History
-- editor.
--
-- Changed, and nothing else: the two functions below (CREATE OR REPLACE, so
-- every grant, dependency and signature is kept). Their other lines are copied
-- verbatim from 20260901173600. The badge recheck at the foot of that file is
-- NOT repeated here: it re-stamps awarded_at, and no number changes today.
-- Nothing is stored. No table, view or history row is touched.
--
-- Trap: LEAST() skips a NULL argument. LEAST(100, NULL) is 100 and
-- LEAST(NULL, x) is x. A NULL bonus would give a perfect score and a King Slayer
-- badge, and a NULL cap would remove the cap. Both are COALESCEd below, and
-- supabase/tests/career_power_score_parity.sql proves it.
--
-- KNOWN DIFFERENCE FROM TYPESCRIPT: btrim() and split_part(' ') only know the
-- plain space. A name with a tab or a non-breaking space is unrated here, but the
-- app (JavaScript trim() and split(/\s+/)) rates it. The parity test pins both.
--
-- HAND-APPLY, DATABASE FIRST. A merged migration does not reach production
-- (docs/OPERATIONS.md section 6). Apply this file in the Supabase SQL Editor
-- BEFORE the pull request is merged, so the badge and the screen never disagree.
-- Steps and the before/after check: docs/OPERATIONS.md section 6f.
--
-- Re-apply: this file is CREATE OR REPLACE, so running it again is safe.
-- Revert: paste supabase/scripts/revert_unrated_division_bonus.sql. It puts both
-- OLD function bodies back (0.85 for an unknown division). It is not a migration,
-- on purpose: CI replays every migration, and a migration would undo this one on
-- every run. Then revert the pull request, or the next hand-apply rolls forward.

-- ---------------------------------------------------------------------------
-- Division weight for a season's division name. NULL = unrated.
--
-- The SQL twin of src/utils/career/divisionBonusWeight.ts. Weight values are
-- never written here: only the name mapping lives in code, because
-- team_season_stats.division_name holds synthetic labels ("Intermediate 1")
-- that match no row in `divisions`. See src/utils/powerScore/README.md.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_division_bonus_weight(p_division_name text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_key     text;
  v_alias   text;
  v_weight  numeric;
BEGIN
  IF p_division_name IS NULL OR btrim(p_division_name) = '' THEN
    RETURN NULL;
  END IF;

  v_key := lower(btrim(p_division_name));

  -- 1. Exact match against a live division name.
  --
  -- divisions.name has no unique constraint, so two rows can normalise to the
  -- same key. fetchDivisionWeightsByName() reads them ordered by name and lets
  -- each overwrite the last, so the greatest name wins; ORDER BY ... DESC picks
  -- the same row.
  --
  -- A matched row is final, even when its weight is NULL: FOUND is true and
  -- v_weight is NULL, so the answer is NULL (unrated). It must not fall through
  -- to the steps below, or a division with no weight would borrow the weight of
  -- an alias or a base tier word.
  SELECT d.division_weight INTO v_weight
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
    SELECT d.division_weight INTO v_weight
    FROM public.divisions d
    WHERE lower(btrim(d.name)) = v_alias
    ORDER BY d.name DESC, d.id DESC
    LIMIT 1;
    IF FOUND THEN
      RETURN v_weight;
    END IF;
  END IF;

  -- 3. Base tier word ("Intermediate 3" -> "intermediate").
  SELECT d.division_weight INTO v_weight
  FROM public.divisions d
  WHERE lower(btrim(d.name)) = split_part(v_key, ' ', 1)
  ORDER BY d.name DESC, d.id DESC
  LIMIT 1;
  IF FOUND THEN
    RETURN v_weight;
  END IF;

  -- Nothing matched: unrated. There is no default weight.
  RETURN NULL;
END;
$function$;

COMMENT ON FUNCTION public.resolve_division_bonus_weight(text) IS
  'Live divisions.division_weight for a season division name, including the synthetic labels team_season_stats holds. Mirrors src/utils/career/divisionBonusWeight.ts. Returns NULL (unrated) for a blank name, a name that matches no division, or a matched division with no weight. A weight of 0 is a real 0.';

REVOKE EXECUTE ON FUNCTION public.resolve_division_bonus_weight(text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Career power score. Mirrors src/services/career/calculateCareerPowerScore.ts.
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
  -- The team's current division weight. NULL means unrated: the team has no
  -- division, or its division has no weight. There is no default any more. A
  -- stored weight of 0 is a real 0 and stays 0. Matches CareerFetchService.ts:
  -- `teamData?.divisions?.division_weight ?? null`.
  SELECT d.division_weight INTO v_team_division_weight
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE t.id = p_team_id;

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
  -- title was won in, so a soft-field title cannot out-earn a hard schedule. A
  -- title in an unrated division (no weight) adds 0. The title still counts as a
  -- title on screen; it just earns no bonus points here.
  FOR v_champ_rec IN
    SELECT division_name FROM public.team_season_stats
    WHERE team_id = p_team_id AND champion = true
  LOOP
    v_div_weight := public.resolve_division_bonus_weight(v_champ_rec.division_name);
    IF v_div_weight IS NOT NULL THEN
      v_championship_bonus := v_championship_bonus + (7 * v_div_weight * v_div_weight);
    END IF;
  END LOOP;

  -- Runner-up bonus, same squared scaling. An unrated division adds 0.
  FOR v_champ_rec IN
    SELECT division_name FROM public.team_season_stats
    WHERE team_id = p_team_id AND runner_up = true
  LOOP
    v_div_weight := public.resolve_division_bonus_weight(v_champ_rec.division_name);
    IF v_div_weight IS NOT NULL THEN
      v_runner_up_bonus := v_runner_up_bonus + (4 * v_div_weight * v_div_weight);
    END IF;
  END LOOP;

  -- Career playoff record.
  SELECT
    COALESCE(SUM(CASE WHEN pm.winner_id = p_team_id THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pm.loser_id = p_team_id THEN 1 ELSE 0 END), 0)
  INTO v_career_playoff_wins, v_career_playoff_losses
  FROM public.playoff_matches pm
  WHERE (pm.team1_id = p_team_id OR pm.team2_id = p_team_id)
    AND pm.winner_id IS NOT NULL;

  -- Competitive playoff wins. 0.89 matches calculatePlayoffStats.ts. This block
  -- needs no change for the unrated-division rule: a bracket whose division has
  -- no weight (NULL >= 0.89 is not true) is not counted, the same as the app,
  -- where a missing bracket weight reads as 0.85 and is not competitive.
  SELECT COALESCE(COUNT(*), 0) INTO v_competitive_playoff_wins
  FROM public.playoff_matches pm
  JOIN public.brackets b ON b.id = pm.bracket_id
  JOIN public.divisions d ON d.id = b.division_id
  WHERE pm.winner_id = p_team_id
    AND d.division_weight >= 0.89;

  -- Playoff performance bonus, rated by the RATED divisions the playoff runs
  -- actually happened in. AVG() skips the NULL an unrated season resolves to, so
  -- it averages over rated seasons only (sum and count). With no rated season it
  -- falls back to the team's current division weight. If that is unrated too, the
  -- win-rate bonus is 0. The win rate itself still counts every playoff match.
  SELECT AVG(public.resolve_division_bonus_weight(division_name))
  INTO v_playoff_weight
  FROM public.team_season_stats
  WHERE team_id = p_team_id AND playoff_rank IS NOT NULL;

  IF v_playoff_weight IS NULL THEN
    v_playoff_weight := v_team_division_weight;
  END IF;

  v_total_playoff_matches := v_career_playoff_wins + v_career_playoff_losses;
  IF v_total_playoff_matches > 0 AND v_playoff_weight IS NOT NULL THEN
    v_playoff_win_rate := v_career_playoff_wins::numeric / v_total_playoff_matches;
    v_playoff_bonus := GREATEST(0, (v_playoff_win_rate - 0.5) * 4 * v_playoff_weight);
  END IF;

  v_competitive_playoff_bonus := v_competitive_playoff_wins * 0.5;

  -- The cap is scaled by the strongest RATED division the team earned bonuses in
  -- (MAX() skips the NULL an unrated division resolves to), so a pile of
  -- soft-division titles cannot reach the ceiling a Competitive record can. With
  -- no rated bonus division it stays tied to the team's current division. If that
  -- is unrated too, the cap is 0: the whole bonus is 0.
  SELECT MAX(public.resolve_division_bonus_weight(division_name))
  INTO v_max_bonus_weight
  FROM public.team_season_stats
  WHERE team_id = p_team_id
    AND (champion = true OR runner_up = true OR playoff_rank IS NOT NULL);

  IF v_max_bonus_weight IS NULL THEN
    v_max_bonus_weight := v_team_division_weight;
  END IF;

  -- COALESCE is required. Without a weight the cap would be NULL, and LEAST()
  -- skips a NULL argument, so the bonus would be left uncapped.
  v_bonus_cap := 15 * COALESCE(v_max_bonus_weight, 0) * COALESCE(v_max_bonus_weight, 0);

  v_total_playoff_bonus := LEAST(v_bonus_cap,
    v_championship_bonus + v_runner_up_bonus + v_playoff_bonus + v_competitive_playoff_bonus
  );

  -- COALESCE is required here too. LEAST() skips a NULL argument, so
  -- LEAST(100, base + NULL) is 100: a NULL bonus would give a perfect score and
  -- a King Slayer badge. Nothing above can produce a NULL bonus now, so this is
  -- the safety net for the next edit.
  RETURN LEAST(100, v_base_career_score + COALESCE(v_total_playoff_bonus, 0));
END;
$function$;

COMMENT ON FUNCTION public.calculate_career_power_score(uuid) IS
  'Career power score for badge checks. Must stay identical to src/services/career/calculateCareerPowerScore.ts; supabase/tests/career_power_score_parity.sql shares fixtures with its unit test. A division with no known weight is unrated: it adds nothing to the bonus.';

-- Re-stated from 20260504143401 and 20261003192751: CREATE OR REPLACE keeps
-- grants, but a fresh replay of the migrations must end in the same state. No
-- GRANT is added: only the database itself calls this function.
REVOKE EXECUTE ON FUNCTION public.calculate_career_power_score(uuid) FROM PUBLIC, anon, authenticated;
