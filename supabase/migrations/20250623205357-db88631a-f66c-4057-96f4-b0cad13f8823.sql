
-- Fix the award_kingslayer_badge function to use division strength instead of power scores
CREATE OR REPLACE FUNCTION award_kingslayer_badge(p_winner_id uuid, p_loser_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  winner_division_weight numeric;
  loser_division_weight numeric;
  division_weight_diff numeric;
  kingslayer_threshold numeric := 0.25; -- 0.25 division weight difference threshold
  result jsonb := '{"awarded": false, "division_weight_diff": 0}'::jsonb;
  current_season_id uuid;
BEGIN
  -- Get current active season
  SELECT id INTO current_season_id 
  FROM seasons 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Get division weights for both teams
  SELECT d.division_weight INTO winner_division_weight
  FROM teams t
  JOIN divisions d ON t.division_id = d.id
  WHERE t.id = p_winner_id;
  
  SELECT d.division_weight INTO loser_division_weight
  FROM teams t
  JOIN divisions d ON t.division_id = d.id
  WHERE t.id = p_loser_id;
  
  -- If either team doesn't have division data, skip badge awarding
  IF winner_division_weight IS NULL OR loser_division_weight IS NULL THEN
    RETURN jsonb_set(result, '{message}', '"Division weight data not available for one or both teams"'::jsonb);
  END IF;
  
  -- Calculate division weight difference (loser - winner)
  division_weight_diff := loser_division_weight - winner_division_weight;
  
  -- Update result with the calculated difference
  result := jsonb_set(result, '{division_weight_diff}', to_jsonb(division_weight_diff));
  result := jsonb_set(result, '{winner_division_weight}', to_jsonb(winner_division_weight));
  result := jsonb_set(result, '{loser_division_weight}', to_jsonb(loser_division_weight));
  
  -- Check if kingslayer threshold is met (winner beat someone from significantly stronger division)
  IF division_weight_diff >= kingslayer_threshold THEN
    -- Award kingslayer badge to the winner
    INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata)
    VALUES (p_winner_id, 'king_slayer', current_season_id, 
            jsonb_build_object(
              'division_weight_diff', division_weight_diff,
              'opponent_division_weight', loser_division_weight,
              'winner_division_weight', winner_division_weight
            ))
    ON CONFLICT (team_id, badge_type, season_id) 
    DO UPDATE SET 
      is_active = true,
      awarded_at = now(),
      metadata = jsonb_build_object(
        'division_weight_diff', division_weight_diff,
        'opponent_division_weight', loser_division_weight,
        'winner_division_weight', winner_division_weight
      );
    
    result := jsonb_set(result, '{awarded}', 'true'::jsonb);
    result := jsonb_set(result, '{message}', '"Kingslayer badge awarded for beating stronger division!"'::jsonb);
  ELSE
    result := jsonb_set(result, '{message}', '"Division strength difference below threshold"'::jsonb);
  END IF;
  
  RETURN result;
END;
$$;

-- Clean up existing kingslayer badges that don't meet the new division-based criteria
-- First, let's identify and deactivate incorrectly awarded badges
WITH incorrect_badges AS (
  SELECT 
    tbe.id,
    tbe.team_id,
    winner_div.division_weight as winner_weight,
    loser_div.division_weight as loser_weight,
    (loser_div.division_weight - winner_div.division_weight) as weight_diff
  FROM team_badge_events tbe
  JOIN matches m ON (m.winner_id = tbe.team_id AND m.iscompleted = true)
  JOIN teams winner_team ON m.winner_id = winner_team.id
  JOIN teams loser_team ON m.loser_id = loser_team.id
  JOIN divisions winner_div ON winner_team.division_id = winner_div.id
  JOIN divisions loser_div ON loser_team.division_id = loser_div.id
  WHERE tbe.badge_type = 'king_slayer'
    AND tbe.is_active = true
    AND (loser_div.division_weight - winner_div.division_weight) < 0.25
)
UPDATE team_badge_events 
SET is_active = false
WHERE id IN (SELECT id FROM incorrect_badges);
