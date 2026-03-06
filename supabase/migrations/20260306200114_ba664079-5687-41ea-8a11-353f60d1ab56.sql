
-- ============================================================
-- Tighten overly permissive RLS policies
-- ============================================================

-- 1. team_season_stats: Drop permissive ALL policy, add admin-only write
DROP POLICY IF EXISTS "Authenticated users can manage team season stats" ON public.team_season_stats;

CREATE POLICY "Admins can manage team season stats"
  ON public.team_season_stats
  FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- 2. teams: Drop 3 duplicate permissive UPDATE policies
DROP POLICY IF EXISTS "Unified update access for authenticated users" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can update and check teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can update teams" ON public.teams;

-- 3. teams: Replace wide-open INSERT with admin-only
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;

CREATE POLICY "Admins can create teams"
  ON public.teams
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());
