-- Create batch update function for team seeds
CREATE OR REPLACE FUNCTION batch_update_team_seeds(
  p_updates jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  update_record jsonb;
  affected_count integer := 0;
  error_count integer := 0;
  results jsonb := '[]'::jsonb;
  current_result jsonb;
BEGIN
  -- Validate input format
  IF jsonb_typeof(p_updates) != 'array' THEN
    RAISE EXCEPTION 'Updates must be an array of {team_id, seed} objects';
  END IF;
  
  -- Process each update
  FOR update_record IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    BEGIN
      -- Validate required fields
      IF NOT (update_record ? 'team_id' AND update_record ? 'seed') THEN
        error_count := error_count + 1;
        current_result := jsonb_build_object(
          'team_id', COALESCE(update_record->>'team_id', 'unknown'),
          'success', false,
          'error', 'Missing team_id or seed field'
        );
        results := results || current_result;
        CONTINUE;
      END IF;
      
      -- Perform the update
      UPDATE teams 
      SET seed = CASE 
        WHEN (update_record->>'seed') = 'null' THEN NULL
        ELSE (update_record->>'seed')::integer
      END
      WHERE id = (update_record->>'team_id')::uuid;
      
      -- Check if team was found and updated
      IF FOUND THEN
        affected_count := affected_count + 1;
        current_result := jsonb_build_object(
          'team_id', update_record->>'team_id',
          'success', true,
          'seed', CASE 
            WHEN (update_record->>'seed') = 'null' THEN null
            ELSE (update_record->>'seed')::integer
          END
        );
      ELSE
        error_count := error_count + 1;
        current_result := jsonb_build_object(
          'team_id', update_record->>'team_id',
          'success', false,
          'error', 'Team not found'
        );
      END IF;
      
      results := results || current_result;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      current_result := jsonb_build_object(
        'team_id', COALESCE(update_record->>'team_id', 'unknown'),
        'success', false,
        'error', SQLERRM
      );
      results := results || current_result;
    END;
  END LOOP;
  
  -- Return summary with detailed results
  RETURN jsonb_build_object(
    'total_updates', jsonb_array_length(p_updates),
    'successful_updates', affected_count,
    'failed_updates', error_count,
    'results', results
  );
END;
$$;