-- Summer 1 (REC) Playoffs Backfill
-- Create the bracket for Recreational division playoffs

DO $$
DECLARE
    rec_division_id uuid := 'c297a811-5dbe-4695-8aef-4c99b6972a46'; -- Recreational division
    bracket_id uuid;
    
    -- Team IDs from database
    red_roof_rockets_id uuid := 'e91cb2d1-ef48-48e7-b15f-735c941f3679';
    jerm_id uuid := 'aa967a4d-b9a8-496e-81e9-7993ac005763';
    here_for_fireball_id uuid := 'c577e0f9-6700-4220-a902-b368ca915bbd';
    killa_queens_id uuid := 'eb7976c7-fc7f-40e9-926d-d8bd1754003d';
    the_wheezys_id uuid := '45d05ced-1a8c-46a1-bfdc-5e77c6702bf7';
    corn_kitties_id uuid := 'ea3b15e7-8bc7-467c-85fc-7f91e89742a1';
    t_baggers_id uuid := '34b73bf9-d170-4fee-ab68-e506db5cbe05';
    great_cornholios_id uuid := 'a1206ecf-a3b9-4e3f-8bc9-a43d348589bd';
    sour_patch_kids_id uuid := 'de3cb5fe-7c5f-4211-8876-a52140df49b7';
    
BEGIN
    -- Create bracket
    INSERT INTO brackets (title, division_id, format, state, created_at)
    VALUES ('Summer 1 (REC) Playoffs', rec_division_id, 'Double Elimination', 'completed', '2025-06-15 10:00:00+00')
    RETURNING id INTO bracket_id;
    
    -- Winners Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'winners', red_roof_rockets_id, jerm_id, 0, 2, jerm_id, red_roof_rockets_id, 3, 'completed', '2025-06-15 10:00:00+00');
    
    -- Winners Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'winners', here_for_fireball_id, jerm_id, 2, 0, here_for_fireball_id, jerm_id, 3, 'completed', '2025-06-15 11:00:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'winners', killa_queens_id, the_wheezys_id, 2, 1, killa_queens_id, the_wheezys_id, 3, 'completed', '2025-06-15 11:30:00+00'),
    (gen_random_uuid(), bracket_id, 2, 3, 'winners', corn_kitties_id, t_baggers_id, 0, 2, t_baggers_id, corn_kitties_id, 3, 'completed', '2025-06-15 12:00:00+00'),
    (gen_random_uuid(), bracket_id, 2, 4, 'winners', great_cornholios_id, sour_patch_kids_id, 0, 2, sour_patch_kids_id, great_cornholios_id, 3, 'completed', '2025-06-15 12:30:00+00');
    
    -- Winners Bracket Round 3
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'winners', here_for_fireball_id, killa_queens_id, 2, 0, here_for_fireball_id, killa_queens_id, 3, 'completed', '2025-06-15 13:00:00+00'),
    (gen_random_uuid(), bracket_id, 3, 2, 'winners', t_baggers_id, sour_patch_kids_id, 1, 2, sour_patch_kids_id, t_baggers_id, 3, 'completed', '2025-06-15 13:30:00+00');
    
    -- Winners Bracket Semifinals (Winners Final)
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 4, 1, 'winners', here_for_fireball_id, sour_patch_kids_id, 2, 0, here_for_fireball_id, sour_patch_kids_id, 3, 'completed', '2025-06-15 14:00:00+00');
    
    -- Losers Bracket Round 1
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'losers', great_cornholios_id, red_roof_rockets_id, 0, 2, red_roof_rockets_id, great_cornholios_id, 3, 'completed', '2025-06-15 14:30:00+00');
    
    -- Losers Bracket Round 2
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 2, 1, 'losers', corn_kitties_id, red_roof_rockets_id, 2, 1, corn_kitties_id, red_roof_rockets_id, 3, 'completed', '2025-06-15 15:00:00+00'),
    (gen_random_uuid(), bracket_id, 2, 2, 'losers', the_wheezys_id, jerm_id, 2, 0, the_wheezys_id, jerm_id, 3, 'completed', '2025-06-15 15:30:00+00');
    
    -- Losers Bracket Round 3
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 3, 1, 'losers', killa_queens_id, corn_kitties_id, 2, 0, killa_queens_id, corn_kitties_id, 3, 'completed', '2025-06-15 16:00:00+00'),
    (gen_random_uuid(), bracket_id, 3, 2, 'losers', t_baggers_id, the_wheezys_id, 0, 2, the_wheezys_id, t_baggers_id, 3, 'completed', '2025-06-15 16:30:00+00');
    
    -- Losers Bracket Round 4
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 4, 1, 'losers', killa_queens_id, the_wheezys_id, 1, 2, the_wheezys_id, killa_queens_id, 3, 'completed', '2025-06-15 17:00:00+00');
    
    -- Losers Bracket Round 5
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 5, 1, 'losers', sour_patch_kids_id, the_wheezys_id, 0, 2, the_wheezys_id, sour_patch_kids_id, 3, 'completed', '2025-06-15 17:30:00+00');
    
    -- Grand Finals
    INSERT INTO playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, created_at) VALUES
    (gen_random_uuid(), bracket_id, 1, 1, 'finals', here_for_fireball_id, the_wheezys_id, 2, 1, here_for_fireball_id, the_wheezys_id, 3, 'completed', '2025-06-15 18:00:00+00');
    
    RAISE NOTICE 'Successfully created Summer 1 (REC) Playoffs bracket with all matches';
END $$;