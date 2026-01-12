-- Add new badge types to the enum
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'ice_cold';
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'broom_crew';
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'gatekeeper';
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'chaos_agent';
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'bully';

-- =============================================================================
-- ICE COLD BADGE: Won 3 close matches (2-1) in a row
-- =============================================================================
CREATE OR REPLACE FUNCTION public.award_ice_cold_badge(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_season_id uuid;
  v_last_3_matches record;
  v_ice_cold_count int := 0;
  v_should_have_badge boolean := false;
  v_existing_badge_id uuid;
  v_result jsonb;
BEGIN
  -- Get active season
  SELECT id INTO v_active_season_id FROM seasons WHERE is_active = true LIMIT 1;
  
  IF v_active_season_id IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'No active season');
  END IF;

  -- Check last 3 completed matches for this team
  FOR v_last_3_matches IN
    SELECT 
      winner_id,
      CASE WHEN team1_id = p_team_id THEN team1_game_wins ELSE team2_game_wins END as team_game_wins,
      CASE WHEN team1_id = p_team_id THEN team2_game_wins ELSE team1_game_wins END as opp_game_wins
    FROM matches
    WHERE (team1_id = p_team_id OR team2_id = p_team_id)
      AND iscompleted = true
      AND season_id = v_active_season_id
    ORDER BY created_at DESC
    LIMIT 3
  LOOP
    -- Check if this is a 2-1 win for the team
    IF v_last_3_matches.winner_id = p_team_id 
       AND v_last_3_matches.team_game_wins = 2 
       AND v_last_3_matches.opp_game_wins = 1 THEN
      v_ice_cold_count := v_ice_cold_count + 1;
    END IF;
  END LOOP;

  -- Need 3 consecutive 2-1 wins
  v_should_have_badge := (v_ice_cold_count = 3);

  -- Check for existing badge
  SELECT id INTO v_existing_badge_id 
  FROM team_badge_events 
  WHERE team_id = p_team_id 
    AND badge_type = 'ice_cold' 
    AND season_id = v_active_season_id 
    AND is_active = true;

  IF v_should_have_badge AND v_existing_badge_id IS NULL THEN
    INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata, is_active)
    VALUES (p_team_id, 'ice_cold', v_active_season_id, 
            jsonb_build_object('consecutive_2_1_wins', v_ice_cold_count), true);
    v_result := jsonb_build_object('awarded', true, 'badge_type', 'ice_cold');
  ELSIF NOT v_should_have_badge AND v_existing_badge_id IS NOT NULL THEN
    UPDATE team_badge_events SET is_active = false WHERE id = v_existing_badge_id;
    v_result := jsonb_build_object('removed', true, 'badge_type', 'ice_cold');
  ELSE
    v_result := jsonb_build_object('no_change', true, 'current_streak', v_ice_cold_count);
  END IF;

  RETURN v_result;
END;
$$;

-- =============================================================================
-- BROOM CREW BADGE: 3 sweeps (2-0 wins) in a row
-- =============================================================================
CREATE OR REPLACE FUNCTION public.award_broom_crew_badge(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_season_id uuid;
  v_last_3_matches record;
  v_sweep_count int := 0;
  v_should_have_badge boolean := false;
  v_existing_badge_id uuid;
  v_result jsonb;
BEGIN
  -- Get active season
  SELECT id INTO v_active_season_id FROM seasons WHERE is_active = true LIMIT 1;
  
  IF v_active_season_id IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'No active season');
  END IF;

  -- Check last 3 completed matches for this team
  FOR v_last_3_matches IN
    SELECT 
      winner_id,
      CASE WHEN team1_id = p_team_id THEN team1_game_wins ELSE team2_game_wins END as team_game_wins,
      CASE WHEN team1_id = p_team_id THEN team2_game_wins ELSE team1_game_wins END as opp_game_wins
    FROM matches
    WHERE (team1_id = p_team_id OR team2_id = p_team_id)
      AND iscompleted = true
      AND season_id = v_active_season_id
    ORDER BY created_at DESC
    LIMIT 3
  LOOP
    -- Check if this is a 2-0 sweep for the team
    IF v_last_3_matches.winner_id = p_team_id 
       AND v_last_3_matches.team_game_wins = 2 
       AND v_last_3_matches.opp_game_wins = 0 THEN
      v_sweep_count := v_sweep_count + 1;
    END IF;
  END LOOP;

  -- Need 3 consecutive sweeps
  v_should_have_badge := (v_sweep_count = 3);

  -- Check for existing badge
  SELECT id INTO v_existing_badge_id 
  FROM team_badge_events 
  WHERE team_id = p_team_id 
    AND badge_type = 'broom_crew' 
    AND season_id = v_active_season_id 
    AND is_active = true;

  IF v_should_have_badge AND v_existing_badge_id IS NULL THEN
    INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata, is_active)
    VALUES (p_team_id, 'broom_crew', v_active_season_id, 
            jsonb_build_object('consecutive_sweeps', v_sweep_count), true);
    v_result := jsonb_build_object('awarded', true, 'badge_type', 'broom_crew');
  ELSIF NOT v_should_have_badge AND v_existing_badge_id IS NOT NULL THEN
    UPDATE team_badge_events SET is_active = false WHERE id = v_existing_badge_id;
    v_result := jsonb_build_object('removed', true, 'badge_type', 'broom_crew');
  ELSE
    v_result := jsonb_build_object('no_change', true, 'current_sweep_count', v_sweep_count);
  END IF;

  RETURN v_result;
END;
$$;

-- =============================================================================
-- GATEKEEPER BADGE: Beats 3+ teams with higher power score
-- =============================================================================
CREATE OR REPLACE FUNCTION public.award_gatekeeper_badge(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_season_id uuid;
  v_gatekeeper_count int := 0;
  v_team_power_score numeric;
  v_should_have_badge boolean := false;
  v_existing_badge_id uuid;
  v_result jsonb;
BEGIN
  -- Get active season
  SELECT id INTO v_active_season_id FROM seasons WHERE is_active = true LIMIT 1;
  
  IF v_active_season_id IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'No active season');
  END IF;

  -- Get this team's power score
  SELECT power_score INTO v_team_power_score 
  FROM v_team_power_scores 
  WHERE team_id = p_team_id;

  IF v_team_power_score IS NULL THEN
    v_team_power_score := 0;
  END IF;

  -- Count wins against teams with higher power scores this season
  SELECT COUNT(*) INTO v_gatekeeper_count
  FROM matches m
  JOIN v_team_power_scores opp ON opp.team_id = 
    CASE WHEN m.team1_id = p_team_id THEN m.team2_id ELSE m.team1_id END
  WHERE (m.team1_id = p_team_id OR m.team2_id = p_team_id)
    AND m.winner_id = p_team_id
    AND m.iscompleted = true
    AND m.season_id = v_active_season_id
    AND opp.power_score > v_team_power_score;

  -- Need 3+ gatekeeper wins
  v_should_have_badge := (v_gatekeeper_count >= 3);

  -- Check for existing badge
  SELECT id INTO v_existing_badge_id 
  FROM team_badge_events 
  WHERE team_id = p_team_id 
    AND badge_type = 'gatekeeper' 
    AND season_id = v_active_season_id 
    AND is_active = true;

  IF v_should_have_badge AND v_existing_badge_id IS NULL THEN
    INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata, is_active)
    VALUES (p_team_id, 'gatekeeper', v_active_season_id, 
            jsonb_build_object('upset_wins', v_gatekeeper_count), true);
    v_result := jsonb_build_object('awarded', true, 'badge_type', 'gatekeeper');
  ELSIF NOT v_should_have_badge AND v_existing_badge_id IS NOT NULL THEN
    UPDATE team_badge_events SET is_active = false WHERE id = v_existing_badge_id;
    v_result := jsonb_build_object('removed', true, 'badge_type', 'gatekeeper');
  ELSE
    v_result := jsonb_build_object('no_change', true, 'upset_wins', v_gatekeeper_count);
  END IF;

  RETURN v_result;
END;
$$;

-- =============================================================================
-- CHAOS AGENT BADGE: Alternating W/L pattern for 6+ matches
-- =============================================================================
CREATE OR REPLACE FUNCTION public.award_chaos_agent_badge(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_season_id uuid;
  v_match_results boolean[];
  v_match_rec record;
  v_is_alternating boolean := true;
  v_prev_result boolean := null;
  v_match_count int := 0;
  v_should_have_badge boolean := false;
  v_existing_badge_id uuid;
  v_result jsonb;
BEGIN
  -- Get active season
  SELECT id INTO v_active_season_id FROM seasons WHERE is_active = true LIMIT 1;
  
  IF v_active_season_id IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'No active season');
  END IF;

  -- Get last 6 match results for this team
  FOR v_match_rec IN
    SELECT (winner_id = p_team_id) as is_win
    FROM matches
    WHERE (team1_id = p_team_id OR team2_id = p_team_id)
      AND iscompleted = true
      AND season_id = v_active_season_id
    ORDER BY created_at DESC
    LIMIT 6
  LOOP
    v_match_count := v_match_count + 1;
    
    -- Check if alternating
    IF v_prev_result IS NOT NULL AND v_match_rec.is_win = v_prev_result THEN
      v_is_alternating := false;
      EXIT;
    END IF;
    
    v_prev_result := v_match_rec.is_win;
  END LOOP;

  -- Need 6 matches with perfect alternation
  v_should_have_badge := (v_match_count >= 6 AND v_is_alternating);

  -- Check for existing badge
  SELECT id INTO v_existing_badge_id 
  FROM team_badge_events 
  WHERE team_id = p_team_id 
    AND badge_type = 'chaos_agent' 
    AND season_id = v_active_season_id 
    AND is_active = true;

  IF v_should_have_badge AND v_existing_badge_id IS NULL THEN
    INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata, is_active)
    VALUES (p_team_id, 'chaos_agent', v_active_season_id, 
            jsonb_build_object('alternating_matches', v_match_count), true);
    v_result := jsonb_build_object('awarded', true, 'badge_type', 'chaos_agent');
  ELSIF NOT v_should_have_badge AND v_existing_badge_id IS NOT NULL THEN
    UPDATE team_badge_events SET is_active = false WHERE id = v_existing_badge_id;
    v_result := jsonb_build_object('removed', true, 'badge_type', 'chaos_agent');
  ELSE
    v_result := jsonb_build_object('no_change', true, 'is_alternating', v_is_alternating, 'match_count', v_match_count);
  END IF;

  RETURN v_result;
END;
$$;

-- =============================================================================
-- BULLY BADGE: Won 4+ games against teams with 20+ lower division weight
-- =============================================================================
CREATE OR REPLACE FUNCTION public.award_bully_badge(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_season_id uuid;
  v_team_division_weight numeric;
  v_bully_game_wins int := 0;
  v_should_have_badge boolean := false;
  v_existing_badge_id uuid;
  v_result jsonb;
BEGIN
  -- Get active season
  SELECT id INTO v_active_season_id FROM seasons WHERE is_active = true LIMIT 1;
  
  IF v_active_season_id IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'No active season');
  END IF;

  -- Get this team's division weight
  SELECT d.division_weight INTO v_team_division_weight 
  FROM teams t
  JOIN divisions d ON d.id = t.division_id
  WHERE t.id = p_team_id;

  IF v_team_division_weight IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'Team has no division');
  END IF;

  -- Count game wins against teams with 20+ lower division weight this season
  SELECT COALESCE(SUM(
    CASE 
      WHEN m.team1_id = p_team_id THEN m.team1_game_wins
      ELSE m.team2_game_wins
    END
  ), 0) INTO v_bully_game_wins
  FROM matches m
  JOIN teams opp_team ON opp_team.id = 
    CASE WHEN m.team1_id = p_team_id THEN m.team2_id ELSE m.team1_id END
  JOIN divisions opp_div ON opp_div.id = opp_team.division_id
  WHERE (m.team1_id = p_team_id OR m.team2_id = p_team_id)
    AND m.winner_id = p_team_id
    AND m.iscompleted = true
    AND m.season_id = v_active_season_id
    AND (v_team_division_weight - opp_div.division_weight) > 20;

  -- Need 4+ game wins against lower division teams
  v_should_have_badge := (v_bully_game_wins >= 4);

  -- Check for existing badge
  SELECT id INTO v_existing_badge_id 
  FROM team_badge_events 
  WHERE team_id = p_team_id 
    AND badge_type = 'bully' 
    AND season_id = v_active_season_id 
    AND is_active = true;

  IF v_should_have_badge AND v_existing_badge_id IS NULL THEN
    INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata, is_active)
    VALUES (p_team_id, 'bully', v_active_season_id, 
            jsonb_build_object('game_wins_vs_lower_division', v_bully_game_wins), true);
    v_result := jsonb_build_object('awarded', true, 'badge_type', 'bully');
  ELSIF NOT v_should_have_badge AND v_existing_badge_id IS NOT NULL THEN
    UPDATE team_badge_events SET is_active = false WHERE id = v_existing_badge_id;
    v_result := jsonb_build_object('removed', true, 'badge_type', 'bully');
  ELSE
    v_result := jsonb_build_object('no_change', true, 'game_wins_vs_lower', v_bully_game_wins);
  END IF;

  RETURN v_result;
END;
$$;