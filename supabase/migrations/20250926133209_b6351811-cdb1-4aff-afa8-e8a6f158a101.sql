-- Diagnostic query to find the exact team names for COMP teams
DO $$
DECLARE
    team_record RECORD;
BEGIN
    RAISE NOTICE 'Available teams in Competitive and Competitive Low divisions:';
    
    FOR team_record IN 
        SELECT t.name, d.name as division_name
        FROM teams t
        LEFT JOIN divisions d ON t.division_id = d.id
        WHERE d.name IN ('Competitive', 'Competitive Low')
        ORDER BY d.name, t.name
    LOOP
        RAISE NOTICE 'Team: % (Division: %)', team_record.name, team_record.division_name;
    END LOOP;
    
    -- Also check for teams with similar names to what we're looking for
    RAISE NOTICE '--- Teams with keywords from our list ---';
    FOR team_record IN 
        SELECT t.name
        FROM teams t
        WHERE LOWER(t.name) LIKE '%bag%' OR 
              LOWER(t.name) LIKE '%seize%' OR 
              LOWER(t.name) LIKE '%hole%' OR 
              LOWER(t.name) LIKE '%came%' OR 
              LOWER(t.name) LIKE '%jager%' OR 
              LOWER(t.name) LIKE '%shut%' OR 
              LOWER(t.name) LIKE '%pepperoni%' OR 
              LOWER(t.name) LIKE '%cuzzo%' OR 
              LOWER(t.name) LIKE '%amigo%'
        ORDER BY t.name
    LOOP
        RAISE NOTICE 'Match: %', team_record.name;
    END LOOP;
END $$;