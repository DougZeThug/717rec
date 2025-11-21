-- Insert 18 playoff matches for Competitive Fall 2025 bracket
INSERT INTO playoff_matches (
  bracket_id, round, position, match_type, team1_id, team2_id, 
  team1_score, team2_score, winner_id, loser_id, status, best_of
) VALUES
-- Winners Bracket Round 1
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 1, 1, 'winners', 'c9d644a4-4e5a-43a0-9805-9d93299cda35', '626be920-071d-4aea-a1f5-1819893215ca', 2, 0, 'c9d644a4-4e5a-43a0-9805-9d93299cda35', '626be920-071d-4aea-a1f5-1819893215ca', 'completed', 3),
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 1, 2, 'winners', '9ee2b996-99f6-446c-be20-8255ca75d8c8', '8c5adea2-09b7-4298-83dc-295dae74fdb8', 2, 0, '9ee2b996-99f6-446c-be20-8255ca75d8c8', '8c5adea2-09b7-4298-83dc-295dae74fdb8', 'completed', 3),
-- Winners Bracket Round 2
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 2, 1, 'winners', 'ad4ec289-fd85-4322-8ebb-68647607de23', 'c9d644a4-4e5a-43a0-9805-9d93299cda35', 2, 1, 'ad4ec289-fd85-4322-8ebb-68647607de23', 'c9d644a4-4e5a-43a0-9805-9d93299cda35', 'completed', 3),
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 2, 2, 'winners', 'af3bf12d-b671-4458-9d3c-5c2e29e362ac', 'a8822ac7-598c-4ac3-86b9-05bf7e1ee7e1', 2, 0, 'af3bf12d-b671-4458-9d3c-5c2e29e362ac', 'a8822ac7-598c-4ac3-86b9-05bf7e1ee7e1', 'completed', 3),
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 2, 3, 'winners', '77110b92-d2d8-495b-afed-cac65deb6253', '9ee2b996-99f6-446c-be20-8255ca75d8c8', 2, 1, '77110b92-d2d8-495b-afed-cac65deb6253', '9ee2b996-99f6-446c-be20-8255ca75d8c8', 'completed', 3),
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 2, 4, 'winners', 'f243ccec-9f41-4899-8170-d98812373012', 'b214167b-7f7e-4470-a811-bf2a093c9620', 2, 1, 'f243ccec-9f41-4899-8170-d98812373012', 'b214167b-7f7e-4470-a811-bf2a093c9620', 'completed', 3),
-- Winners Bracket Round 3
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 3, 1, 'winners', 'ad4ec289-fd85-4322-8ebb-68647607de23', 'af3bf12d-b671-4458-9d3c-5c2e29e362ac', 2, 0, 'ad4ec289-fd85-4322-8ebb-68647607de23', 'af3bf12d-b671-4458-9d3c-5c2e29e362ac', 'completed', 3),
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 3, 2, 'winners', '77110b92-d2d8-495b-afed-cac65deb6253', 'f243ccec-9f41-4899-8170-d98812373012', 2, 0, '77110b92-d2d8-495b-afed-cac65deb6253', 'f243ccec-9f41-4899-8170-d98812373012', 'completed', 3),
-- Winners Bracket Round 4 (Semifinals)
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 4, 1, 'winners', '77110b92-d2d8-495b-afed-cac65deb6253', 'ad4ec289-fd85-4322-8ebb-68647607de23', 2, 0, '77110b92-d2d8-495b-afed-cac65deb6253', 'ad4ec289-fd85-4322-8ebb-68647607de23', 'completed', 3),
-- Losers Bracket Round 1
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 1, 1, 'losers', 'b214167b-7f7e-4470-a811-bf2a093c9620', '626be920-071d-4aea-a1f5-1819893215ca', 2, 0, 'b214167b-7f7e-4470-a811-bf2a093c9620', '626be920-071d-4aea-a1f5-1819893215ca', 'completed', 3),
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 1, 2, 'losers', 'a8822ac7-598c-4ac3-86b9-05bf7e1ee7e1', '8c5adea2-09b7-4298-83dc-295dae74fdb8', 2, 0, 'a8822ac7-598c-4ac3-86b9-05bf7e1ee7e1', '8c5adea2-09b7-4298-83dc-295dae74fdb8', 'completed', 3),
-- Losers Bracket Round 2
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 2, 1, 'losers', 'b214167b-7f7e-4470-a811-bf2a093c9620', '9ee2b996-99f6-446c-be20-8255ca75d8c8', 2, 0, 'b214167b-7f7e-4470-a811-bf2a093c9620', '9ee2b996-99f6-446c-be20-8255ca75d8c8', 'completed', 3),
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 2, 2, 'losers', 'c9d644a4-4e5a-43a0-9805-9d93299cda35', 'a8822ac7-598c-4ac3-86b9-05bf7e1ee7e1', 2, 0, 'c9d644a4-4e5a-43a0-9805-9d93299cda35', 'a8822ac7-598c-4ac3-86b9-05bf7e1ee7e1', 'completed', 3),
-- Losers Bracket Round 3
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 3, 1, 'losers', 'b214167b-7f7e-4470-a811-bf2a093c9620', 'af3bf12d-b671-4458-9d3c-5c2e29e362ac', 2, 0, 'b214167b-7f7e-4470-a811-bf2a093c9620', 'af3bf12d-b671-4458-9d3c-5c2e29e362ac', 'completed', 3),
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 3, 2, 'losers', 'f243ccec-9f41-4899-8170-d98812373012', 'c9d644a4-4e5a-43a0-9805-9d93299cda35', 2, 1, 'f243ccec-9f41-4899-8170-d98812373012', 'c9d644a4-4e5a-43a0-9805-9d93299cda35', 'completed', 3),
-- Losers Bracket Round 4
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 4, 1, 'losers', 'f243ccec-9f41-4899-8170-d98812373012', 'b214167b-7f7e-4470-a811-bf2a093c9620', 2, 0, 'f243ccec-9f41-4899-8170-d98812373012', 'b214167b-7f7e-4470-a811-bf2a093c9620', 'completed', 3),
-- Losers Bracket Round 5
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 5, 1, 'losers', 'ad4ec289-fd85-4322-8ebb-68647607de23', 'f243ccec-9f41-4899-8170-d98812373012', 2, 0, 'ad4ec289-fd85-4322-8ebb-68647607de23', 'f243ccec-9f41-4899-8170-d98812373012', 'completed', 3),
-- Finals
('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 1, 1, 'finals', '77110b92-d2d8-495b-afed-cac65deb6253', 'ad4ec289-fd85-4322-8ebb-68647607de23', 2, 0, '77110b92-d2d8-495b-afed-cac65deb6253', 'ad4ec289-fd85-4322-8ebb-68647607de23', 'completed', 3);