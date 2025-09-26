-- Create Summer 2 (COMP) Playoffs bracket with correct team names

-- First, create the bracket
INSERT INTO brackets (id, title, format, state, division_id, created_at)
VALUES (
  gen_random_uuid(),
  'Summer 2 (COMP) Playoffs',
  'Double Elimination',
  'completed',
  (SELECT id FROM divisions WHERE name = 'Competitive' LIMIT 1),
  '2025-07-15 10:00:00+00'
);

-- Get the bracket ID for reference
DO $$
DECLARE
    bracket_uuid uuid;
    summer2_season_id uuid;
    -- Team IDs with correct names
    bag_babies_id uuid;
    seize_maize_id uuid;
    hole_burners_id uuid;
    came_dicks_id uuid;
    jager_bombers_id uuid;
    shut_cornhole_id uuid;
    hole_violators_id uuid;
    pepperoni_cheesers_id uuid;
    cuzzos_clinic_id uuid;
    three_amigos_id uuid;
BEGIN
    -- Get bracket and season IDs
    SELECT id INTO bracket_uuid FROM brackets WHERE title = 'Summer 2 (COMP) Playoffs';
    SELECT id INTO summer2_season_id FROM seasons WHERE name = 'Summer 2 2025';
    
    -- Get team IDs with exact names
    SELECT id INTO bag_babies_id FROM teams WHERE name = 'Bag Babies ';
    SELECT id INTO seize_maize_id FROM teams WHERE name = 'Seize the Maize';
    SELECT id INTO hole_burners_id FROM teams WHERE name = 'Hole Burners';
    SELECT id INTO came_dicks_id FROM teams WHERE name = 'Came from Dicks';
    SELECT id INTO jager_bombers_id FROM teams WHERE name = 'Jager Bombers';
    SELECT id INTO shut_cornhole_id FROM teams WHERE name = 'Shut Your Cornhole';
    SELECT id INTO hole_violators_id FROM teams WHERE name = 'Hole Violators';
    SELECT id INTO pepperoni_cheesers_id FROM teams WHERE name = 'Pepperoni Cheesers';
    SELECT id INTO cuzzos_clinic_id FROM teams WHERE name = 'Cuzzo''s Clinic';
    SELECT id INTO three_amigos_id FROM teams WHERE name = '3 Amigos';

    -- Create Winners Bracket matches
    -- Round 1
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status, best_of, created_at) VALUES
    (bracket_uuid, 1, 1, 'winners', bag_babies_id, seize_maize_id, 1, 2, seize_maize_id, bag_babies_id, 'completed', 3, '2025-07-15 11:00:00+00'),
    (bracket_uuid, 1, 2, 'winners', hole_burners_id, came_dicks_id, 2, 0, hole_burners_id, came_dicks_id, 'completed', 3, '2025-07-15 11:30:00+00'),
    (bracket_uuid, 1, 3, 'winners', jager_bombers_id, shut_cornhole_id, 2, 0, jager_bombers_id, shut_cornhole_id, 'completed', 3, '2025-07-15 12:00:00+00'),
    (bracket_uuid, 1, 4, 'winners', hole_violators_id, pepperoni_cheesers_id, 2, 0, hole_violators_id, pepperoni_cheesers_id, 'completed', 3, '2025-07-15 12:30:00+00');

    -- Round 2
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status, best_of, created_at) VALUES
    (bracket_uuid, 2, 1, 'winners', jager_bombers_id, seize_maize_id, 2, 0, jager_bombers_id, seize_maize_id, 'completed', 3, '2025-07-15 13:00:00+00'),
    (bracket_uuid, 2, 2, 'winners', cuzzos_clinic_id, shut_cornhole_id, 2, 0, cuzzos_clinic_id, shut_cornhole_id, 'completed', 3, '2025-07-15 13:30:00+00'),
    (bracket_uuid, 2, 3, 'winners', hole_burners_id, hole_violators_id, 2, 0, hole_burners_id, hole_violators_id, 'completed', 3, '2025-07-15 14:00:00+00'),
    (bracket_uuid, 2, 4, 'winners', three_amigos_id, pepperoni_cheesers_id, 2, 0, three_amigos_id, pepperoni_cheesers_id, 'completed', 3, '2025-07-15 14:30:00+00');

    -- Round 3
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status, best_of, created_at) VALUES
    (bracket_uuid, 3, 1, 'winners', jager_bombers_id, cuzzos_clinic_id, 2, 0, jager_bombers_id, cuzzos_clinic_id, 'completed', 3, '2025-07-15 15:00:00+00'),
    (bracket_uuid, 3, 2, 'winners', hole_burners_id, three_amigos_id, 2, 0, hole_burners_id, three_amigos_id, 'completed', 3, '2025-07-15 15:30:00+00');

    -- Semifinals (Winners Final)
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status, best_of, created_at) VALUES
    (bracket_uuid, 4, 1, 'winners', jager_bombers_id, hole_burners_id, 2, 1, jager_bombers_id, hole_burners_id, 'completed', 3, '2025-07-15 16:00:00+00');

    -- Create Losers Bracket matches
    -- Round 1
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status, best_of, created_at) VALUES
    (bracket_uuid, 1, 1, 'losers', pepperoni_cheesers_id, bag_babies_id, 2, 1, pepperoni_cheesers_id, bag_babies_id, 'completed', 3, '2025-07-15 16:30:00+00'),
    (bracket_uuid, 1, 2, 'losers', shut_cornhole_id, came_dicks_id, 2, 0, shut_cornhole_id, came_dicks_id, 'completed', 3, '2025-07-15 17:00:00+00');

    -- Round 2
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status, best_of, created_at) VALUES
    (bracket_uuid, 2, 1, 'losers', hole_violators_id, pepperoni_cheesers_id, 0, 2, pepperoni_cheesers_id, hole_violators_id, 'completed', 3, '2025-07-15 17:30:00+00'),
    (bracket_uuid, 2, 2, 'losers', seize_maize_id, shut_cornhole_id, 2, 0, seize_maize_id, shut_cornhole_id, 'completed', 3, '2025-07-15 18:00:00+00');

    -- Round 3
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status, best_of, created_at) VALUES
    (bracket_uuid, 3, 1, 'losers', cuzzos_clinic_id, pepperoni_cheesers_id, 2, 0, cuzzos_clinic_id, pepperoni_cheesers_id, 'completed', 3, '2025-07-15 18:30:00+00'),
    (bracket_uuid, 3, 2, 'losers', seize_maize_id, three_amigos_id, 0, 2, three_amigos_id, seize_maize_id, 'completed', 3, '2025-07-15 19:00:00+00');

    -- Round 4
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status, best_of, created_at) VALUES
    (bracket_uuid, 4, 1, 'losers', cuzzos_clinic_id, three_amigos_id, 2, 0, cuzzos_clinic_id, three_amigos_id, 'completed', 3, '2025-07-15 19:30:00+00');

    -- Round 5
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status, best_of, created_at) VALUES
    (bracket_uuid, 5, 1, 'losers', cuzzos_clinic_id, hole_burners_id, 2, 0, cuzzos_clinic_id, hole_burners_id, 'completed', 3, '2025-07-15 20:00:00+00');

    -- Grand Finals
    INSERT INTO playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status, best_of, created_at) VALUES
    (bracket_uuid, 6, 1, 'finals', jager_bombers_id, cuzzos_clinic_id, 1, 2, cuzzos_clinic_id, jager_bombers_id, 'completed', 3, '2025-07-15 20:30:00+00'),
    (bracket_uuid, 6, 2, 'finals', jager_bombers_id, cuzzos_clinic_id, 0, 2, cuzzos_clinic_id, jager_bombers_id, 'completed', 3, '2025-07-15 21:00:00+00');

    -- Update team_season_stats for all participating teams
    INSERT INTO team_season_stats (season_id, team_id, match_wins, match_losses, game_wins, game_losses, playoff_rank, champion, runner_up, division_name)
    VALUES 
    (summer2_season_id, cuzzos_clinic_id, 0, 0, 0, 0, 1, true, false, 'Competitive'),
    (summer2_season_id, jager_bombers_id, 0, 0, 0, 0, 2, false, true, 'Competitive'),
    (summer2_season_id, hole_burners_id, 0, 0, 0, 0, 3, false, false, 'Competitive'),
    (summer2_season_id, three_amigos_id, 0, 0, 0, 0, 4, false, false, 'Competitive'),
    (summer2_season_id, seize_maize_id, 0, 0, 0, 0, 5, false, false, 'Competitive Low'),
    (summer2_season_id, pepperoni_cheesers_id, 0, 0, 0, 0, 6, false, false, 'Competitive'),
    (summer2_season_id, shut_cornhole_id, 0, 0, 0, 0, 7, false, false, 'Competitive Low'),
    (summer2_season_id, hole_violators_id, 0, 0, 0, 0, 8, false, false, 'Competitive'),
    (summer2_season_id, came_dicks_id, 0, 0, 0, 0, 9, false, false, 'Competitive Low'),
    (summer2_season_id, bag_babies_id, 0, 0, 0, 0, 10, false, false, 'Competitive Low')
    ON CONFLICT (season_id, team_id) DO UPDATE SET
        playoff_rank = EXCLUDED.playoff_rank,
        champion = EXCLUDED.champion,
        runner_up = EXCLUDED.runner_up,
        division_name = EXCLUDED.division_name;

    -- Create playoff_team_records for all teams
    INSERT INTO playoff_team_records (team_id, bracket_id, wins, losses, game_wins, game_losses, placement) VALUES
    (cuzzos_clinic_id, bracket_uuid, 6, 2, 12, 3, 1),
    (jager_bombers_id, bracket_uuid, 4, 2, 9, 5, 2),
    (hole_burners_id, bracket_uuid, 3, 2, 7, 4, 3),
    (three_amigos_id, bracket_uuid, 2, 2, 4, 4, 4),
    (seize_maize_id, bracket_uuid, 1, 2, 2, 4, 5),
    (pepperoni_cheesers_id, bracket_uuid, 1, 2, 2, 4, 6),
    (shut_cornhole_id, bracket_uuid, 1, 2, 2, 4, 7),
    (hole_violators_id, bracket_uuid, 1, 2, 2, 4, 8),
    (came_dicks_id, bracket_uuid, 0, 2, 0, 4, 9),
    (bag_babies_id, bracket_uuid, 0, 2, 1, 4, 10);

END $$;