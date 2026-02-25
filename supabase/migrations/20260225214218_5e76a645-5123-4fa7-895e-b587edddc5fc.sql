
-- 1. Create calculate_career_power_score() helper function
-- Replicates the TypeScript career power score logic in SQL
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
BEGIN
  -- Get team's current division weight
  SELECT d.division_weight INTO v_team_division_weight
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE t.id = p_team_id;

  IF v_team_division_weight IS NULL THEN
    v_team_division_weight := 0.25;
  END IF;

  -- Historical season power scores weighted by matches played
  FOR v_season_rec IN
    SELECT power_score, match_wins, match_losses
    FROM public.team_season_stats
    WHERE team_id = p_team_id
      AND power_score IS NOT NULL
  LOOP
    DECLARE
      v_season_matches int;
    BEGIN
      v_season_matches := COALESCE(v_season_rec.match_wins, 0) + COALESCE(v_season_rec.match_losses, 0);
      IF v_season_matches > 0 THEN
        -- power_score is 0-1 scale, multiply by 100
        v_total_weighted_score := v_total_weighted_score + (v_season_rec.power_score * 100 * v_season_matches);
        v_total_matches := v_total_matches + v_season_matches;
      END IF;
    END;
  END LOOP;

  -- Current season data from v_team_details (power_score already 0-100)
  SELECT power_score, wins, losses INTO v_current_rec
  FROM public.v_team_details
  WHERE team_id = p_team_id;

  IF v_current_rec IS NOT NULL AND v_current_rec.power_score IS NOT NULL THEN
    DECLARE
      v_current_matches int;
    BEGIN
      v_current_matches := COALESCE(v_current_rec.wins, 0) + COALESCE(v_current_rec.losses, 0);
      IF v_current_matches > 0 THEN
        v_total_weighted_score := v_total_weighted_score + (v_current_rec.power_score * v_current_matches);
        v_total_matches := v_total_matches + v_current_matches;
      END IF;
    END;
  END IF;

  -- Base career score
  IF v_total_matches > 0 THEN
    v_base_career_score := v_total_weighted_score / v_total_matches;
  ELSE
    v_base_career_score := 50;
  END IF;

  -- Championship bonus scaled by division weight
  FOR v_champ_rec IN
    SELECT division_name FROM public.team_season_stats
    WHERE team_id = p_team_id AND champion = true
  LOOP
    v_div_weight := CASE
      WHEN lower(v_champ_rec.division_name) LIKE '%competitive%' THEN 1.0
      WHEN lower(v_champ_rec.division_name) LIKE '%intermediate high%'
        OR lower(v_champ_rec.division_name) LIKE '%intermediate 1%'
        OR lower(v_champ_rec.division_name) = 'cuspers' THEN 0.7
      WHEN lower(v_champ_rec.division_name) LIKE '%intermediate low%'
        OR lower(v_champ_rec.division_name) LIKE '%intermediate 2%'
        OR lower(v_champ_rec.division_name) = 'intermediate' THEN 0.45
      ELSE 0.25
    END;
    v_championship_bonus := v_championship_bonus + (7 * v_div_weight);
  END LOOP;

  -- Runner-up bonus scaled by division weight
  FOR v_champ_rec IN
    SELECT division_name FROM public.team_season_stats
    WHERE team_id = p_team_id AND runner_up = true
  LOOP
    v_div_weight := CASE
      WHEN lower(v_champ_rec.division_name) LIKE '%competitive%' THEN 1.0
      WHEN lower(v_champ_rec.division_name) LIKE '%intermediate high%'
        OR lower(v_champ_rec.division_name) LIKE '%intermediate 1%'
        OR lower(v_champ_rec.division_name) = 'cuspers' THEN 0.7
      WHEN lower(v_champ_rec.division_name) LIKE '%intermediate low%'
        OR lower(v_champ_rec.division_name) LIKE '%intermediate 2%'
        OR lower(v_champ_rec.division_name) = 'intermediate' THEN 0.45
      ELSE 0.25
    END;
    v_runner_up_bonus := v_runner_up_bonus + (4 * v_div_weight);
  END LOOP;

  -- Career playoff wins/losses
  SELECT
    COALESCE(SUM(CASE WHEN pm.winner_id = p_team_id THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pm.loser_id = p_team_id THEN 1 ELSE 0 END), 0)
  INTO v_career_playoff_wins, v_career_playoff_losses
  FROM public.playoff_matches pm
  WHERE (pm.team1_id = p_team_id OR pm.team2_id = p_team_id)
    AND pm.winner_id IS NOT NULL;

  -- Competitive playoff wins
  SELECT COALESCE(COUNT(*), 0) INTO v_competitive_playoff_wins
  FROM public.playoff_matches pm
  JOIN public.brackets b ON b.id = pm.bracket_id
  JOIN public.divisions d ON d.id = b.division_id
  WHERE pm.winner_id = p_team_id
    AND d.division_weight >= 0.9;

  -- Playoff performance bonus
  v_total_playoff_matches := v_career_playoff_wins + v_career_playoff_losses;
  IF v_total_playoff_matches > 0 THEN
    v_playoff_win_rate := v_career_playoff_wins::numeric / v_total_playoff_matches;
    v_playoff_bonus := GREATEST(0, (v_playoff_win_rate - 0.5) * 4 * v_team_division_weight);
  END IF;

  -- Competitive playoff bonus
  v_competitive_playoff_bonus := v_competitive_playoff_wins * 0.5;

  -- Total playoff bonus capped at 15
  v_total_playoff_bonus := LEAST(15,
    v_championship_bonus + v_runner_up_bonus + v_playoff_bonus + v_competitive_playoff_bonus
  );

  RETURN LEAST(100, v_base_career_score + v_total_playoff_bonus);
END;
$function$;


-- 2. Updated award_kingslayer_badge: uses career power score gap (25+) and cross-division requirement
CREATE OR REPLACE FUNCTION public.award_kingslayer_badge(p_winner_id uuid, p_loser_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_winner_career_score numeric;
  v_loser_career_score numeric;
  v_career_score_gap numeric;
  v_winner_division_weight numeric;
  v_loser_division_weight numeric;
  v_kingslayer_threshold numeric := 25; -- 25+ career power score gap
  result jsonb := '{"awarded": false, "career_score_gap": 0}'::jsonb;
  current_season_id uuid;
BEGIN
  -- Get current active season
  SELECT id INTO current_season_id
  FROM public.seasons
  WHERE is_active = true
  LIMIT 1;

  -- Get division weights for cross-division check
  SELECT d.division_weight INTO v_winner_division_weight
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE t.id = p_winner_id;

  SELECT d.division_weight INTO v_loser_division_weight
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE t.id = p_loser_id;

  -- Both teams must have division data
  IF v_winner_division_weight IS NULL OR v_loser_division_weight IS NULL THEN
    RETURN jsonb_set(result, '{message}', '"Division data not available"'::jsonb);
  END IF;

  -- Cross-division requirement: loser must be from a higher-weighted (tougher) division
  IF v_loser_division_weight <= v_winner_division_weight THEN
    -- Revoke if conditions no longer met
    UPDATE public.team_badge_events SET is_active = false
    WHERE team_id = p_winner_id
      AND badge_type = 'king_slayer'
      AND season_id = current_season_id
      AND is_active = true;
    RETURN jsonb_set(result, '{message}', '"Opponent not from a tougher division"'::jsonb);
  END IF;

  -- Calculate career power scores
  v_winner_career_score := public.calculate_career_power_score(p_winner_id);
  v_loser_career_score := public.calculate_career_power_score(p_loser_id);

  -- Career score gap (loser - winner)
  v_career_score_gap := v_loser_career_score - v_winner_career_score;

  result := jsonb_set(result, '{career_score_gap}', to_jsonb(v_career_score_gap));
  result := jsonb_set(result, '{winner_career_score}', to_jsonb(v_winner_career_score));
  result := jsonb_set(result, '{loser_career_score}', to_jsonb(v_loser_career_score));

  IF v_career_score_gap >= v_kingslayer_threshold THEN
    INSERT INTO public.team_badge_events (team_id, badge_type, season_id, metadata)
    VALUES (p_winner_id, 'king_slayer', current_season_id,
            jsonb_build_object(
              'career_score_gap', v_career_score_gap,
              'winner_career_score', v_winner_career_score,
              'loser_career_score', v_loser_career_score,
              'opponent_division_weight', v_loser_division_weight,
              'winner_division_weight', v_winner_division_weight
            ))
    ON CONFLICT (team_id, badge_type, season_id)
    DO UPDATE SET
      is_active = true,
      awarded_at = now(),
      metadata = jsonb_build_object(
        'career_score_gap', v_career_score_gap,
        'winner_career_score', v_winner_career_score,
        'loser_career_score', v_loser_career_score,
        'opponent_division_weight', v_loser_division_weight,
        'winner_division_weight', v_winner_division_weight
      );

    result := jsonb_set(result, '{awarded}', 'true'::jsonb);
    result := jsonb_set(result, '{message}', '"King Slayer badge awarded!"'::jsonb);
  ELSE
    -- Revoke if threshold no longer met
    UPDATE public.team_badge_events SET is_active = false
    WHERE team_id = p_winner_id
      AND badge_type = 'king_slayer'
      AND season_id = current_season_id
      AND is_active = true;

    result := jsonb_set(result, '{message}', to_jsonb(format('Career score gap %s below threshold %s', v_career_score_gap, v_kingslayer_threshold)));
  END IF;

  RETURN result;
END;
$function$;


-- 3. Updated award_bully_badge: counts match wins (not game wins)
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

  -- Count MATCH wins (not game wins) against teams with 20+ lower division weight
  SELECT COALESCE(COUNT(*), 0) INTO v_bully_match_wins
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


-- 4. Updated award_consistent_performer_badge: stores display division name in metadata
CREATE OR REPLACE FUNCTION public.award_consistent_performer_badge(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  teams_beaten_count integer;
  consistent_threshold integer := 5;
  result jsonb := '{"awarded": false, "teams_beaten": 0}'::jsonb;
  current_season_id uuid;
  team_division_id uuid;
  v_display_division text;
BEGIN
  -- Get current active season
  SELECT id INTO current_season_id
  FROM public.seasons
  WHERE is_active = true
  LIMIT 1;

  -- Get the team's division and display name
  SELECT t.division_id, COALESCE(d.display_division, d.name)
  INTO team_division_id, v_display_division
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

  result := jsonb_set(result, '{teams_beaten}', to_jsonb(teams_beaten_count));
  result := jsonb_set(result, '{division_name}', to_jsonb(v_display_division));

  IF teams_beaten_count >= consistent_threshold THEN
    INSERT INTO public.team_badge_events (team_id, badge_type, season_id, metadata)
    VALUES (p_team_id, 'consistent_performer', current_season_id,
            jsonb_build_object(
              'teams_beaten_count', teams_beaten_count,
              'threshold_met', consistent_threshold,
              'division', v_display_division
            ))
    ON CONFLICT (team_id, badge_type, season_id)
    DO UPDATE SET
      is_active = true,
      awarded_at = now(),
      metadata = jsonb_build_object(
        'teams_beaten_count', teams_beaten_count,
        'threshold_met', consistent_threshold,
        'division', v_display_division
      );

    result := jsonb_set(result, '{awarded}', 'true'::jsonb);
    result := jsonb_set(result, '{message}', '"Consistent Performer badge awarded!"'::jsonb);
  ELSE
    -- Revoke if threshold no longer met
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
$function$;
