-- Fix brackets table RLS policies to use current_user_is_admin()
-- Drop incorrect policies that check auth.role()
DROP POLICY IF EXISTS "Admin full access for INSERT" ON public.brackets;
DROP POLICY IF EXISTS "Admin full access for DELETE" ON public.brackets;
DROP POLICY IF EXISTS "Admin full access for UPDATE" ON public.brackets;

-- Create correct policies using current_user_is_admin()
CREATE POLICY "Admins can insert brackets" 
ON public.brackets
FOR INSERT 
TO authenticated
WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins can update brackets" 
ON public.brackets
FOR UPDATE 
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins can delete brackets" 
ON public.brackets
FOR DELETE 
TO authenticated
USING (current_user_is_admin());