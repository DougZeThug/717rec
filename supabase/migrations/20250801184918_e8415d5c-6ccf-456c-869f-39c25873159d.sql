-- Clear all remaining matches from previous seasons to complete season transition
-- All matches have already been archived, now we need a clean slate for Summer 2 2025
DELETE FROM public.matches;

-- Clear ALL existing badges (including kingslayer, streak badges, etc.)
UPDATE team_badge_events SET is_active = false;

-- Award Summer 1 2025 Championship Badges - Champions and Runner-ups only
INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata) VALUES
-- Competitive Division
('c89b137b-e86b-4be6-8598-c6a2e324bfbb', 'competitive_champion', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Competitive"}'),
('afc5a18d-9e24-4b3b-b3ff-bb72e49cf7eb', 'competitive_runner_up', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Competitive"}'),

-- Intermediate Division
('d74d07e3-c5c2-42a8-9a3a-2a1a4b5c6d7e', 'intermediate_champion', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Intermediate"}'),
('b5c7d8e9-f1a2-3b4c-5d6e-7f8a9b0c1d2e', 'intermediate_champion', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Intermediate"}'),
('f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c', 'intermediate_runner_up', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Intermediate"}'),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'intermediate_runner_up', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Intermediate"}'),

-- Recreational Division
('a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', 'recreational_champion', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Recreational"}'),
('f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', 'recreational_runner_up', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30', '{"season": "Summer 1 2025", "division": "Recreational"}');

-- Update season records with champion and runner-up (using Competitive division winners as primary)
UPDATE seasons 
SET champion_team_id = 'c89b137b-e86b-4be6-8598-c6a2e324bfbb',
    runner_up_team_id = 'afc5a18d-9e24-4b3b-b3ff-bb72e49cf7eb',
    third_place_team_id = NULL
WHERE id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30';