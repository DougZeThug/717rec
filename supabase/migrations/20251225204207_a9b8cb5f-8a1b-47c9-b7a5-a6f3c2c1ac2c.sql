-- Security Hardening: Add admin checks to critical SECURITY DEFINER functions
-- and revoke PUBLIC execute permissions

-- 1. Patch update_team_stats to require admin
CREATE OR REPLACE FUNCTION public.update_team_stats(p_winner_id uuid, p_loser_id uuid, p_winner_game_wins integer DEFAULT 0, p_loser_game_wins integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_result JSON;
  v_winner_rows INT;
  v_loser_rows INT;
  v_total_rows INT;
BEGIN
  -- SECURITY: Require admin access
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Log the operation
  RAISE NOTICE 'UPDATE TEAM STATS: Winner % (+1W, +%GW), Loser % (+1L, +%GW)', 
    p_winner_id, COALESCE(p_winner_game_wins, 0), p_loser_id, COALESCE(p_loser_game_wins, 0);

  -- Validate teams exist
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_winner_id) THEN
    RAISE EXCEPTION 'Winner team not found: %', p_winner_id;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_loser_id) THEN
    RAISE EXCEPTION 'Loser team not found: %', p_loser_id;
  END IF;

  -- Update winner stats
  UPDATE public.teams
  SET 
    wins = COALESCE(wins, 0) + 1,
    game_wins = COALESCE(game_wins, 0) + COALESCE(p_winner_game_wins, 0),
    game_losses = COALESCE(game_losses, 0) + COALESCE(p_loser_game_wins, 0)
  WHERE id = p_winner_id;
  
  GET DIAGNOSTICS v_winner_rows = ROW_COUNT;

  -- Update loser stats
  UPDATE public.teams
  SET 
    losses = COALESCE(losses, 0) + 1,
    game_wins = COALESCE(game_wins, 0) + COALESCE(p_loser_game_wins, 0),
    game_losses = COALESCE(game_losses, 0) + COALESCE(p_winner_game_wins, 0)
  WHERE id = p_loser_id;
  
  GET DIAGNOSTICS v_loser_rows = ROW_COUNT;

  v_total_rows := v_winner_rows + v_loser_rows;

  IF v_total_rows <> 2 THEN
    RAISE EXCEPTION 'Expected to update 2 teams but updated % rows (winner: %, loser: %)', 
      v_total_rows, v_winner_rows, v_loser_rows;
  END IF;

  v_result := json_build_object(
    'success', true,
    'rows_affected', v_total_rows,
    'winner', json_build_object(
      'id', p_winner_id, 
      'match_win', 1, 
      'game_wins', COALESCE(p_winner_game_wins, 0),
      'game_losses', COALESCE(p_loser_game_wins, 0)
    ),
    'loser', json_build_object(
      'id', p_loser_id, 
      'match_loss', 1, 
      'game_wins', COALESCE(p_loser_game_wins, 0),
      'game_losses', COALESCE(p_winner_game_wins, 0)
    )
  );
  
  RETURN v_result;
END;
$function$;

-- 2. Patch reverse_team_stats to require admin
CREATE OR REPLACE FUNCTION public.reverse_team_stats(p_winner_id uuid, p_loser_id uuid, p_winner_game_wins integer DEFAULT 0, p_loser_game_wins integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_result JSON;
  v_winner_rows INT;
  v_loser_rows INT;
BEGIN
  -- SECURITY: Require admin access
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RAISE NOTICE 'REVERSE TEAM STATS: Winner % (-1W, -%GW), Loser % (-1L, -%GW)', 
    p_winner_id, COALESCE(p_winner_game_wins, 0), p_loser_id, COALESCE(p_loser_game_wins, 0);

  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_winner_id) THEN
    RAISE EXCEPTION 'Winner team not found: %', p_winner_id;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_loser_id) THEN
    RAISE EXCEPTION 'Loser team not found: %', p_loser_id;
  END IF;

  UPDATE public.teams
  SET 
    wins = GREATEST(0, COALESCE(wins, 0) - 1),
    game_wins = GREATEST(0, COALESCE(game_wins, 0) - COALESCE(p_winner_game_wins, 0)),
    game_losses = GREATEST(0, COALESCE(game_losses, 0) - COALESCE(p_loser_game_wins, 0))
  WHERE id = p_winner_id;
  
  GET DIAGNOSTICS v_winner_rows = ROW_COUNT;

  UPDATE public.teams
  SET 
    losses = GREATEST(0, COALESCE(losses, 0) - 1),
    game_wins = GREATEST(0, COALESCE(game_wins, 0) - COALESCE(p_loser_game_wins, 0)),
    game_losses = GREATEST(0, COALESCE(game_losses, 0) - COALESCE(p_winner_game_wins, 0))
  WHERE id = p_loser_id;
  
  GET DIAGNOSTICS v_loser_rows = ROW_COUNT;

  IF (v_winner_rows + v_loser_rows) <> 2 THEN
    RAISE EXCEPTION 'Expected to update 2 teams but updated % rows', (v_winner_rows + v_loser_rows);
  END IF;

  v_result := json_build_object(
    'success', true,
    'rows_affected', v_winner_rows + v_loser_rows,
    'winner', json_build_object(
      'id', p_winner_id, 
      'match_win_reversed', 1, 
      'game_wins_reversed', COALESCE(p_winner_game_wins, 0),
      'game_losses_reversed', COALESCE(p_loser_game_wins, 0)
    ),
    'loser', json_build_object(
      'id', p_loser_id, 
      'match_loss_reversed', 1, 
      'game_wins_reversed', COALESCE(p_loser_game_wins, 0),
      'game_losses_reversed', COALESCE(p_winner_game_wins, 0)
    )
  );
  
  RETURN v_result;
END;
$function$;

-- 3. Patch batch_update_team_seeds to require admin
CREATE OR REPLACE FUNCTION public.batch_update_team_seeds(p_updates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  update_record jsonb;
  affected_count integer := 0;
  error_count integer := 0;
  results jsonb := '[]'::jsonb;
  current_result jsonb;
BEGIN
  -- SECURITY: Require admin access
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF jsonb_typeof(p_updates) != 'array' THEN
    RAISE EXCEPTION 'Updates must be an array of {team_id, seed} objects';
  END IF;
  
  FOR update_record IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    BEGIN
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
      
      UPDATE teams 
      SET seed = CASE 
        WHEN (update_record->>'seed') = 'null' THEN NULL
        ELSE (update_record->>'seed')::integer
      END
      WHERE id = (update_record->>'team_id')::uuid;
      
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
  
  RETURN jsonb_build_object(
    'total_updates', jsonb_array_length(p_updates),
    'successful_updates', affected_count,
    'failed_updates', error_count,
    'results', results
  );
END;
$function$;

-- 4. Patch auto_assign_seeds to require admin
CREATE OR REPLACE FUNCTION public.auto_assign_seeds(p_division_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- SECURITY: Require admin access
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  WITH ranked_teams AS (
    SELECT 
      t.id,
      ROW_NUMBER() OVER (
        ORDER BY 
          COALESCE(vt.power_score, 0) DESC,
          COALESCE(vt.win_percentage, 0) DESC,
          t.name
      ) as new_seed
    FROM public.teams t
    LEFT JOIN public.v_team_details vt ON t.id = vt.team_id
    WHERE t.division_id = p_division_id
  )
  UPDATE public.teams 
  SET seed = ranked_teams.new_seed
  FROM ranked_teams
  WHERE teams.id = ranked_teams.id;
END;
$function$;

-- 5. Patch reset_division_seeds to require admin
CREATE OR REPLACE FUNCTION public.reset_division_seeds(p_division_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- SECURITY: Require admin access
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.teams 
  SET seed = NULL 
  WHERE division_id = p_division_id;
END;
$function$;

-- 6. Patch insert_participant to require admin
CREATE OR REPLACE FUNCTION public.insert_participant(p_bracket_id uuid, p_team_id uuid, p_team_position integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  table_exists BOOLEAN;
BEGIN
  -- SECURITY: Require admin access
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'participants'
  ) INTO table_exists;
  
  IF table_exists THEN
    INSERT INTO public.participants (bracket_id, team_id, position)
    VALUES (p_bracket_id, p_team_id, p_team_position)
    ON CONFLICT (bracket_id, team_id) 
    DO UPDATE SET position = p_team_position;
  ELSE
    UPDATE public.teams SET seed = p_team_position WHERE id = p_team_id;
  END IF;
END;
$function$;

-- 7. Revoke PUBLIC execute and grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.update_team_stats(uuid, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_team_stats(uuid, uuid, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reverse_team_stats(uuid, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reverse_team_stats(uuid, uuid, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.batch_update_team_seeds(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_update_team_seeds(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.auto_assign_seeds(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_assign_seeds(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reset_division_seeds(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_division_seeds(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.insert_participant(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_participant(uuid, uuid, integer) TO authenticated;