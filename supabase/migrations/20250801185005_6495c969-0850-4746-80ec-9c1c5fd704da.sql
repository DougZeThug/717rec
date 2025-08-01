-- Clear all remaining matches from previous seasons to complete season transition
-- All matches have already been archived, now we need a clean slate for Summer 2 2025
DELETE FROM public.matches;

-- Clear ALL existing badges (including kingslayer, streak badges, etc.)
UPDATE team_badge_events SET is_active = false;

-- Award Summer 1 2025 Championship Badges - Champions and Runner-ups only using correct team IDs
INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata) VALUES
-- Competitive Division
('ad4ec289-fd85-4322-8ebb-68647607de23', 'competitive_champion', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Competitive"}'),
('8c5adea2-09b7-4298-83dc-295dae74fdb8', 'competitive_runner_up', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Competitive"}'),

-- Intermediate Division
('2ab2e684-8c28-45c3-801a-ea215433a8e4', 'intermediate_champion', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Intermediate"}'),
('c9d644a4-4e5a-43a0-9805-9d93299cda35', 'intermediate_champion', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Intermediate"}'),
('56387477-8ba1-43b7-a307-414926ca5f79', 'intermediate_runner_up', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Intermediate"}'),
('410f4fd2-a730-48e1-a773-30db1478d208', 'intermediate_runner_up', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Intermediate"}'),

-- Recreational Division
('c577e0f9-6700-4220-a902-b368ca915bbd', 'recreational_champion', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Recreational"}'),
('45d05ced-1a8c-46a1-bfdc-5e77c6702bf7', 'recreational_runner_up', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Recreational"}');

-- Update season records with champion and runner-up (using Competitive division winners as primary)
UPDATE seasons 
SET champion_team_id = 'ad4ec289-fd85-4322-8ebb-68647607de23',
    runner_up_team_id = '8c5adea2-09b7-4298-83dc-295dae74fdb8',
    third_place_team_id = NULL
WHERE id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30';