-- Add RLS policies for playoff_matches table to allow admins to manage playoff matches

-- Add INSERT policy for admins to create playoff matches
CREATE POLICY "Admins can insert playoff matches"
ON public.playoff_matches
FOR INSERT
TO authenticated
WITH CHECK (current_user_is_admin());

-- Add UPDATE policy for admins to update match results
CREATE POLICY "Admins can update playoff matches"
ON public.playoff_matches
FOR UPDATE
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Add DELETE policy for admins to delete playoff matches
CREATE POLICY "Admins can delete playoff matches"
ON public.playoff_matches
FOR DELETE
TO authenticated
USING (current_user_is_admin());