-- Create Summer 2 (INT2) Playoffs bracket and matches
-- First create the bracket
INSERT INTO brackets (title, format, state, division_id) 
VALUES ('Summer 2 (INT2) Playoffs', 'Double Elimination', 'completed', '5ac90b5c-a752-43a6-8e6f-30724dce7d97');

-- Get the bracket ID for reference
DO $$
DECLARE
    bracket_id UUID;
BEGIN
    SELECT id INTO bracket_id FROM brackets WHERE title = 'Summer 2 (INT2) Playoffs';

    -- Winners Bracket Round 1
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status) VALUES
    (bracket_id, 1, 1, 'winners', '90985bbb-8cec-4d66-9d70-a6577ec75afc', 'aaa86740-56e6-4482-b589-2a292f69692e', 0, 2, 'aaa86740-56e6-4482-b589-2a292f69692e', '90985bbb-8cec-4d66-9d70-a6577ec75afc', 'completed'), -- Massive Sacks vs Tom & Tom
    (bracket_id, 1, 2, 'winners', 'c08fd547-4938-48dc-9b9d-dca99f7a1f09', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 0, 2, '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 'c08fd547-4938-48dc-9b9d-dca99f7a1f09', 'completed'), -- Undigestibles vs Buttery Nips
    (bracket_id, 1, 3, 'winners', 'abd71084-cf3f-431e-a57a-428cbe96b459', '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', 2, 1, 'abd71084-cf3f-431e-a57a-428cbe96b459', '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', 'completed'), -- Toss D.Bag vs Triple Dippers
    (bracket_id, 1, 4, 'winners', '00def929-de16-4f59-933f-ae0247b04358', '56387477-8ba1-43b7-a307-414926ca5f79', 0, 2, '56387477-8ba1-43b7-a307-414926ca5f79', '00def929-de16-4f59-933f-ae0247b04358', 'completed'); -- On a Mission vs Zoo Pals

    -- Winners Bracket Round 2
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status) VALUES
    (bracket_id, 2, 1, 'winners', 'aaa86740-56e6-4482-b589-2a292f69692e', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 2, 0, 'aaa86740-56e6-4482-b589-2a292f69692e', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 'completed'), -- Tom & Tom vs Buttery Nips
    (bracket_id, 2, 2, 'winners', 'abd71084-cf3f-431e-a57a-428cbe96b459', '56387477-8ba1-43b7-a307-414926ca5f79', 0, 2, '56387477-8ba1-43b7-a307-414926ca5f79', 'abd71084-cf3f-431e-a57a-428cbe96b459', 'completed'); -- Toss D.Bag vs Zoo Pals

    -- Winners Bracket Round 3 (Winners Final)
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status) VALUES
    (bracket_id, 3, 1, 'winners', 'aaa86740-56e6-4482-b589-2a292f69692e', '56387477-8ba1-43b7-a307-414926ca5f79', 2, 0, 'aaa86740-56e6-4482-b589-2a292f69692e', '56387477-8ba1-43b7-a307-414926ca5f79', 'completed'); -- Tom & Tom vs Zoo Pals

    -- Losers Bracket Round 1
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status) VALUES
    (bracket_id, 1, 1, 'losers', '90985bbb-8cec-4d66-9d70-a6577ec75afc', 'c08fd547-4938-48dc-9b9d-dca99f7a1f09', 2, 1, '90985bbb-8cec-4d66-9d70-a6577ec75afc', 'c08fd547-4938-48dc-9b9d-dca99f7a1f09', 'completed'), -- Massive Sacks vs Undigestibles
    (bracket_id, 1, 2, 'losers', '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', '00def929-de16-4f59-933f-ae0247b04358', 0, 2, '00def929-de16-4f59-933f-ae0247b04358', '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', 'completed'); -- Triple Dippers vs On a Mission

    -- Losers Bracket Round 2
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status) VALUES
    (bracket_id, 2, 1, 'losers', 'abd71084-cf3f-431e-a57a-428cbe96b459', '90985bbb-8cec-4d66-9d70-a6577ec75afc', 2, 0, 'abd71084-cf3f-431e-a57a-428cbe96b459', '90985bbb-8cec-4d66-9d70-a6577ec75afc', 'completed'), -- Toss D.Bag vs Massive Sacks
    (bracket_id, 2, 2, 'losers', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', '00def929-de16-4f59-933f-ae0247b04358', 2, 0, '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', '00def929-de16-4f59-933f-ae0247b04358', 'completed'); -- Buttery Nips vs On a Mission

    -- Losers Bracket Round 3
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status) VALUES
    (bracket_id, 3, 1, 'losers', 'abd71084-cf3f-431e-a57a-428cbe96b459', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 2, 0, 'abd71084-cf3f-431e-a57a-428cbe96b459', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 'completed'); -- Toss D.Bag vs Buttery Nips

    -- Losers Bracket Round 4
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status) VALUES
    (bracket_id, 4, 1, 'losers', '56387477-8ba1-43b7-a307-414926ca5f79', 'abd71084-cf3f-431e-a57a-428cbe96b459', 2, 1, '56387477-8ba1-43b7-a307-414926ca5f79', 'abd71084-cf3f-431e-a57a-428cbe96b459', 'completed'); -- Zoo Pals vs Toss D.Bag

    -- Finals
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status) VALUES
    (bracket_id, 1, 1, 'finals', 'aaa86740-56e6-4482-b589-2a292f69692e', '56387477-8ba1-43b7-a307-414926ca5f79', 0, 2, '56387477-8ba1-43b7-a307-414926ca5f79', 'aaa86740-56e6-4482-b589-2a292f69692e', 'completed'), -- Grand Finals Match 1
    (bracket_id, 2, 1, 'finals', 'aaa86740-56e6-4482-b589-2a292f69692e', '56387477-8ba1-43b7-a307-414926ca5f79', 0, 2, '56387477-8ba1-43b7-a307-414926ca5f79', 'aaa86740-56e6-4482-b589-2a292f69692e', 'completed'); -- Grand Finals Match 2 (Zoo Pals Champion)

END $$;