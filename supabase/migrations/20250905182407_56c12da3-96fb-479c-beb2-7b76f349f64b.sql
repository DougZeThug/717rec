-- Fix security definer view issue by removing SECURITY DEFINER from get_head_to_head_records function
-- This function queries public data that should be accessible to all users
DROP FUNCTION IF EXISTS public.get_head_to_head_records(uuid);

CREATE OR REPLACE FUNCTION public.get_head_to_head_records(p_team_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(team_id uuid, opponent_id uuid, matches_played bigint, wins bigint, losses bigint, game_wins bigint, game_losses bigint, win_pct numeric, last_played_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT 
    h.team_id,
    h.opponent_id,
    h.matches_played,
    h.wins,
    h.losses,
    h.game_wins,
    h.game_losses,
    h.win_pct,
    h.last_played_at
  FROM v_head_to_head h
  WHERE (p_team_id IS NULL OR h.team_id = p_team_id)
  ORDER BY h.win_pct DESC, h.matches_played DESC;
$function$;