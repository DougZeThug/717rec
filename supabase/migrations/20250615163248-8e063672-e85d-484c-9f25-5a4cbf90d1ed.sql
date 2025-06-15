
-- Create function to award consistent performer badge based on beating 5+ teams in same division
CREATE OR REPLACE FUNCTION award_consistent_performer_badge(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  teams_beaten_count integer;
  consistent_threshold integer := 5; -- 5+ different teams in same division
  result jsonb := '{"awarded": false, "teams_beaten": 0}'::jsonb;
  current_season_id uuid;
  team_division_id uuid;
BEGIN
  -- Get current active season
  SELECT id INTO current_season_id 
  FROM seasons 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Get the team's division
  SELECT division_id INTO team_division_id
  FROM teams
  WHERE id = p_team_id;
  
  -- Count unique teams beaten in the same division during current season
  SELECT COUNT(DISTINCT loser_team.id) INTO teams_beaten_count
  FROM matches m
  JOIN teams winner_team ON m.winner_id = winner_team.id
  JOIN teams loser_team ON m.loser_id = loser_team.id
  WHERE m.iscompleted = true
    AND m.winner_id = p_team_id
    AND m.season_id = current_season_id
    AND winner_team.division_id = loser_team.division_id
    AND winner_team.division_id = team_division_id;
  
  -- Update result with teams beaten count
  result := jsonb_set(result, '{teams_beaten}', to_jsonb(teams_beaten_count));
  result := jsonb_set(result, '{team_division_id}', to_jsonb(team_division_id));
  
  -- Check if consistent performer threshold is met
  IF teams_beaten_count >= consistent_threshold THEN
    -- Award consistent performer badge
    INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata)
    VALUES (p_team_id, 'consistent_performer', current_season_id, 
            jsonb_build_object(
              'teams_beaten_count', teams_beaten_count,
              'threshold_met', consistent_threshold,
              'division_id', team_division_id
            ))
    ON CONFLICT (team_id, badge_type, season_id) 
    DO UPDATE SET 
      is_active = true,
      awarded_at = now(),
      metadata = jsonb_build_object(
        'teams_beaten_count', teams_beaten_count,
        'threshold_met', consistent_threshold,
        'division_id', team_division_id
      );
    
    result := jsonb_set(result, '{awarded}', 'true'::jsonb);
    result := jsonb_set(result, '{message}', '"Consistent Performer badge awarded!"'::jsonb);
  ELSE
    -- Revoke badge if threshold no longer met
    UPDATE team_badge_events 
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
