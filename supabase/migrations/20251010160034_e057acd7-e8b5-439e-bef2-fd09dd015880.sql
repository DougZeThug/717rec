-- Remove incorrect Kingslayer badge from Corn Kitties
DELETE FROM team_badge_events 
WHERE id = 'cf33d0ab-fdc4-481f-88c4-857965ba0c74';

-- Award championship badges to Summer 2 2025 champions
INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata, is_active)
VALUES 
  -- Cuzzo's Clinic - Competitive Champion
  ('ad4ec289-fd85-4322-8ebb-68647607de23', 'competitive_champion', 'd50bb12e-99be-4170-802a-695a402373ce', '{}', true),
  -- Baggin' & Braggin' - Intermediate 2 Champion
  ('fcb5fb21-a8f4-4dbd-a04d-7688832ada8c', 'intermediate_champion', 'd50bb12e-99be-4170-802a-695a402373ce', '{"division_variant": "intermediate_2"}', true),
  -- Zoo Pals - Intermediate 1 Champion
  ('56387477-8ba1-43b7-a307-414926ca5f79', 'intermediate_champion', 'd50bb12e-99be-4170-802a-695a402373ce', '{"division_variant": "intermediate_1"}', true),
  -- Jerm - Recreational Champion
  ('aa967a4d-b9a8-496e-81e9-7993ac005763', 'recreational_champion', 'd50bb12e-99be-4170-802a-695a402373ce', '{}', true);