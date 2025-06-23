
-- Fix the award_streak_badges function to properly deactivate existing badges
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
  
  -- First, deactivate ALL existing streak badges for this team to prevent duplicates
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
  
  -- Check for hot streak (winning streak of 5+)
  IF streak_info.streak_type = 'win' AND streak_info.streak_count >= hot_streak_threshold THEN
    -- Award hot streak badge
    INSERT INTO team_badge_events (team_id, badge_type, metadata, season_id)
    VALUES (
      p_team_id, 
      'hot_streak', 
      jsonb_build_object('streak_count', streak_info.streak_count),
      (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
    );
    
    result := jsonb_set(result, '{awarded}', '["hot_streak"]'::jsonb);
    result := jsonb_set(result, '{revoked}', '["cold_streak"]'::jsonb);
    badge_awarded := true;
    
  -- Check for cold streak (losing streak of 3+)
  ELSIF streak_info.streak_type = 'loss' AND streak_info.streak_count >= cold_streak_threshold THEN
    -- Award cold streak badge
    INSERT INTO team_badge_events (team_id, badge_type, metadata, season_id)
    VALUES (
      p_team_id, 
      'cold_streak', 
      jsonb_build_object('streak_count', streak_info.streak_count),
      (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
    );
    
    result := jsonb_set(result, '{awarded}', '["cold_streak"]'::jsonb);
    result := jsonb_set(result, '{revoked}', '["hot_streak"]'::jsonb);
    badge_awarded := true;
    
  ELSE
    -- Streak doesn't meet threshold, all badges already revoked above
    result := jsonb_set(result, '{revoked}', '["hot_streak", "cold_streak"]'::jsonb);
  END IF;
  
  RETURN result;
END;
$$;

-- Clean up existing duplicate streak badges - keep only the most recent one for each team/badge type
WITH ranked_badges AS (
  SELECT 
    id,
    team_id,
    badge_type,
    awarded_at,
    ROW_NUMBER() OVER (
      PARTITION BY team_id, badge_type 
      ORDER BY awarded_at DESC
    ) as rn
  FROM team_badge_events 
  WHERE badge_type IN ('hot_streak', 'cold_streak') 
    AND is_active = true
)
UPDATE team_badge_events 
SET is_active = false 
WHERE id IN (
  SELECT id FROM ranked_badges WHERE rn > 1
);

-- Add a unique constraint to prevent future duplicate active streak badges per team per season
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_streak_badges 
ON team_badge_events (team_id, badge_type, season_id) 
WHERE is_active = true AND badge_type IN ('hot_streak', 'cold_streak');
