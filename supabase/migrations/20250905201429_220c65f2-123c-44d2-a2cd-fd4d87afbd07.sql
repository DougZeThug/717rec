-- Summer 1 (INT1) Playoffs Backfill
-- Create the bracket for Intermediate High division playoffs

DO $$
DECLARE
    int1_division_id uuid := '03614803-b9c0-4eab-8fc7-6a844cc5f4ee'; -- Intermediate High division
    bracket_id uuid;
    
    -- Team IDs from database
    mailmen_id uuid := '410f4fd2-a730-48e1-a773-30db1478d208';
    wrong_hole_id uuid := '0c7261b9-db22-48d1-8487-ba9eeb90fbef';
    tag_em_bag_em_id uuid := '8aef742f-f7d7-4996-a2bb-96a430b5e005';
    bag_assassins_id uuid := '21f5f389-1ad4-4dc5-a828-0e2972c13845';
    pepperoni_cheesers_id uuid := 'c9d644a4-4e5a-43a0-9805-9d93299cda35';
    tom_tom_id uuid := 'aaa86740-56e6-4482-b589-2a292f69692e';
    happy_valley_id uuid := 'a484a124-89f8-468d-9ebb-2709ad47c7f5';
    sweat_bandits_id uuid := '4ce38a7a-df7b-4d71-a17c-b8be65e342fe';
    
BEGIN
    -- Create bracket
    INSERT INTO brackets (title, division_id, format, state, created_at)
    VALUES ('Summer 1 (INT1) Playoffs', int1_division_id, 'Double Elimination', 'completed', '2025-06-15 10:00:00+00')
    RETURNING id INTO bracket_id;
    
    -- Winners Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'winners', mailmen_id, wrong_hole_id, 2, 0, mailmen_id, wrong_hole_id, 3, 'completed', '2025-06-15 10:00:00+00'),
    (gen_random_uuid(), bracket_id, 1, 2, 'winners', tag_em_bag_em_id, bag_assassins_id, 2, 1, tag_em_bag_em_id, bag_assassins_id, 3, 'completed', '2025-06-15 10:30:00+00'),
    (gen_random_uuid(), bracket_id, 1, 3, 'winners', pepperoni_cheesers_id, tom_tom_id, 2, 0, pepperoni_cheesers_id, tom_tom_id, 3, 'completed', '2025-06-15 11:00:00+00'),
    (gen_random_uuid(), bracket_id, 1, 4, 'winners', happy_valley_id, sweat_bandits_id, 0, 2, sweat_bandits_id, happy_valley_id, 3, 'completed', '2025-06-15 11:30:00+00');
    
    -- Winners Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'winners', mailmen_id, tag_em_bag_em_id, 2, 1, mailmen_id, tag_em_bag_em_id, 3, 'completed', '2025-06-15 12:00:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'winners', pepperoni_cheesers_id, sweat_bandits_id, 2, 0, pepperoni_cheesers_id, sweat_bandits_id, 3, 'completed', '2025-06-15 12:30:00+00');
    
    -- Winners Bracket Semifinals (Winners Final)
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'winners', mailmen_id, pepperoni_cheesers_id, 0, 2, pepperoni_cheesers_id, mailmen_id, 3, 'completed', '2025-06-15 13:00:00+00');
    
    -- Losers Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'losers', wrong_hole_id, bag_assassins_id, 0, 2, bag_assassins_id, wrong_hole_id, 3, 'completed', '2025-06-15 13:30:00+00'),
    (gen_random_uuid(), bracket_id, 1, 2, 'losers', tom_tom_id, happy_valley_id, 0, 2, happy_valley_id, tom_tom_id, 3, 'completed', '2025-06-15 14:00:00+00');
    
    -- Losers Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'losers', sweat_bandits_id, bag_assassins_id, 0, 2, bag_assassins_id, sweat_bandits_id, 3, 'completed', '2025-06-15 14:30:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'losers', tag_em_bag_em_id, happy_valley_id, 0, 2, happy_valley_id, tag_em_bag_em_id, 3, 'completed', '2025-06-15 15:00:00+00');
    
    -- Losers Bracket Round 3
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'losers', bag_assassins_id, happy_valley_id, 2, 0, bag_assassins_id, happy_valley_id, 3, 'completed', '2025-06-15 15:30:00+00');
    
    -- Losers Bracket Round 4
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 4, 1, 'losers', mailmen_id, bag_assassins_id, 2, 0, mailmen_id, bag_assassins_id, 3, 'completed', '2025-06-15 16:00:00+00');
    
    -- Grand Finals
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'finals', pepperoni_cheesers_id, mailmen_id, 2, 1, pepperoni_cheesers_id, mailmen_id, 3, 'completed', '2025-06-15 16:30:00+00');
    
    RAISE NOTICE 'Successfully created Summer 1 (INT1) Playoffs bracket with all matches';
END $$;