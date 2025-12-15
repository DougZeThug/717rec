-- Fix security definer view warning on v_team_season_agg
-- This ensures the view respects the querying user's RLS policies
-- instead of the view creator's permissions

ALTER VIEW public.v_team_season_agg SET (security_invoker = on);