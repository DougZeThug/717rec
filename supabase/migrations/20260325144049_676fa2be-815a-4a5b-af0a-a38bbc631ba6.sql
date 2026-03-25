CREATE OR REPLACE FUNCTION public.award_streak_badges(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  streak_info RECORD;
  badge_awarded boolean := false;
  result jsonb := '{"awarded": [], "revoked": []}'::jsonb;
  hot_streak_threshold integer := 4;
  cold_streak_threshold integer := 4;
  active_season_id uuid;
BEGIN
  -- Get active season
  SELECT id INTO active_season_id FROM seasons WHERE is_active = true LIMIT 1;

  -- Get current streak for the team
  SELECT INTO streak_info * FROM calculate_team_streak(p_team_id);
  
  -- First, deactivate ALL existing streak badges for this team
  UPDATE team_badge_events 
  SET is_active = false 
  WHERE team_id = p_team_id 
    AND badge_type IN ('hot_streak', 'cold_streak')
    AND is_active = true;
  
  -- If no streak found, return with revoked badges
  IF streak_info.streak_type IS NULL OR streak_info.streak_count = 0 THEN
    result := jsonb_set(result, '{revoked}', '["hot_streak", "cold_streak"]'::jsonb);
    RETURN result;
  END IF;
  
  -- Check for hot streak (winning streak of 4+)
  IF streak_info.streak_type = 'win' AND streak_info.streak_count >= hot_streak_threshold THEN
    INSERT INTO team_badge_events (team_id, badge_type, metadata, season_id)
    VALUES (
      p_team_id, 
      'hot_streak', 
      jsonb_build_object('streak_count', streak_info.streak_count),
      active_season_id
    )
    ON CONFLICT (team_id, badge_type, season_id)
    DO UPDATE SET 
      is_active = true, 
      awarded_at = now(),
      metadata = jsonb_build_object('streak_count', streak_info.streak_count);
    
    result := jsonb_set(result, '{awarded}', '["hot_streak"]'::jsonb);
    result := jsonb_set(result, '{revoked}', '["cold_streak"]'::jsonb);
    badge_awarded := true;
    
  -- Check for cold streak (losing streak of 4+)
  ELSIF streak_info.streak_type = 'loss' AND streak_info.streak_count >= cold_streak_threshold THEN
    INSERT INTO team_badge_events (team_id, badge_type, metadata, season_id)
    VALUES (
      p_team_id, 
      'cold_streak', 
      jsonb_build_object('streak_count', streak_info.streak_count),
      active_season_id
    )
    ON CONFLICT (team_id, badge_type, season_id)
    DO UPDATE SET 
      is_active = true, 
      awarded_at = now(),
      metadata = jsonb_build_object('streak_count', streak_info.streak_count);
    
    result := jsonb_set(result, '{awarded}', '["cold_streak"]'::jsonb);
    result := jsonb_set(result, '{revoked}', '["hot_streak"]'::jsonb);
    badge_awarded := true;
    
  ELSE
    result := jsonb_set(result, '{revoked}', '["hot_streak", "cold_streak"]'::jsonb);
  END IF;
  
  RETURN result;
END;
$$;