-- Drop the existing restrictive policy that only allows authenticated users
DROP POLICY IF EXISTS "Consolidated read access" ON public.brackets;

-- Create a new policy that allows both authenticated and anonymous users to view brackets
CREATE POLICY "Public can view brackets"
ON public.brackets
FOR SELECT
TO public  -- This includes both authenticated and anon roles
USING (true);