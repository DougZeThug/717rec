
-- Create function to award clutch performer badge based on 2-1 match wins
CREATE OR REPLACE FUNCTION award_clutch_performer_badge(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clutch_wins_count integer;
  clutch_threshold integer := 5; -- 5+ 2-1 wins for clutch performer
  result jsonb := '{"awarded": false, "clutch_wins": 0}'::jsonb;
  current_season_id uuid;
BEGIN
  -- Get current active season
  SELECT id INTO current_season_id 
  FROM seasons 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Count 2-1 victories for this team in the current season
  SELECT COUNT(*) INTO clutch_wins_count
  FROM matches m
  WHERE m.iscompleted = true
    AND m.winner_id = p_team_id
    AND m.season_id = current_season_id
    AND (
      (m.team1_id = p_team_id AND m.team1_game_wins = 2 AND m.team2_game_wins = 1) OR
      (m.team2_id = p_team_id AND m.team2_game_wins = 2 AND m.team1_game_wins = 1)
    );
  
  -- Update result with clutch wins count
  result := jsonb_set(result, '{clutch_wins}', to_jsonb(clutch_wins_count));
  
  -- Check if clutch performer threshold is met
  IF clutch_wins_count >= clutch_threshold THEN
    -- Award clutch performer badge
    INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata)
    VALUES (p_team_id, 'clutch_performer', current_season_id, 
            jsonb_build_object(
              'clutch_wins_count', clutch_wins_count,
              'threshold_met', clutch_threshold
            ))
    ON CONFLICT (team_id, badge_type, season_id) 
    DO UPDATE SET 
      is_active = true,
      awarded_at = now(),
      metadata = jsonb_build_object(
        'clutch_wins_count', clutch_wins_count,
        'threshold_met', clutch_threshold
      );
    
    result := jsonb_set(result, '{awarded}', 'true'::jsonb);
    result := jsonb_set(result, '{message}', '"Clutch Performer badge awarded!"'::jsonb);
  ELSE
    -- Revoke badge if threshold no longer met (edge case)
    UPDATE team_badge_events 
    SET is_active = false 
    WHERE team_id = p_team_id 
      AND badge_type = 'clutch_performer'
      AND season_id = current_season_id
      AND is_active = true;
    
    result := jsonb_set(result, '{message}', to_jsonb(format('Need %s more 2-1 wins for Clutch Performer badge', clutch_threshold - clutch_wins_count)));
  END IF;
  
  RETURN result;
END;
$$;
