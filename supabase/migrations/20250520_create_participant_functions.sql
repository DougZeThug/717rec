
-- Function to safely insert a participant
-- This function can be called by our code even before the table exists
CREATE OR REPLACE FUNCTION public.insert_participant(
  p_bracket_id UUID,
  p_team_id UUID,
  p_position INT
) RETURNS VOID AS $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  -- Check if participants table exists
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'participants'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Insert into participants table if it exists
    INSERT INTO public.participants (bracket_id, team_id, position)
    VALUES (p_bracket_id, p_team_id, p_position)
    ON CONFLICT (bracket_id, team_id) 
    DO UPDATE SET position = p_position;
  ELSE
    -- Fall back to updating seed in teams table
    UPDATE public.teams SET seed = p_position WHERE id = p_team_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely query participants
-- This function can be called by our code even before the table exists
CREATE OR REPLACE FUNCTION public.get_participants(
  p_tournament_id UUID
) RETURNS TABLE (
  id UUID,
  name TEXT,
  tournament_id UUID,
  position INT
) AS $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  -- Check if participants table exists
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'participants'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Return data from participants table if it exists
    RETURN QUERY
    SELECT 
      t.id,
      t.name,
      p.bracket_id AS tournament_id,
      p.position
    FROM public.participants p
    JOIN public.teams t ON t.id = p.team_id
    WHERE p.bracket_id = p_tournament_id
    ORDER BY p.position;
  ELSE
    -- Fall back to teams table with seed information
    RETURN QUERY
    SELECT 
      t.id,
      t.name,
      b.id AS tournament_id,
      t.seed AS position
    FROM public.teams t
    JOIN public.brackets b ON b.id = p_tournament_id
    WHERE t.seed IS NOT NULL AND t.division_id = b.division_id
    ORDER BY t.seed;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
