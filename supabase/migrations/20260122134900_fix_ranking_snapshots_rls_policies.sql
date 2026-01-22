-- Fix RLS policies for ranking_snapshots table
-- The previous policies were too restrictive, requiring admin access for all writes
-- Rankings are automatically calculated and should be saveable by authenticated users

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Admins can insert rankings" ON public.ranking_snapshots;
DROP POLICY IF EXISTS "Admins can update rankings" ON public.ranking_snapshots;
DROP POLICY IF EXISTS "Admins can delete rankings" ON public.ranking_snapshots;

-- Create new policies allowing authenticated users to save rankings
CREATE POLICY "Authenticated users can insert rankings"
ON public.ranking_snapshots
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update rankings"
ON public.ranking_snapshots
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Keep delete restricted to admins for data integrity
CREATE POLICY "Admins can delete rankings"
ON public.ranking_snapshots
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);
