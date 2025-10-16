-- Fix profiles RLS policies to restore admin access
-- The current policy checks for a non-existent JWT claim 'user_role'
-- We need to use the existing is_admin column and current_user_is_admin() function

-- Drop the problematic policy
DROP POLICY IF EXISTS "Anon select (admin or self)" ON public.profiles;

-- Create two clear, separate policies
CREATE POLICY "Users can view own profile"
ON public.profiles 
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles 
FOR SELECT
TO authenticated
USING (current_user_is_admin());

-- Add comment for clarity
COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 
'Allows authenticated users to read their own profile data';

COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 
'Allows admin users to read all profiles using server-side is_admin check';