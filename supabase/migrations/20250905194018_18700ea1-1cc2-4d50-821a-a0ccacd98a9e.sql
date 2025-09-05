-- INT1 Spring 2025 Playoffs Backfill
-- Create the bracket for INT1 division playoffs

DO $$
DECLARE
    int1_division_id uuid;
    bracket_id uuid;
    
    -- Team IDs (using provided correct ID for Tag Em' & Bag Em')
    zoo_pals_id uuid := '4ff34d5b-aeff-43c1-b86a-5b956ba9f4b9';
    on_a_mission_id uuid := 'ca2b7bef-40d5-4797-a8fc-1bbef5e3b91c';
    tom_tom_id uuid := '63b9f83b-6df0-423a-b3d9-f0ac34b7e9a1';
    tag_em_bag_em_id uuid := '8aef742f-f7d7-4996-a2bb-96a430b5e005';
    bag_assassins_id uuid := '7b79a9a8-1f74-46e8-aa71-ef4ce86c48ab';
    buttery_nipples_id uuid := '75fa9720-1a9a-4c37-988f-0c9b78eeefe8';
    happy_valley_id uuid := '5e9fbc73-3d76-418c-b40f-4de632f94e89';
    undigestibles_id uuid := '65f3b2c5-c8a1-44b7-9b9e-3a7d8e9f1c3a';
    
BEGIN
    -- Get INT1 division ID
    SELECT id INTO int1_division_id FROM divisions WHERE name = 'INT1';
    
    -- Create bracket
    INSERT INTO brackets (title, division_id, format, state, created_at)
    VALUES ('INT1 Spring 2025 Playoffs', int1_division_id, 'Double Elimination', 'completed', '2025-03-15 10:00:00+00')
    RETURNING id INTO bracket_id;
    
    -- Winners Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'winners', zoo_pals_id, on_a_mission_id, 2, 0, zoo_pals_id, on_a_mission_id, 3, 'completed', '2025-03-15 10:00:00+00'),
    (gen_random_uuid(), bracket_id, 1, 2, 'winners', tom_tom_id, tag_em_bag_em_id, 0, 2, tag_em_bag_em_id, tom_tom_id, 3, 'completed', '2025-03-15 10:30:00+00'),
    (gen_random_uuid(), bracket_id, 1, 3, 'winners', bag_assassins_id, buttery_nipples_id, 2, 0, bag_assassins_id, buttery_nipples_id, 3, 'completed', '2025-03-15 11:00:00+00'),
    (gen_random_uuid(), bracket_id, 1, 4, 'winners', happy_valley_id, undigestibles_id, 2, 0, happy_valley_id, undigestibles_id, 3, 'completed', '2025-03-15 11:30:00+00');
    
    -- Winners Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'winners', zoo_pals_id, tag_em_bag_em_id, 1, 2, tag_em_bag_em_id, zoo_pals_id, 3, 'completed', '2025-03-15 12:00:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'winners', bag_assassins_id, happy_valley_id, 2, 0, bag_assassins_id, happy_valley_id, 3, 'completed', '2025-03-15 12:30:00+00');
    
    -- Winners Bracket Semifinals (Winners Final)
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'winners', tag_em_bag_em_id, bag_assassins_id, 1, 2, bag_assassins_id, tag_em_bag_em_id, 3, 'completed', '2025-03-15 13:00:00+00');
    
    -- Losers Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'losers', on_a_mission_id, tom_tom_id, 0, 2, tom_tom_id, on_a_mission_id, 3, 'completed', '2025-03-15 13:30:00+00'),
    (gen_random_uuid(), bracket_id, 1, 2, 'losers', buttery_nipples_id, undigestibles_id, 0, 2, undigestibles_id, buttery_nipples_id, 3, 'completed', '2025-03-15 14:00:00+00');
    
    -- Losers Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'losers', happy_valley_id, tom_tom_id, 2, 0, happy_valley_id, tom_tom_id, 3, 'completed', '2025-03-15 14:30:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'losers', zoo_pals_id, undigestibles_id, 2, 0, zoo_pals_id, undigestibles_id, 3, 'completed', '2025-03-15 15:00:00+00');
    
    -- Losers Bracket Round 3
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'losers', happy_valley_id, zoo_pals_id, 0, 2, zoo_pals_id, happy_valley_id, 3, 'completed', '2025-03-15 15:30:00+00');
    
    -- Losers Bracket Round 4
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 4, 1, 'losers', tag_em_bag_em_id, zoo_pals_id, 0, 2, zoo_pals_id, tag_em_bag_em_id, 3, 'completed', '2025-03-15 16:00:00+00');
    
    -- Grand Finals
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'finals', bag_assassins_id, zoo_pals_id, 1, 2, zoo_pals_id, bag_assassins_id, 3, 'completed', '2025-03-15 16:30:00+00'),
    (gen_random_uuid(), bracket_id, 1, 2, 'finals', zoo_pals_id, bag_assassins_id, 1, 2, bag_assassins_id, zoo_pals_id, 3, 'completed', '2025-03-15 17:00:00+00');
    
    RAISE NOTICE 'Successfully created INT1 Spring 2025 Playoffs bracket with % matches', 16;
END $$;