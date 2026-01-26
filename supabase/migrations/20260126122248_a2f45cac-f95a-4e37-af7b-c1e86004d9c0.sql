-- Fix Security Definer View issue for v_team_season_agg
-- This view was missing security_invoker setting, causing it to use the view creator's permissions
-- instead of the querying user's permissions (bypassing RLS)

ALTER VIEW public.v_team_season_agg SET (security_invoker = on);