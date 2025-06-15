
-- Create function to award kingslayer badge based on power score difference
CREATE OR REPLACE FUNCTION award_kingslayer_badge(p_winner_id uuid, p_loser_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  winner_power_score numeric;
  loser_power_score numeric;
  power_score_diff numeric;
  kingslayer_threshold numeric := 0.3;
  result jsonb := '{"awarded": false, "power_score_diff": 0}'::jsonb;
  current_season_id uuid;
BEGIN
  -- Get current active season
  SELECT id INTO current_season_id 
  FROM seasons 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Get current power scores for both teams from team_season_stats
  SELECT power_score INTO winner_power_score
  FROM team_season_stats
  WHERE team_id = p_winner_id AND season_id = current_season_id;
  
  SELECT power_score INTO loser_power_score
  FROM team_season_stats
  WHERE team_id = p_loser_id AND season_id = current_season_id;
  
  -- If either team doesn't have power score data, skip badge awarding
  IF winner_power_score IS NULL OR loser_power_score IS NULL THEN
    RETURN jsonb_set(result, '{message}', '"Power score data not available for one or both teams"'::jsonb);
  END IF;
  
  -- Calculate power score difference (loser - winner)
  power_score_diff := loser_power_score - winner_power_score;
  
  -- Update result with the calculated difference
  result := jsonb_set(result, '{power_score_diff}', to_jsonb(power_score_diff));
  result := jsonb_set(result, '{winner_power_score}', to_jsonb(winner_power_score));
  result := jsonb_set(result, '{loser_power_score}', to_jsonb(loser_power_score));
  
  -- Check if kingslayer threshold is met
  IF power_score_diff >= kingslayer_threshold THEN
    -- Award kingslayer badge to the winner
    INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata)
    VALUES (p_winner_id, 'king_slayer', current_season_id, 
            jsonb_build_object(
              'power_score_diff', power_score_diff,
              'opponent_power_score', loser_power_score,
              'winner_power_score', winner_power_score
            ))
    ON CONFLICT (team_id, badge_type, season_id) 
    DO UPDATE SET 
      is_active = true,
      awarded_at = now(),
      metadata = jsonb_build_object(
        'power_score_diff', power_score_diff,
        'opponent_power_score', loser_power_score,
        'winner_power_score', winner_power_score
      );
    
    result := jsonb_set(result, '{awarded}', 'true'::jsonb);
    result := jsonb_set(result, '{message}', '"Kingslayer badge awarded!"'::jsonb);
  ELSE
    result := jsonb_set(result, '{message}', '"Power score difference below threshold"'::jsonb);
  END IF;
  
  RETURN result;
END;
$$;
