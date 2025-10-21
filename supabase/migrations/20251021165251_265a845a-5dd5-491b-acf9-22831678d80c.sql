-- Add RLS policies for playoff_matches to allow admins to manage brackets

-- Allow admins to insert playoff matches (needed for bracket creation)
CREATE POLICY "Admins can insert playoff matches"
ON playoff_matches
FOR INSERT
TO authenticated
WITH CHECK (public.current_user_is_admin());

-- Allow admins to update playoff matches (needed for match score updates)
CREATE POLICY "Admins can update playoff matches"
ON playoff_matches
FOR UPDATE
TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

-- Allow admins to delete playoff matches (needed for bracket deletion/cleanup)
CREATE POLICY "Admins can delete playoff matches"
ON playoff_matches
FOR DELETE
TO authenticated
USING (public.current_user_is_admin());