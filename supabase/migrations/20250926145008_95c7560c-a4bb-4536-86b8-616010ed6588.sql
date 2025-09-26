-- Update playoff rankings for Competitive division teams in Summer 2 2025
-- Season ID: d50bb12e-99be-4170-802a-695a402373ce

-- Move Hole Violators from 8th to 6th place
UPDATE team_season_stats 
SET playoff_rank = 6
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id = 'f243ccec-9f41-4899-8170-d98812373012'; -- Hole Violators

-- Move Pepperoni Cheesers from 6th to 7th place  
UPDATE team_season_stats 
SET playoff_rank = 7
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id = 'c9d644a4-4e5a-43a0-9805-9d93299cda35'; -- Pepperoni Cheesers

-- Move Shut Your Cornhole from 7th to 8th place
UPDATE team_season_stats 
SET playoff_rank = 8
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id = '5db6b718-81af-4bd0-a0cd-0a0eae4330ad'; -- Shut Your Cornhole