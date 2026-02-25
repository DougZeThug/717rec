-- Fix badge logic: bully (matches not games), consistent_performer (division display name),
-- king_slayer (career power score, 25+ threshold, cross-division, revocation)

-- ============================================================================
-- 1. HELPER: Calculate career power score for a team
--    Replicates src/utils/career/calculateCareerPowerScore.ts in SQL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_career_power_score(p_team_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_total_weighted_score numeric := 0;
  v_total_matches numeric := 0;
  v_base_career_score numeric;
  v_championship_bonus numeric := 0;
  v_runner_up_bonus numeric := 0;
  v_playoff_win_rate_bonus numeric := 0;
  v_competitive_playoff_bonus numeric := 0;
  v_total_playoff_bonus numeric;
  v_team_division_weight numeric;
  v_career_playoff_wins int := 0;
  v_career_playoff_losses int := 0;
  v_comp_playoff_wins int := 0;
  v_playoff_win_rate numeric;
  v_rec record;
  v_current_ps numeric;
  v_current_wins int;
  v_current_losses int;
  v_season_matches int;
  v_champ_weight numeric;
BEGIN
  -- 1. Historical season power scores (weighted by matches played)
  -- team_season_stats stores power_score on 0-1 scale, so multiply by 100
  FOR v_rec IN
    SELECT power_score, match_wins, match_losses
    FROM public.team_season_stats
    WHERE team_id = p_team_id AND power_score IS NOT NULL
  LOOP
    v_season_matches := COALESCE(v_rec.match_wins, 0) + COALESCE(v_rec.match_losses, 0);
    IF v_season_matches > 0 THEN
      v_total_weighted_score := v_total_weighted_score + (v_rec.power_score * 100 * v_season_matches);
      v_total_matches := v_total_matches + v_season_matches;
    END IF;
  END LOOP;

  -- 2. Current season power score (from v_team_power_scores, already 0-100 scale)
  SELECT power_score, wins, losses
  INTO v_current_ps, v_current_wins, v_current_losses
  FROM public.v_team_power_scores
  WHERE team_id = p_team_id;

  IF v_current_ps IS NOT NULL THEN
    v_season_matches := COALESCE(v_current_wins, 0) + COALESCE(v_current_losses, 0);
    IF v_season_matches > 0 THEN
      v_total_weighted_score := v_total_weighted_score + (v_current_ps * v_season_matches);
      v_total_matches := v_total_matches + v_season_matches;
    END IF;
  END IF;

  -- Base career score is weighted average
  IF v_total_matches > 0 THEN
    v_base_career_score := v_total_weighted_score / v_total_matches;
  ELSE
    v_base_career_score := 50;
  END IF;

  -- 3. Championship bonus (+7 * division weight per championship)
  FOR v_rec IN
    SELECT division_name FROM public.team_season_stats
    WHERE team_id = p_team_id AND champion = true
  LOOP
    v_champ_weight := CASE
      WHEN LOWER(COALESCE(v_rec.division_name, '')) LIKE '%competitive%' THEN 1.0
      WHEN LOWER(COALESCE(v_rec.division_name, '')) LIKE '%intermediate high%'
        OR LOWER(COALESCE(v_rec.division_name, '')) LIKE '%intermediate 1%'
        OR LOWER(COALESCE(v_rec.division_name, '')) = 'cuspers' THEN 0.7
      WHEN LOWER(COALESCE(v_rec.division_name, '')) LIKE '%intermediate low%'
        OR LOWER(COALESCE(v_rec.division_name, '')) LIKE '%intermediate 2%'
        OR LOWER(COALESCE(v_rec.division_name, '')) = 'intermediate' THEN 0.45
      ELSE 0.25
    END;
    v_championship_bonus := v_championship_bonus + (7 * v_champ_weight);
  END LOOP;

  -- 4. Runner-up bonus (+4 * division weight per runner-up)
  FOR v_rec IN
    SELECT division_name FROM public.team_season_stats
    WHERE team_id = p_team_id AND runner_up = true
  LOOP
    v_champ_weight := CASE
      WHEN LOWER(COALESCE(v_rec.division_name, '')) LIKE '%competitive%' THEN 1.0
      WHEN LOWER(COALESCE(v_rec.division_name, '')) LIKE '%intermediate high%'
        OR LOWER(COALESCE(v_rec.division_name, '')) LIKE '%intermediate 1%'
        OR LOWER(COALESCE(v_rec.division_name, '')) = 'cuspers' THEN 0.7
      WHEN LOWER(COALESCE(v_rec.division_name, '')) LIKE '%intermediate low%'
        OR LOWER(COALESCE(v_rec.division_name, '')) LIKE '%intermediate 2%'
        OR LOWER(COALESCE(v_rec.division_name, '')) = 'intermediate' THEN 0.45
      ELSE 0.25
    END;
    v_runner_up_bonus := v_runner_up_bonus + (4 * v_champ_weight);
  END LOOP;

  -- 5. Playoff win-rate bonus
  SELECT COALESCE(d.division_weight, 0.85)
  INTO v_team_division_weight
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE t.id = p_team_id;

  IF v_team_division_weight IS NULL THEN
    v_team_division_weight := 0.85;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN pm.winner_id = p_team_id THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pm.loser_id = p_team_id THEN 1 ELSE 0 END), 0)
  INTO v_career_playoff_wins, v_career_playoff_losses
  FROM public.playoff_matches pm
  WHERE (pm.team1_id = p_team_id OR pm.team2_id = p_team_id)
    AND pm.winner_id IS NOT NULL;

  IF (v_career_playoff_wins + v_career_playoff_losses) > 0 THEN
    v_playoff_win_rate := v_career_playoff_wins::numeric / (v_career_playoff_wins + v_career_playoff_losses)::numeric;
    v_playoff_win_rate_bonus := GREATEST(0, (v_playoff_win_rate - 0.5) * 4 * v_team_division_weight);
  END IF;

  -- 6. Competitive playoff bonus (+0.5 per win in competitive division playoffs)
  SELECT COALESCE(COUNT(*), 0)
  INTO v_comp_playoff_wins
  FROM public.playoff_matches pm
  JOIN public.brackets b ON b.id = pm.bracket_id
  JOIN public.divisions d ON d.id = b.division_id
  WHERE pm.winner_id = p_team_id
    AND d.division_weight >= 1.0;

  v_competitive_playoff_bonus := v_comp_playoff_wins * 0.5;

  -- Total playoff bonus (capped at 15)
  v_total_playoff_bonus := LEAST(15,
    v_championship_bonus + v_runner_up_bonus + v_playoff_win_rate_bonus + v_competitive_playoff_bonus
  );

  -- Final career power score (capped at 100)
  RETURN LEAST(100, v_base_career_score + v_total_playoff_bonus);
END;
$$;


-- ============================================================================
-- 2. FIX: award_bully_badge - count MATCH wins, not game wins
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_bully_badge(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_active_season_id uuid;
  v_team_division_weight numeric;
  v_bully_match_wins int := 0;
  v_should_have_badge boolean := false;
  v_existing_badge_id uuid;
  v_result jsonb;
BEGIN
  -- Get active season
  SELECT id INTO v_active_season_id FROM public.seasons WHERE is_active = true LIMIT 1;

  IF v_active_season_id IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'No active season');
  END IF;

  -- Get this team's division weight
  SELECT d.division_weight INTO v_team_division_weight
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE t.id = p_team_id;

  IF v_team_division_weight IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'Team has no division');
  END IF;

  -- Count MATCH wins (not game wins) against teams with 20+ lower division weight this season
  SELECT COUNT(*) INTO v_bully_match_wins
  FROM public.matches m
  JOIN public.teams opp_team ON opp_team.id =
    CASE WHEN m.team1_id = p_team_id THEN m.team2_id ELSE m.team1_id END
  JOIN public.divisions opp_div ON opp_div.id = opp_team.division_id
  WHERE (m.team1_id = p_team_id OR m.team2_id = p_team_id)
    AND m.winner_id = p_team_id
    AND m.iscompleted = true
    AND m.season_id = v_active_season_id
    AND (v_team_division_weight - opp_div.division_weight) > 20;

  -- Need 4+ match wins against lower division teams
  v_should_have_badge := (v_bully_match_wins >= 4);

  -- Check for existing badge
  SELECT id INTO v_existing_badge_id
  FROM public.team_badge_events
  WHERE team_id = p_team_id
    AND badge_type = 'bully'
    AND season_id = v_active_season_id
    AND is_active = true;

  IF v_should_have_badge AND v_existing_badge_id IS NULL THEN
    INSERT INTO public.team_badge_events (team_id, badge_type, season_id, metadata, is_active)
    VALUES (p_team_id, 'bully', v_active_season_id,
            jsonb_build_object('match_wins_vs_lower_division', v_bully_match_wins), true);
    v_result := jsonb_build_object('awarded', true, 'badge_type', 'bully');
  ELSIF NOT v_should_have_badge AND v_existing_badge_id IS NOT NULL THEN
    UPDATE public.team_badge_events SET is_active = false WHERE id = v_existing_badge_id;
    v_result := jsonb_build_object('removed', true, 'badge_type', 'bully');
  ELSE
    v_result := jsonb_build_object('no_change', true, 'match_wins_vs_lower', v_bully_match_wins);
  END IF;

  RETURN v_result;
END;
$function$;


-- ============================================================================
-- 3. FIX: award_consistent_performer_badge - store division display name
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_consistent_performer_badge(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  teams_beaten_count integer;
  consistent_threshold integer := 5;
  result jsonb := '{"awarded": false, "teams_beaten": 0}'::jsonb;
  current_season_id uuid;
  team_division_id uuid;
  team_division_display_name text;
BEGIN
  -- Get current active season
  SELECT id INTO current_season_id
  FROM public.seasons
  WHERE is_active = true
  LIMIT 1;

  -- Get the team's division and its display name
  SELECT t.division_id, COALESCE(d.display_division, d.name)
  INTO team_division_id, team_division_display_name
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE t.id = p_team_id;

  -- Count unique teams beaten in the same division during current season
  SELECT COUNT(DISTINCT loser_team.id) INTO teams_beaten_count
  FROM public.matches m
  JOIN public.teams winner_team ON m.winner_id = winner_team.id
  JOIN public.teams loser_team ON m.loser_id = loser_team.id
  WHERE m.iscompleted = true
    AND m.winner_id = p_team_id
    AND m.season_id = current_season_id
    AND winner_team.division_id = loser_team.division_id
    AND winner_team.division_id = team_division_id;

  -- Update result with teams beaten count
  result := jsonb_set(result, '{teams_beaten}', to_jsonb(teams_beaten_count));
  result := jsonb_set(result, '{division_name}', to_jsonb(team_division_display_name));

  -- Check if consistent performer threshold is met
  IF teams_beaten_count >= consistent_threshold THEN
    -- Award consistent performer badge
    INSERT INTO public.team_badge_events (team_id, badge_type, season_id, metadata)
    VALUES (p_team_id, 'consistent_performer', current_season_id,
            jsonb_build_object(
              'teams_beaten_count', teams_beaten_count,
              'threshold_met', consistent_threshold,
              'division_name', team_division_display_name
            ))
    ON CONFLICT (team_id, badge_type, season_id)
    DO UPDATE SET
      is_active = true,
      awarded_at = now(),
      metadata = jsonb_build_object(
        'teams_beaten_count', teams_beaten_count,
        'threshold_met', consistent_threshold,
        'division_name', team_division_display_name
      );

    result := jsonb_set(result, '{awarded}', 'true'::jsonb);
    result := jsonb_set(result, '{message}', '"Consistent Performer badge awarded!"'::jsonb);
  ELSE
    -- Revoke badge if threshold no longer met
    UPDATE public.team_badge_events
    SET is_active = false
    WHERE team_id = p_team_id
      AND badge_type = 'consistent_performer'
      AND season_id = current_season_id
      AND is_active = true;

    result := jsonb_set(result, '{message}', to_jsonb(format('Need %s more unique teams beaten in division for Consistent Performer badge', consistent_threshold - teams_beaten_count)));
  END IF;

  RETURN result;
END;
$$;


-- ============================================================================
-- 4. FIX: award_kingslayer_badge - career power score, 25+ threshold,
--    cross-division requirement, revocation logic
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_kingslayer_badge(p_winner_id uuid, p_loser_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  winner_career_ps numeric;
  loser_career_ps numeric;
  career_ps_diff numeric;
  kingslayer_threshold numeric := 25;
  winner_division_weight numeric;
  loser_division_weight numeric;
  result jsonb := '{"awarded": false, "career_power_score_diff": 0}'::jsonb;
  current_season_id uuid;
BEGIN
  -- Get current active season
  SELECT id INTO current_season_id
  FROM public.seasons
  WHERE is_active = true
  LIMIT 1;

  -- Get division weights for cross-division check
  SELECT d.division_weight INTO winner_division_weight
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE t.id = p_winner_id;

  SELECT d.division_weight INTO loser_division_weight
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE t.id = p_loser_id;

  -- Cross-division check: loser must be from a higher-weighted (tougher) division
  IF winner_division_weight IS NULL OR loser_division_weight IS NULL THEN
    RETURN jsonb_set(result, '{message}', '"Division data not available for one or both teams"'::jsonb);
  END IF;

  IF loser_division_weight <= winner_division_weight THEN
    -- Same or lower division - not eligible for King Slayer
    -- Check if there's an existing badge that should be revoked
    UPDATE public.team_badge_events
    SET is_active = false
    WHERE team_id = p_winner_id
      AND badge_type = 'king_slayer'
      AND season_id = current_season_id
      AND is_active = true;

    RETURN jsonb_set(result, '{message}', '"Opponent is not from a tougher division"'::jsonb);
  END IF;

  -- Calculate career power scores for both teams
  winner_career_ps := public.calculate_career_power_score(p_winner_id);
  loser_career_ps := public.calculate_career_power_score(p_loser_id);

  -- If either team doesn't have meaningful career data, skip
  IF winner_career_ps IS NULL OR loser_career_ps IS NULL THEN
    RETURN jsonb_set(result, '{message}', '"Career power score data not available"'::jsonb);
  END IF;

  -- Calculate career power score difference (loser - winner)
  career_ps_diff := loser_career_ps - winner_career_ps;

  -- Update result with calculated values
  result := jsonb_set(result, '{career_power_score_diff}', to_jsonb(career_ps_diff));
  result := jsonb_set(result, '{winner_career_power_score}', to_jsonb(winner_career_ps));
  result := jsonb_set(result, '{loser_career_power_score}', to_jsonb(loser_career_ps));

  -- Check if kingslayer threshold is met (25+ career power score gap)
  IF career_ps_diff >= kingslayer_threshold THEN
    -- Award kingslayer badge to the winner
    INSERT INTO public.team_badge_events (team_id, badge_type, season_id, metadata)
    VALUES (p_winner_id, 'king_slayer', current_season_id,
            jsonb_build_object(
              'career_power_score_diff', career_ps_diff,
              'opponent_career_power_score', loser_career_ps,
              'winner_career_power_score', winner_career_ps,
              'winner_division_weight', winner_division_weight,
              'loser_division_weight', loser_division_weight
            ))
    ON CONFLICT (team_id, badge_type, season_id)
    DO UPDATE SET
      is_active = true,
      awarded_at = now(),
      metadata = jsonb_build_object(
        'career_power_score_diff', career_ps_diff,
        'opponent_career_power_score', loser_career_ps,
        'winner_career_power_score', winner_career_ps,
        'winner_division_weight', winner_division_weight,
        'loser_division_weight', loser_division_weight
      );

    result := jsonb_set(result, '{awarded}', 'true'::jsonb);
    result := jsonb_set(result, '{message}', '"Kingslayer badge awarded!"'::jsonb);
  ELSE
    -- Revoke badge if threshold no longer met
    UPDATE public.team_badge_events
    SET is_active = false
    WHERE team_id = p_winner_id
      AND badge_type = 'king_slayer'
      AND season_id = current_season_id
      AND is_active = true;

    result := jsonb_set(result, '{message}', '"Career power score difference below 25-point threshold"'::jsonb);
  END IF;

  RETURN result;
END;
$$;
