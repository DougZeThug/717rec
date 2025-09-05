-- Summer 1 (INT2) Playoffs Backfill
-- Create the bracket for Intermediate division playoffs

DO $$
DECLARE
    int2_division_id uuid := '5ac90b5c-a752-43a6-8e6f-30724dce7d97'; -- Intermediate division
    bracket_id uuid;
    
    -- Team IDs from database
    on_a_mission_id uuid := '00def929-de16-4f59-933f-ae0247b04358';
    toss_d_bag_id uuid := 'abd71084-cf3f-431e-a57a-428cbe96b459';
    zoo_pals_id uuid := '56387477-8ba1-43b7-a307-414926ca5f79';
    triple_dippers_id uuid := '31e0e752-e0fc-4bd1-892f-3b7123ad72b7';
    massive_sacks_id uuid := '90985bbb-8cec-4d66-9d70-a6577ec75afc';
    undigestibles_id uuid := 'c08fd547-4938-48dc-9b9d-dca99f7a1f09';
    buttery_nips_id uuid := '01ec006b-6ee3-47b3-ac8d-f93cc11d3460';
    miracle_at_marion_id uuid := '2ab2e684-8c28-45c3-801a-ea215433a8e4';
    
BEGIN
    -- Create bracket
    INSERT INTO brackets (title, division_id, format, state, created_at)
    VALUES ('Summer 1 (INT2) Playoffs', int2_division_id, 'Double Elimination', 'completed', '2025-06-15 10:00:00+00')
    RETURNING id INTO bracket_id;
    
    -- Winners Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'winners', on_a_mission_id, toss_d_bag_id, 2, 0, on_a_mission_id, toss_d_bag_id, 3, 'completed', '2025-06-15 10:00:00+00'),
    (gen_random_uuid(), bracket_id, 1, 2, 'winners', zoo_pals_id, triple_dippers_id, 2, 0, zoo_pals_id, triple_dippers_id, 3, 'completed', '2025-06-15 10:30:00+00'),
    (gen_random_uuid(), bracket_id, 1, 3, 'winners', massive_sacks_id, undigestibles_id, 2, 0, massive_sacks_id, undigestibles_id, 3, 'completed', '2025-06-15 11:00:00+00'),
    (gen_random_uuid(), bracket_id, 1, 4, 'winners', buttery_nips_id, miracle_at_marion_id, 0, 2, miracle_at_marion_id, buttery_nips_id, 3, 'completed', '2025-06-15 11:30:00+00');
    
    -- Winners Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'winners', on_a_mission_id, zoo_pals_id, 1, 2, zoo_pals_id, on_a_mission_id, 3, 'completed', '2025-06-15 12:00:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'winners', massive_sacks_id, miracle_at_marion_id, 0, 2, miracle_at_marion_id, massive_sacks_id, 3, 'completed', '2025-06-15 12:30:00+00');
    
    -- Winners Bracket Semifinals (Winners Final)
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'winners', zoo_pals_id, miracle_at_marion_id, 0, 2, miracle_at_marion_id, zoo_pals_id, 3, 'completed', '2025-06-15 13:00:00+00');
    
    -- Losers Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'losers', toss_d_bag_id, triple_dippers_id, 0, 2, triple_dippers_id, toss_d_bag_id, 3, 'completed', '2025-06-15 13:30:00+00'),
    (gen_random_uuid(), bracket_id, 1, 2, 'losers', undigestibles_id, buttery_nips_id, 1, 2, buttery_nips_id, undigestibles_id, 3, 'completed', '2025-06-15 14:00:00+00');
    
    -- Losers Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'losers', massive_sacks_id, triple_dippers_id, 2, 0, massive_sacks_id, triple_dippers_id, 3, 'completed', '2025-06-15 14:30:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'losers', on_a_mission_id, buttery_nips_id, 0, 2, buttery_nips_id, on_a_mission_id, 3, 'completed', '2025-06-15 15:00:00+00');
    
    -- Losers Bracket Round 3
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'losers', massive_sacks_id, buttery_nips_id, 2, 0, massive_sacks_id, buttery_nips_id, 3, 'completed', '2025-06-15 15:30:00+00');
    
    -- Losers Bracket Round 4
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 4, 1, 'losers', zoo_pals_id, massive_sacks_id, 2, 0, zoo_pals_id, massive_sacks_id, 3, 'completed', '2025-06-15 16:00:00+00');
    
    -- Grand Finals
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'finals', zoo_pals_id, miracle_at_marion_id, 0, 2, miracle_at_marion_id, zoo_pals_id, 3, 'completed', '2025-06-15 16:30:00+00');
    
    RAISE NOTICE 'Successfully created Summer 1 (INT2) Playoffs bracket with all matches';
END $$;