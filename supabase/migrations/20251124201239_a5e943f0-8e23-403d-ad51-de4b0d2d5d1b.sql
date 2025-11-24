-- Comprehensive Fix for Summer 2 (INT1) Playoff Bracket
-- Bracket ID: c8936056-134a-4eb8-bb67-f09815e5e9c3
-- Season ID: 5f4e85cd-0532-42f3-9f68-7efc4ed1c1e6
-- Created: 2025-09-26

-- ============================================================================
-- STEP 1: UPDATE INCORRECT WINNERS BRACKET MATCHES
-- ============================================================================

-- Match 1: Winners R1 P1 - Believers 0-2 Miracle @ Marion
UPDATE playoff_matches 
SET 
  team1_id = 'f7e65c9a-4a56-4e7a-bcff-60e64c71b893', -- Believers
  team2_id = '2ab2e684-8c28-45c3-801a-ea215433a8e4', -- Miracle @ Marion
  team1_score = 0,
  team2_score = 2,
  winner_id = '2ab2e684-8c28-45c3-801a-ea215433a8e4', -- Miracle @ Marion
  loser_id = 'f7e65c9a-4a56-4e7a-bcff-60e64c71b893'  -- Believers
WHERE id = '5aefe1b8-7fde-4fe1-9959-3ff5d0d80710';

-- Match 3: Winners R1 P3 - Sweat Bandits 1-2 Wrong Hole
UPDATE playoff_matches 
SET 
  team1_id = '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', -- Sweat Bandits
  team2_id = '0c7261b9-db22-48d1-8487-ba9eeb90fbef', -- Wrong Hole
  team1_score = 1,
  team2_score = 2,
  winner_id = '0c7261b9-db22-48d1-8487-ba9eeb90fbef', -- Wrong Hole
  loser_id = '4ce38a7a-df7b-4d71-a17c-b8be65e342fe'  -- Sweat Bandits
WHERE id = '6910828c-b2d6-4534-a9d3-9b0ee094d892';

-- Match 4: Winners R1 P4 - The Beards 0-2 Bag Assassins
UPDATE playoff_matches 
SET 
  team1_id = '3563ec8d-04bb-4517-b4de-305494f7bbf8', -- The Beards
  team2_id = '21f5f389-1ad4-4dc5-a828-0e2972c13845', -- Bag Assassins
  team1_score = 0,
  team2_score = 2,
  winner_id = '21f5f389-1ad4-4dc5-a828-0e2972c13845', -- Bag Assassins
  loser_id = '3563ec8d-04bb-4517-b4de-305494f7bbf8'  -- The Beards
WHERE id = 'd685e317-00cf-4bfd-9ae1-5f6e9984a2a1';

-- Match 5: Winners R2 P1 - Mailmen 0-2 Baggin' & Braggin'
UPDATE playoff_matches 
SET 
  round = 2,
  team1_id = '410f4fd2-a730-48e1-a773-30db1478d208', -- Mailmen
  team2_id = 'fcb5fb21-a8f4-4dbd-a04d-7688832ada8c', -- Baggin' & Braggin'
  team1_score = 0,
  team2_score = 2,
  winner_id = 'fcb5fb21-a8f4-4dbd-a04d-7688832ada8c', -- Baggin' & Braggin'
  loser_id = '410f4fd2-a730-48e1-a773-30db1478d208'  -- Mailmen
WHERE id = '30619e2d-fac0-44af-9d56-b267eb062b02';

-- Match 6: Winners R2 P2 - Happy Valley Hole Hunters 0-2 Miracle @ Marion (this was shown as 2-0 in verification, checking)
UPDATE playoff_matches 
SET 
  team1_id = 'a484a124-89f8-468d-9ebb-2709ad47c7f5', -- Happy Valley Hole Hunters
  team2_id = '2ab2e684-8c28-45c3-801a-ea215433a8e4', -- Miracle @ Marion
  team1_score = 2,
  team2_score = 0,
  winner_id = 'a484a124-89f8-468d-9ebb-2709ad47c7f5', -- Happy Valley Hole Hunters
  loser_id = '2ab2e684-8c28-45c3-801a-ea215433a8e4'  -- Miracle @ Marion
WHERE id = '1771e25d-e61e-4fe8-968a-b0869e92777e';

-- Match 7: Winners R2 P3 - Sweat Bandits 1-2 Wrong Hole
UPDATE playoff_matches 
SET 
  round = 2,
  position = 3,
  team1_id = '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', -- Sweat Bandits
  team2_id = '0c7261b9-db22-48d1-8487-ba9eeb90fbef', -- Wrong Hole
  team1_score = 1,
  team2_score = 2,
  winner_id = '0c7261b9-db22-48d1-8487-ba9eeb90fbef', -- Wrong Hole
  loser_id = '4ce38a7a-df7b-4d71-a17c-b8be65e342fe'  -- Sweat Bandits
WHERE id = '6814d8e0-aa3a-4b3e-af5b-f3178128aaed';

-- Match 8: Winners R2 P4 - The Beards 0-2 Bag Assassins
UPDATE playoff_matches 
SET 
  round = 2,
  position = 4,
  team1_id = '3563ec8d-04bb-4517-b4de-305494f7bbf8', -- The Beards
  team2_id = '21f5f389-1ad4-4dc5-a828-0e2972c13845', -- Bag Assassins
  team1_score = 0,
  team2_score = 2,
  winner_id = '21f5f389-1ad4-4dc5-a828-0e2972c13845', -- Bag Assassins
  loser_id = '3563ec8d-04bb-4517-b4de-305494f7bbf8'  -- The Beards
WHERE id = 'd437b93e-af08-4d85-8ca6-3c6ac6447ae4';

-- ============================================================================
-- STEP 2: UPDATE INCORRECT LOSERS BRACKET MATCHES
-- ============================================================================

-- Match 9: Losers R1 P1 - Mailmen 2-0 Believers
UPDATE playoff_matches 
SET 
  team1_id = '410f4fd2-a730-48e1-a773-30db1478d208', -- Mailmen
  team2_id = 'f7e65c9a-4a56-4e7a-bcff-60e64c71b893', -- Believers
  team1_score = 2,
  team2_score = 0,
  winner_id = '410f4fd2-a730-48e1-a773-30db1478d208', -- Mailmen
  loser_id = 'f7e65c9a-4a56-4e7a-bcff-60e64c71b893'  -- Believers
WHERE id = '5946524a-7a7d-4b4a-9dc1-400f357004a5';

-- Match 11: Losers R2 P1 - The Beards 0-2 Mailmen (note: this appears to be a duplicate in structure)
UPDATE playoff_matches 
SET 
  team1_id = '3563ec8d-04bb-4517-b4de-305494f7bbf8', -- The Beards
  team2_id = '410f4fd2-a730-48e1-a773-30db1478d208', -- Mailmen
  team1_score = 0,
  team2_score = 2,
  winner_id = '410f4fd2-a730-48e1-a773-30db1478d208', -- Mailmen
  loser_id = '3563ec8d-04bb-4517-b4de-305494f7bbf8'  -- The Beards
WHERE id = '51bca258-7e28-4021-8ff0-8e06cc23af2e';

-- Match 12: Losers R2 P2 - Sweat Bandits 2-0 Miracle @ Marion
UPDATE playoff_matches 
SET 
  team1_id = '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', -- Sweat Bandits
  team2_id = '2ab2e684-8c28-45c3-801a-ea215433a8e4', -- Miracle @ Marion
  team1_score = 2,
  team2_score = 0,
  winner_id = '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', -- Sweat Bandits
  loser_id = '2ab2e684-8c28-45c3-801a-ea215433a8e4'  -- Miracle @ Marion
WHERE id = '8ac935e9-78d8-4f3d-8cac-e9b98168ffbe';

-- Match 13: Losers R3 P1 - Happy Valley Hole Hunters 2-0 Mailmen
UPDATE playoff_matches 
SET 
  team1_id = 'a484a124-89f8-468d-9ebb-2709ad47c7f5', -- Happy Valley Hole Hunters
  team2_id = '410f4fd2-a730-48e1-a773-30db1478d208', -- Mailmen
  team1_score = 2,
  team2_score = 0,
  winner_id = 'a484a124-89f8-468d-9ebb-2709ad47c7f5', -- Happy Valley Hole Hunters
  loser_id = '410f4fd2-a730-48e1-a773-30db1478d208'  -- Mailmen
WHERE id = '5bc2bfff-4726-432d-bc02-b56708c72f12';

-- Match 14: Losers R4 P1 - Bag Assassins 0-2 Sweat Bandits
UPDATE playoff_matches 
SET 
  team1_id = '21f5f389-1ad4-4dc5-a828-0e2972c13845', -- Bag Assassins
  team2_id = '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', -- Sweat Bandits
  team1_score = 0,
  team2_score = 2,
  winner_id = '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', -- Sweat Bandits
  loser_id = '21f5f389-1ad4-4dc5-a828-0e2972c13845'  -- Bag Assassins
WHERE id = '0b6f2ef1-8513-4e11-b1ed-7a948d1c420e';

-- ============================================================================
-- STEP 3: INSERT MISSING MATCHES
-- ============================================================================

-- Winners R3 P1: Happy Valley Hole Hunters 0-2 Wrong Hole
INSERT INTO playoff_matches (
  id, bracket_id, round, position, match_type,
  team1_id, team2_id, team1_score, team2_score,
  winner_id, loser_id, best_of, status, created_at
) VALUES (
  gen_random_uuid(),
  'c8936056-134a-4eb8-bb67-f09815e5e9c3',
  3, 1, 'winners',
  'a484a124-89f8-468d-9ebb-2709ad47c7f5', -- Happy Valley Hole Hunters
  '0c7261b9-db22-48d1-8487-ba9eeb90fbef', -- Wrong Hole
  0, 2,
  '0c7261b9-db22-48d1-8487-ba9eeb90fbef', -- Wrong Hole
  'a484a124-89f8-468d-9ebb-2709ad47c7f5', -- Happy Valley Hole Hunters
  3, 'completed', '2025-09-26'
);

-- Winners R3 P2: Bag Assassins 0-2 Baggin' & Braggin'
INSERT INTO playoff_matches (
  id, bracket_id, round, position, match_type,
  team1_id, team2_id, team1_score, team2_score,
  winner_id, loser_id, best_of, status, created_at
) VALUES (
  gen_random_uuid(),
  'c8936056-134a-4eb8-bb67-f09815e5e9c3',
  3, 2, 'winners',
  '21f5f389-1ad4-4dc5-a828-0e2972c13845', -- Bag Assassins
  'fcb5fb21-a8f4-4dbd-a04d-7688832ada8c', -- Baggin' & Braggin'
  0, 2,
  'fcb5fb21-a8f4-4dbd-a04d-7688832ada8c', -- Baggin' & Braggin'
  '21f5f389-1ad4-4dc5-a828-0e2972c13845', -- Bag Assassins
  3, 'completed', '2025-09-26'
);

-- Winners R4/Semifinals: Wrong Hole 0-2 Baggin' & Braggin'
INSERT INTO playoff_matches (
  id, bracket_id, round, position, match_type,
  team1_id, team2_id, team1_score, team2_score,
  winner_id, loser_id, best_of, status, created_at
) VALUES (
  gen_random_uuid(),
  'c8936056-134a-4eb8-bb67-f09815e5e9c3',
  4, 1, 'winners',
  '0c7261b9-db22-48d1-8487-ba9eeb90fbef', -- Wrong Hole
  'fcb5fb21-a8f4-4dbd-a04d-7688832ada8c', -- Baggin' & Braggin'
  0, 2,
  'fcb5fb21-a8f4-4dbd-a04d-7688832ada8c', -- Baggin' & Braggin'
  '0c7261b9-db22-48d1-8487-ba9eeb90fbef', -- Wrong Hole
  3, 'completed', '2025-09-26'
);

-- Losers R4 P2: Happy Valley Hole Hunters 2-1 Sweat Bandits
INSERT INTO playoff_matches (
  id, bracket_id, round, position, match_type,
  team1_id, team2_id, team1_score, team2_score,
  winner_id, loser_id, best_of, status, created_at
) VALUES (
  gen_random_uuid(),
  'c8936056-134a-4eb8-bb67-f09815e5e9c3',
  4, 2, 'losers',
  'a484a124-89f8-468d-9ebb-2709ad47c7f5', -- Happy Valley Hole Hunters
  '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', -- Sweat Bandits
  2, 1,
  'a484a124-89f8-468d-9ebb-2709ad47c7f5', -- Happy Valley Hole Hunters
  '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', -- Sweat Bandits
  3, 'completed', '2025-09-26'
);

-- ============================================================================
-- STEP 4: RECALCULATE TEAM SEASON STATS
-- ============================================================================
SELECT public.upsert_team_season_stats();