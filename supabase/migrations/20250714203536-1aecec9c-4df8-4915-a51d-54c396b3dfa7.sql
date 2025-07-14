-- Step 1: Add unique constraint on (division_id, seed) to prevent duplicate seeds within divisions
-- Use DEFERRABLE INITIALLY DEFERRED to allow temporary constraint violations during updates
ALTER TABLE public.teams 
ADD CONSTRAINT unique_division_seed 
UNIQUE (division_id, seed) 
DEFERRABLE INITIALLY DEFERRED;

-- Create utility function to reset seeds to NULL for automatic seeding
CREATE OR REPLACE FUNCTION public.reset_division_seeds(p_division_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.teams 
  SET seed = NULL 
  WHERE division_id = p_division_id;
END;
$$;

-- Create utility function to auto-assign seeds based on ranking
CREATE OR REPLACE FUNCTION public.auto_assign_seeds(p_division_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH ranked_teams AS (
    SELECT 
      t.id,
      ROW_NUMBER() OVER (
        ORDER BY 
          COALESCE(vt.power_score, 0) DESC,
          COALESCE(vt.win_percentage, 0) DESC,
          t.name
      ) as new_seed
    FROM public.teams t
    LEFT JOIN public.v_team_details vt ON t.id = vt.team_id
    WHERE t.division_id = p_division_id
  )
  UPDATE public.teams 
  SET seed = ranked_teams.new_seed
  FROM ranked_teams
  WHERE teams.id = ranked_teams.id;
END;
$$;

-- Create validation function to check for duplicate seeds
CREATE OR REPLACE FUNCTION public.validate_division_seeds(p_division_id uuid)
RETURNS TABLE(team_id uuid, team_name text, seed integer, conflict_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.seed,
    COUNT(*) OVER (PARTITION BY t.division_id, t.seed) as conflict_count
  FROM public.teams t
  WHERE t.division_id = p_division_id 
    AND t.seed IS NOT NULL
  ORDER BY t.seed;
END;
$$;

-- Comment on the new constraint
COMMENT ON CONSTRAINT unique_division_seed ON public.teams IS 
'Ensures unique seeds within each division for manual seed override functionality';

-- Comment on the utility functions
COMMENT ON FUNCTION public.reset_division_seeds(uuid) IS 
'Resets all team seeds to NULL for automatic seeding within a division';

COMMENT ON FUNCTION public.auto_assign_seeds(uuid) IS 
'Automatically assigns seeds based on team ranking (power score, win percentage) within a division';

COMMENT ON FUNCTION public.validate_division_seeds(uuid) IS 
'Validates seed uniqueness and returns any conflicts within a division';