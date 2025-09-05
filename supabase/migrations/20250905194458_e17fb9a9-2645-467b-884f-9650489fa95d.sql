-- INT2 Spring 2025 Playoffs Backfill
-- Create the bracket for INT2 division playoffs

DO $$
DECLARE
    int2_division_id uuid := '03614803-b9c0-4eab-8fc7-6a844cc5f4ee';
    bracket_id uuid;
    
    -- Team IDs from database
    came_from_dicks_id uuid := 'af3bf12d-b671-4458-9d3c-5c2e29e362ac';
    wrong_hole_id uuid := '0c7261b9-db22-48d1-8487-ba9eeb90fbef';
    pepperoni_cheesers_id uuid := 'c9d644a4-4e5a-43a0-9805-9d93299cda35';
    massive_sacks_id uuid := '90985bbb-8cec-4d66-9d70-a6577ec75afc';
    corn_2_be_wild_id uuid := '37bf909c-3bcf-45fc-860e-9f64b7b03cbe';
    sweat_bandits_id uuid := '4ce38a7a-df7b-4d71-a17c-b8be65e342fe';
    mailmen_id uuid := '410f4fd2-a730-48e1-a773-30db1478d208';
    
BEGIN
    -- Create bracket
    INSERT INTO brackets (title, division_id, format, state, created_at)
    VALUES ('INT2 Spring 2025 Playoffs', int2_division_id, 'Double Elimination', 'completed', '2025-03-15 10:00:00+00')
    RETURNING id INTO bracket_id;
    
    -- Winners Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'winners', came_from_dicks_id, wrong_hole_id, 2, 0, came_from_dicks_id, wrong_hole_id, 3, 'completed', '2025-03-15 10:00:00+00'),
    (gen_random_uuid(), bracket_id, 1, 2, 'winners', pepperoni_cheesers_id, massive_sacks_id, 2, 0, pepperoni_cheesers_id, massive_sacks_id, 3, 'completed', '2025-03-15 10:30:00+00'),
    (gen_random_uuid(), bracket_id, 1, 3, 'winners', corn_2_be_wild_id, sweat_bandits_id, 1, 2, sweat_bandits_id, corn_2_be_wild_id, 3, 'completed', '2025-03-15 11:00:00+00');
    
    -- Winners Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'winners', mailmen_id, came_from_dicks_id, 0, 2, came_from_dicks_id, mailmen_id, 3, 'completed', '2025-03-15 12:00:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'winners', pepperoni_cheesers_id, sweat_bandits_id, 1, 2, sweat_bandits_id, pepperoni_cheesers_id, 3, 'completed', '2025-03-15 12:30:00+00');
    
    -- Winners Bracket Semifinals (Winners Final)
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'winners', came_from_dicks_id, sweat_bandits_id, 2, 0, came_from_dicks_id, sweat_bandits_id, 3, 'completed', '2025-03-15 13:00:00+00');
    
    -- Losers Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'losers', massive_sacks_id, corn_2_be_wild_id, 0, 2, corn_2_be_wild_id, massive_sacks_id, 3, 'completed', '2025-03-15 13:30:00+00');
    
    -- Losers Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'losers', pepperoni_cheesers_id, wrong_hole_id, 2, 1, pepperoni_cheesers_id, wrong_hole_id, 3, 'completed', '2025-03-15 14:00:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'losers', mailmen_id, corn_2_be_wild_id, 2, 1, mailmen_id, corn_2_be_wild_id, 3, 'completed', '2025-03-15 14:30:00+00');
    
    -- Losers Bracket Round 3
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'losers', pepperoni_cheesers_id, mailmen_id, 1, 2, mailmen_id, pepperoni_cheesers_id, 3, 'completed', '2025-03-15 15:00:00+00');
    
    -- Losers Bracket Round 4
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 4, 1, 'losers', sweat_bandits_id, mailmen_id, 2, 0, sweat_bandits_id, mailmen_id, 3, 'completed', '2025-03-15 16:00:00+00');
    
    -- Grand Finals
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'finals', sweat_bandits_id, came_from_dicks_id, 0, 2, came_from_dicks_id, sweat_bandits_id, 3, 'completed', '2025-03-15 16:30:00+00');
    
    RAISE NOTICE 'Successfully created INT2 Spring 2025 Playoffs bracket with all matches';
END $$;