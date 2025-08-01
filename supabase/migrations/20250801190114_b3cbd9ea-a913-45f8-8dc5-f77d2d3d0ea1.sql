-- Update badge metadata to properly identify Intermediate High vs Low divisions
UPDATE team_badge_events 
SET metadata = '{"season": "Summer 1 2025", "division": "Intermediate High"}'::jsonb
WHERE team_id = 'c9d644a4-4e5a-43a0-9805-9d93299cda35' 
AND badge_type = 'intermediate_champion';

UPDATE team_badge_events 
SET metadata = '{"season": "Summer 1 2025", "division": "Intermediate Low"}'::jsonb  
WHERE team_id = '2ab2e684-8c28-45c3-801a-ea215433a8e4'
AND badge_type = 'intermediate_champion';

-- Also update runner-up badges for intermediate divisions
UPDATE team_badge_events 
SET metadata = '{"season": "Summer 1 2025", "division": "Intermediate High"}'::jsonb
WHERE team_id = '56387477-8ba1-43b7-a307-414926ca5f79'
AND badge_type = 'intermediate_runner_up';

UPDATE team_badge_events 
SET metadata = '{"season": "Summer 1 2025", "division": "Intermediate Low"}'::jsonb
WHERE team_id = '410f4fd2-a730-48e1-a773-30db1478d208' 
AND badge_type = 'intermediate_runner_up';