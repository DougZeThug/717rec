-- Fix RLS policies for ranking_snapshots table
-- Rankings are system-calculated and should be saveable by authenticated users

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can insert rankings" ON public.ranking_snapshots;
DROP POLICY IF EXISTS "Admins can update rankings" ON public.ranking_snapshots;

-- Create new policies for authenticated users
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