-- COMP Spring 2025 Playoffs Backfill
-- Create the bracket for COMP division playoffs

DO $$
DECLARE
    comp_division_id uuid := 'f61c1c34-fae5-4323-be27-6ccb2d253a8a';
    bracket_id uuid;
    
    -- Team IDs from database
    cuzzos_clinic_id uuid := 'ad4ec289-fd85-4322-8ebb-68647607de23';
    hole_burners_id uuid := 'a8822ac7-598c-4ac3-86b9-05bf7e1ee7e1';
    jager_bombers_id uuid := 'b214167b-7f7e-4470-a811-bf2a093c9620';
    seize_the_maize_id uuid := '8c5adea2-09b7-4298-83dc-295dae74fdb8';
    hole_violators_id uuid := 'f243ccec-9f41-4899-8170-d98812373012';
    three_amigos_id uuid := '9ee2b996-99f6-446c-be20-8255ca75d8c8';
    baggin_braggin_id uuid := 'fcb5fb21-a8f4-4dbd-a04d-7688832ada8c';
    shut_your_cornhole_id uuid := '5db6b718-81af-4bd0-a0cd-0a0eae4330ad';
    
BEGIN
    -- Create bracket
    INSERT INTO brackets (title, division_id, format, state, created_at)
    VALUES ('COMP Spring 2025 Playoffs', comp_division_id, 'Double Elimination', 'completed', '2025-03-15 10:00:00+00')
    RETURNING id INTO bracket_id;
    
    -- Winners Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'winners', cuzzos_clinic_id, hole_burners_id, 2, 0, cuzzos_clinic_id, hole_burners_id, 3, 'completed', '2025-03-15 10:00:00+00'),
    (gen_random_uuid(), bracket_id, 1, 2, 'winners', jager_bombers_id, seize_the_maize_id, 0, 2, seize_the_maize_id, jager_bombers_id, 3, 'completed', '2025-03-15 10:30:00+00'),
    (gen_random_uuid(), bracket_id, 1, 3, 'winners', hole_violators_id, three_amigos_id, 0, 2, three_amigos_id, hole_violators_id, 3, 'completed', '2025-03-15 11:00:00+00'),
    (gen_random_uuid(), bracket_id, 1, 4, 'winners', baggin_braggin_id, shut_your_cornhole_id, 2, 0, baggin_braggin_id, shut_your_cornhole_id, 3, 'completed', '2025-03-15 11:30:00+00');
    
    -- Winners Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'winners', cuzzos_clinic_id, seize_the_maize_id, 2, 0, cuzzos_clinic_id, seize_the_maize_id, 3, 'completed', '2025-03-15 12:00:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'winners', three_amigos_id, baggin_braggin_id, 2, 1, three_amigos_id, baggin_braggin_id, 3, 'completed', '2025-03-15 12:30:00+00');
    
    -- Winners Bracket Semifinals (Winners Final)
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'winners', cuzzos_clinic_id, three_amigos_id, 2, 1, cuzzos_clinic_id, three_amigos_id, 3, 'completed', '2025-03-15 13:00:00+00');
    
    -- Losers Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'losers', hole_burners_id, jager_bombers_id, 0, 2, jager_bombers_id, hole_burners_id, 3, 'completed', '2025-03-15 13:30:00+00'),
    (gen_random_uuid(), bracket_id, 1, 2, 'losers', seize_the_maize_id, hole_violators_id, 0, 2, hole_violators_id, seize_the_maize_id, 3, 'completed', '2025-03-15 14:00:00+00');
    
    -- Losers Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'losers', baggin_braggin_id, jager_bombers_id, 0, 2, jager_bombers_id, baggin_braggin_id, 3, 'completed', '2025-03-15 14:30:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'losers', seize_the_maize_id, hole_violators_id, 0, 2, hole_violators_id, seize_the_maize_id, 3, 'completed', '2025-03-15 15:00:00+00');
    
    -- Losers Bracket Round 3
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'losers', jager_bombers_id, hole_violators_id, 1, 2, hole_violators_id, jager_bombers_id, 3, 'completed', '2025-03-15 15:30:00+00');
    
    -- Losers Bracket Round 4
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 4, 1, 'losers', three_amigos_id, hole_violators_id, 2, 0, three_amigos_id, hole_violators_id, 3, 'completed', '2025-03-15 16:00:00+00');
    
    -- Grand Finals
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'finals', cuzzos_clinic_id, three_amigos_id, 2, 0, cuzzos_clinic_id, three_amigos_id, 3, 'completed', '2025-03-15 16:30:00+00');
    
    RAISE NOTICE 'Successfully created COMP Spring 2025 Playoffs bracket with all matches';
END $$;