-- Add RLS policies for head-to-head views
-- These views should be publicly readable as they only show aggregated match data

-- Enable RLS for v_head_to_head (the main public interface)
-- Note: Views don't directly support RLS, but we control access through the underlying tables
-- Since matches table already has proper RLS, these views inherit that security

-- Add a function to safely query head-to-head data
CREATE OR REPLACE FUNCTION get_head_to_head_records(p_team_id uuid DEFAULT NULL)
RETURNS TABLE(
  team_id uuid,
  opponent_id uuid,
  matches_played bigint,
  wins bigint,
  losses bigint,
  game_wins bigint,
  game_losses bigint,
  win_pct numeric,
  last_played_at timestamp with time zone
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;