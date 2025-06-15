
-- Create RPC function to calculate current streak for a team
CREATE OR REPLACE FUNCTION calculate_team_streak(p_team_id uuid)
RETURNS TABLE(streak_type text, streak_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_matches RECORD;
  current_streak_type text := null;
  current_streak_count integer := 0;
  match_result text;
BEGIN
  -- Get recent completed matches for the team, ordered by date (most recent first)
  FOR recent_matches IN 
    SELECT 
      m.id,
      m.winner_id,
      m.date
    FROM matches m
    WHERE m.iscompleted = true 
      AND (m.team1_id = p_team_id OR m.team2_id = p_team_id)
      AND m.date IS NOT NULL
    ORDER BY m.date DESC
    LIMIT 20  -- Look at last 20 matches to find streak
  LOOP
    -- Determine if this was a win or loss for the team
    IF recent_matches.winner_id = p_team_id THEN
      match_result := 'win';
    ELSE
      match_result := 'loss';
    END IF;
    
    -- If this is the first match, set the streak type
    IF current_streak_type IS NULL THEN
      current_streak_type := match_result;
      current_streak_count := 1;
    -- If the streak continues, increment count
    ELSIF current_streak_type = match_result THEN
      current_streak_count := current_streak_count + 1;
    -- If the streak is broken, exit the loop
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  -- Return the streak information
  RETURN QUERY SELECT current_streak_type, current_streak_count;
END;
$$;

-- Create RPC function to award streak badges
CREATE OR REPLACE FUNCTION award_streak_badges(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  streak_info RECORD;
  badge_awarded boolean := false;
  result jsonb := '{"awarded": [], "revoked": []}'::jsonb;
  hot_streak_threshold integer := 5;  -- 5+ wins for hot streak
  cold_streak_threshold integer := 3; -- 3+ losses for cold streak
BEGIN
  -- Get current streak for the team
  SELECT INTO streak_info * FROM calculate_team_streak(p_team_id);
  
  -- If no streak found, revoke any existing streak badges
  IF streak_info.streak_type IS NULL OR streak_info.streak_count = 0 THEN
    -- Revoke any existing streak badges
    UPDATE team_badge_events 
    SET is_active = false 
    WHERE team_id = p_team_id 
      AND badge_type IN ('hot_streak', 'cold_streak')
      AND is_active = true;
    
    result := jsonb_set(result, '{revoked}', '["hot_streak", "cold_streak"]'::jsonb);
    RETURN result;
  END IF;
  
  -- Check for hot streak (winning streak of 5+)
  IF streak_info.streak_type = 'win' AND streak_info.streak_count >= hot_streak_threshold THEN
    -- Award hot streak badge, revoke cold streak if exists
    INSERT INTO team_badge_events (team_id, badge_type, metadata)
    VALUES (p_team_id, 'hot_streak', jsonb_build_object('streak_count', streak_info.streak_count))
    ON CONFLICT (team_id, badge_type, season_id) 
    DO UPDATE SET 
      is_active = true,
      awarded_at = now(),
      metadata = jsonb_build_object('streak_count', streak_info.streak_count);
    
    -- Revoke cold streak badge if exists
    UPDATE team_badge_events 
    SET is_active = false 
    WHERE team_id = p_team_id 
      AND badge_type = 'cold_streak'
      AND is_active = true;
    
    result := jsonb_set(result, '{awarded}', '["hot_streak"]'::jsonb);
    result := jsonb_set(result, '{revoked}', '["cold_streak"]'::jsonb);
    badge_awarded := true;
    
  -- Check for cold streak (losing streak of 3+)
  ELSIF streak_info.streak_type = 'loss' AND streak_info.streak_count >= cold_streak_threshold THEN
    -- Award cold streak badge, revoke hot streak if exists
    INSERT INTO team_badge_events (team_id, badge_type, metadata)
    VALUES (p_team_id, 'cold_streak', jsonb_build_object('streak_count', streak_info.streak_count))
    ON CONFLICT (team_id, badge_type, season_id) 
    DO UPDATE SET 
      is_active = true,
      awarded_at = now(),
      metadata = jsonb_build_object('streak_count', streak_info.streak_count);
    
    -- Revoke hot streak badge if exists
    UPDATE team_badge_events 
    SET is_active = false 
    WHERE team_id = p_team_id 
      AND badge_type = 'hot_streak'
      AND is_active = true;
    
    result := jsonb_set(result, '{awarded}', '["cold_streak"]'::jsonb);
    result := jsonb_set(result, '{revoked}', '["hot_streak"]'::jsonb);
    badge_awarded := true;
    
  ELSE
    -- Streak doesn't meet threshold, revoke any existing streak badges
    UPDATE team_badge_events 
    SET is_active = false 
    WHERE team_id = p_team_id 
      AND badge_type IN ('hot_streak', 'cold_streak')
      AND is_active = true;
    
    result := jsonb_set(result, '{revoked}', '["hot_streak", "cold_streak"]'::jsonb);
  END IF;
  
  RETURN result;
END;
$$;

-- Create RPC function to process badges for both teams in a match
CREATE OR REPLACE FUNCTION process_match_badges(p_team1_id uuid, p_team2_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team1_result jsonb;
  team2_result jsonb;
  combined_result jsonb;
BEGIN
  -- Process badges for both teams
  SELECT award_streak_badges(p_team1_id) INTO team1_result;
  SELECT award_streak_badges(p_team2_id) INTO team2_result;
  
  -- Combine results
  combined_result := jsonb_build_object(
    'team1', jsonb_build_object('team_id', p_team1_id, 'badges', team1_result),
    'team2', jsonb_build_object('team_id', p_team2_id, 'badges', team2_result)
  );
  
  RETURN combined_result;
END;
$$;
