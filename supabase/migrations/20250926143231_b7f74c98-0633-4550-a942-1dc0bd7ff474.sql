-- Fix Summer 2 2025 division assignments based on playoff brackets
-- Season ID: d50bb12e-99be-4170-802a-695a402373ce

-- First, let's identify teams by their playoff bracket participation
-- Update Competitive division (bracket: 91aae806-4249-48ef-824d-dde8bcf14909)
UPDATE team_season_stats 
SET division_name = 'Competitive'
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id IN (
    SELECT DISTINCT COALESCE(pm.team1_id, pm.team2_id) as team_id
    FROM playoff_matches pm 
    WHERE pm.bracket_id = '91aae806-4249-48ef-824d-dde8bcf14909'
      AND COALESCE(pm.team1_id, pm.team2_id) IS NOT NULL
    UNION
    SELECT DISTINCT team1_id as team_id
    FROM playoff_matches pm 
    WHERE pm.bracket_id = '91aae806-4249-48ef-824d-dde8bcf14909'
      AND team1_id IS NOT NULL
    UNION  
    SELECT DISTINCT team2_id as team_id
    FROM playoff_matches pm 
    WHERE pm.bracket_id = '91aae806-4249-48ef-824d-dde8bcf14909'
      AND team2_id IS NOT NULL
  );

-- Update Intermediate High division (bracket: c8936056-134a-4eb8-bb67-f09815e5e9c3 - INT1)
UPDATE team_season_stats 
SET division_name = 'Intermediate High'
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id IN (
    SELECT DISTINCT COALESCE(pm.team1_id, pm.team2_id) as team_id
    FROM playoff_matches pm 
    WHERE pm.bracket_id = 'c8936056-134a-4eb8-bb67-f09815e5e9c3'
      AND COALESCE(pm.team1_id, pm.team2_id) IS NOT NULL
    UNION
    SELECT DISTINCT team1_id as team_id
    FROM playoff_matches pm 
    WHERE pm.bracket_id = 'c8936056-134a-4eb8-bb67-f09815e5e9c3'
      AND team1_id IS NOT NULL
    UNION  
    SELECT DISTINCT team2_id as team_id
    FROM playoff_matches pm 
    WHERE pm.bracket_id = 'c8936056-134a-4eb8-bb67-f09815e5e9c3'
      AND team2_id IS NOT NULL
  );

-- Update Intermediate Low division (bracket: e5ad0de8-c3bf-4a07-999d-49cb77cb99ba - INT2)
UPDATE team_season_stats 
SET division_name = 'Intermediate Low'
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id IN (
    SELECT DISTINCT COALESCE(pm.team1_id, pm.team2_id) as team_id
    FROM playoff_matches pm 
    WHERE pm.bracket_id = 'e5ad0de8-c3bf-4a07-999d-49cb77cb99ba'
      AND COALESCE(pm.team1_id, pm.team2_id) IS NOT NULL
    UNION
    SELECT DISTINCT team1_id as team_id
    FROM playoff_matches pm 
    WHERE pm.bracket_id = 'e5ad0de8-c3bf-4a07-999d-49cb77cb99ba'
      AND team1_id IS NOT NULL
    UNION  
    SELECT DISTINCT team2_id as team_id
    FROM playoff_matches pm 
    WHERE pm.bracket_id = 'e5ad0de8-c3bf-4a07-999d-49cb77cb99ba'
      AND team2_id IS NOT NULL
  );

-- Update Recreational division (bracket: f1527a61-9862-4f69-bf84-d13a244d503d - REC)
UPDATE team_season_stats 
SET division_name = 'Recreational'
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id IN (
    SELECT DISTINCT COALESCE(pm.team1_id, pm.team2_id) as team_id
    FROM playoff_matches pm 
    WHERE pm.bracket_id = 'f1527a61-9862-4f69-bf84-d13a244d503d'
      AND COALESCE(pm.team1_id, pm.team2_id) IS NOT NULL
    UNION
    SELECT DISTINCT team1_id as team_id
    FROM playoff_matches pm 
    WHERE pm.bracket_id = 'f1527a61-9862-4f69-bf84-d13a244d503d'
      AND team1_id IS NOT NULL
    UNION  
    SELECT DISTINCT team2_id as team_id
    FROM playoff_matches pm 
    WHERE pm.bracket_id = 'f1527a61-9862-4f69-bf84-d13a244d503d'
      AND team2_id IS NOT NULL
  );

-- Remove teams with 0-0 records that didn't participate in playoffs (they shouldn't be in team_season_stats)
DELETE FROM team_season_stats 
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND match_wins = 0 
  AND match_losses = 0 
  AND game_wins = 0 
  AND game_losses = 0
  AND division_name IS NULL;