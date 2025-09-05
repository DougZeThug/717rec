-- Summer 1 (COMP) Playoffs Backfill
-- Create the bracket for Competitive division playoffs

DO $$
DECLARE
    comp_division_id uuid := 'f61c1c34-fae5-4323-be27-6ccb2d253a8a'; -- Competitive division
    bracket_id uuid;
    
    -- Team IDs from database
    bag_babies_id uuid := '626be920-071d-4aea-a1f5-1819893215ca';
    jager_bombers_id uuid := 'b214167b-7f7e-4470-a811-bf2a093c9620';
    seize_the_maize_id uuid := '8c5adea2-09b7-4298-83dc-295dae74fdb8';
    shut_your_cornhole_id uuid := '5db6b718-81af-4bd0-a0cd-0a0eae4330ad';
    birds_of_prey_id uuid := '831c8441-2b8b-4512-8f09-9701062a6648';
    hole_violators_id uuid := 'f243ccec-9f41-4899-8170-d98812373012';
    came_from_dicks_id uuid := 'af3bf12d-b671-4458-9d3c-5c2e29e362ac';
    hole_burners_id uuid := 'a8822ac7-598c-4ac3-86b9-05bf7e1ee7e1';
    three_amigos_id uuid := '9ee2b996-99f6-446c-be20-8255ca75d8c8';
    cuzzos_clinic_id uuid := 'ad4ec289-fd85-4322-8ebb-68647607de23';
    baggin_braggin_id uuid := 'fcb5fb21-a8f4-4dbd-a04d-7688832ada8c';
    
BEGIN
    -- Create bracket
    INSERT INTO brackets (title, division_id, format, state, created_at)
    VALUES ('Summer 1 (COMP) Playoffs', comp_division_id, 'Double Elimination', 'completed', '2025-06-15 10:00:00+00')
    RETURNING id INTO bracket_id;
    
    -- Winners Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'winners', bag_babies_id, jager_bombers_id, 0, 2, jager_bombers_id, bag_babies_id, 3, 'completed', '2025-06-15 10:00:00+00'),
    (gen_random_uuid(), bracket_id, 1, 2, 'winners', seize_the_maize_id, shut_your_cornhole_id, 2, 0, seize_the_maize_id, shut_your_cornhole_id, 3, 'completed', '2025-06-15 10:30:00+00'),
    (gen_random_uuid(), bracket_id, 1, 3, 'winners', birds_of_prey_id, hole_violators_id, 2, 0, birds_of_prey_id, hole_violators_id, 3, 'completed', '2025-06-15 11:00:00+00'),
    (gen_random_uuid(), bracket_id, 1, 4, 'winners', came_from_dicks_id, hole_burners_id, 0, 2, hole_burners_id, came_from_dicks_id, 3, 'completed', '2025-06-15 11:30:00+00');
    
    -- Winners Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'winners', three_amigos_id, jager_bombers_id, 0, 2, jager_bombers_id, three_amigos_id, 3, 'completed', '2025-06-15 12:00:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'winners', seize_the_maize_id, shut_your_cornhole_id, 2, 0, seize_the_maize_id, shut_your_cornhole_id, 3, 'completed', '2025-06-15 12:30:00+00'),
    (gen_random_uuid(), bracket_id, 2, 3, 'winners', cuzzos_clinic_id, birds_of_prey_id, 2, 0, cuzzos_clinic_id, birds_of_prey_id, 3, 'completed', '2025-06-15 13:00:00+00'),
    (gen_random_uuid(), bracket_id, 2, 4, 'winners', baggin_braggin_id, hole_burners_id, 0, 2, hole_burners_id, baggin_braggin_id, 3, 'completed', '2025-06-15 13:30:00+00');
    
    -- Winners Bracket Round 3
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'winners', jager_bombers_id, seize_the_maize_id, 0, 2, seize_the_maize_id, jager_bombers_id, 3, 'completed', '2025-06-15 14:00:00+00'),
    (gen_random_uuid(), bracket_id, 3, 2, 'winners', cuzzos_clinic_id, hole_burners_id, 2, 1, cuzzos_clinic_id, hole_burners_id, 3, 'completed', '2025-06-15 14:30:00+00');
    
    -- Winners Bracket Semifinals (Winners Final)
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 4, 1, 'winners', seize_the_maize_id, cuzzos_clinic_id, 0, 2, cuzzos_clinic_id, seize_the_maize_id, 3, 'completed', '2025-06-15 15:00:00+00');
    
    -- Losers Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'losers', baggin_braggin_id, bag_babies_id, 2, 1, baggin_braggin_id, bag_babies_id, 3, 'completed', '2025-06-15 15:30:00+00'),
    (gen_random_uuid(), bracket_id, 1, 2, 'losers', shut_your_cornhole_id, hole_violators_id, 1, 2, hole_violators_id, shut_your_cornhole_id, 3, 'completed', '2025-06-15 16:00:00+00'),
    (gen_random_uuid(), bracket_id, 1, 3, 'losers', three_amigos_id, came_from_dicks_id, 2, 0, three_amigos_id, came_from_dicks_id, 3, 'completed', '2025-06-15 16:30:00+00');
    
    -- Losers Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'losers', birds_of_prey_id, baggin_braggin_id, 2, 0, birds_of_prey_id, baggin_braggin_id, 3, 'completed', '2025-06-15 17:00:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'losers', hole_violators_id, three_amigos_id, 2, 1, hole_violators_id, three_amigos_id, 3, 'completed', '2025-06-15 17:30:00+00');
    
    -- Losers Bracket Round 3
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'losers', jager_bombers_id, birds_of_prey_id, 2, 0, jager_bombers_id, birds_of_prey_id, 3, 'completed', '2025-06-15 18:00:00+00'),
    (gen_random_uuid(), bracket_id, 3, 2, 'losers', hole_burners_id, hole_violators_id, 1, 2, hole_violators_id, hole_burners_id, 3, 'completed', '2025-06-15 18:30:00+00');
    
    -- Losers Bracket Round 4
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 4, 1, 'losers', jager_bombers_id, hole_violators_id, 0, 2, hole_violators_id, jager_bombers_id, 3, 'completed', '2025-06-15 19:00:00+00');
    
    -- Losers Bracket Round 5
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 5, 1, 'losers', seize_the_maize_id, hole_violators_id, 2, 1, seize_the_maize_id, hole_violators_id, 3, 'completed', '2025-06-15 19:30:00+00');
    
    -- Grand Finals
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'finals', cuzzos_clinic_id, seize_the_maize_id, 2, 0, cuzzos_clinic_id, seize_the_maize_id, 3, 'completed', '2025-06-15 20:00:00+00');
    
    RAISE NOTICE 'Successfully created Summer 1 (COMP) Playoffs bracket with all matches';
END $$;