-- Phase 1 Security Fixes: Restrict match_comments and debug_match_updates access

-- =====================================================
-- 1. match_comments - Restrict SELECT to authenticated users only
-- =====================================================
-- Drop the overly permissive public access policy
DROP POLICY IF EXISTS "Everyone can view comments" ON public.match_comments;

-- Create new policy requiring authentication to view comments
CREATE POLICY "Authenticated users can view comments" 
  ON public.match_comments 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- =====================================================
-- 2. debug_match_updates - Restrict ALL operations to admins only
-- =====================================================
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can delete their own match updates" ON public.debug_match_updates;
DROP POLICY IF EXISTS "Authenticated users can insert match updates" ON public.debug_match_updates;
DROP POLICY IF EXISTS "Authenticated users can select their own match updates" ON public.debug_match_updates;
DROP POLICY IF EXISTS "Authenticated users can update their own match updates" ON public.debug_match_updates;

-- Create single admin-only policy for all operations
CREATE POLICY "Admins can manage debug match updates" 
  ON public.debug_match_updates 
  FOR ALL 
  TO authenticated 
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Add comment documenting security decisions
COMMENT ON TABLE public.debug_match_updates IS 'Debug table for match update auditing - admin access only';
COMMENT ON TABLE public.match_comments IS 'Match discussion comments - requires authentication to view';