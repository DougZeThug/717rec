-- Fix overly permissive RLS policies on divisions and games tables
-- These policies were incorrectly checking for 'authenticated' role instead of admin status

-- Fix divisions table policies
DROP POLICY IF EXISTS "Admin full access" ON public.divisions;
DROP POLICY IF EXISTS "Authenticated insert access" ON public.divisions;

CREATE POLICY "Admin full access" ON public.divisions
FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Fix games table policies  
DROP POLICY IF EXISTS "Admin full access" ON public.games;

CREATE POLICY "Admin full access" ON public.games
FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());