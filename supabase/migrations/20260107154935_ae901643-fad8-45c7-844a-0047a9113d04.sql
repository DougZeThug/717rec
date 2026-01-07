-- Drop the existing insert policy that requires authentication
DROP POLICY IF EXISTS "Authenticated users can insert participation" ON public.season_team_participation;

-- Create new policy allowing anyone to insert participation
CREATE POLICY "Anyone can insert participation" 
ON public.season_team_participation 
FOR INSERT 
WITH CHECK (true);

-- Also update the update policy to allow anyone to update
DROP POLICY IF EXISTS "Authenticated users can update participation" ON public.season_team_participation;

CREATE POLICY "Anyone can update participation" 
ON public.season_team_participation 
FOR UPDATE 
USING (true)
WITH CHECK (true);