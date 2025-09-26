-- Create Summer 2 (INT1) Playoffs bracket and record all results

-- First, create the bracket
INSERT INTO brackets (id, title, format, state, division_id)
VALUES (
  gen_random_uuid(),
  'Summer 2 (INT1) Playoffs',
  'Double Elimination',
  'completed',
  (SELECT id FROM divisions WHERE name = 'Intermediate' LIMIT 1)
);

-- Get the bracket ID for use in matches
WITH bracket_info AS (
  SELECT id as bracket_id FROM brackets WHERE title = 'Summer 2 (INT1) Playoffs'
),
season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
),
team_ids AS (
  SELECT 
    (SELECT id FROM teams WHERE name = 'Baggin'' & Braggin''') as baggin_braggin,
    (SELECT id FROM teams WHERE name = 'Happy Valley Hole Hunters') as happy_valley,
    (SELECT id FROM teams WHERE name = 'Wrong Hole') as wrong_hole,
    (SELECT id FROM teams WHERE name = 'Sweat Bandits') as sweat_bandits,
    (SELECT id FROM teams WHERE name = 'Bag Assassins') as bag_assassins,
    (SELECT id FROM teams WHERE name = 'Mailmen') as mailmen,
    (SELECT id FROM teams WHERE name = 'The Beards') as beards,
    (SELECT id FROM teams WHERE name = 'Miracle @ Marion') as miracle_marion,
    (SELECT id FROM teams WHERE name = 'Believers') as believers
)

-- Insert all playoff matches
INSERT INTO playoff_matches (
  id, bracket_id, round, position, match_type, 
  team1_id, team2_id, team1_score, team2_score, 
  winner_id, loser_id, status
)
SELECT * FROM (
  VALUES 
    -- Winners Bracket Round 1
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 1, 1, 'winners'::playoff_match_type, 
     (SELECT baggin_braggin FROM team_ids), (SELECT believers FROM team_ids), 2, 0, 
     (SELECT baggin_braggin FROM team_ids), (SELECT believers FROM team_ids), 'completed'),
    
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 1, 2, 'winners'::playoff_match_type, 
     (SELECT happy_valley FROM team_ids), (SELECT miracle_marion FROM team_ids), 2, 0, 
     (SELECT happy_valley FROM team_ids), (SELECT miracle_marion FROM team_ids), 'completed'),
    
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 1, 3, 'winners'::playoff_match_type, 
     (SELECT wrong_hole FROM team_ids), (SELECT beards FROM team_ids), 2, 0, 
     (SELECT wrong_hole FROM team_ids), (SELECT beards FROM team_ids), 'completed'),
    
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 1, 4, 'winners'::playoff_match_type, 
     (SELECT sweat_bandits FROM team_ids), (SELECT mailmen FROM team_ids), 2, 0, 
     (SELECT sweat_bandits FROM team_ids), (SELECT mailmen FROM team_ids), 'completed'),
    
    -- Winners Bracket Round 2 (Quarterfinals)
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 2, 1, 'winners'::playoff_match_type, 
     (SELECT baggin_braggin FROM team_ids), (SELECT bag_assassins FROM team_ids), 2, 0, 
     (SELECT baggin_braggin FROM team_ids), (SELECT bag_assassins FROM team_ids), 'completed'),
    
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 2, 2, 'winners'::playoff_match_type, 
     (SELECT happy_valley FROM team_ids), (SELECT wrong_hole FROM team_ids), 2, 1, 
     (SELECT happy_valley FROM team_ids), (SELECT wrong_hole FROM team_ids), 'completed'),
    
    -- Winners Bracket Round 3 (Semifinals)  
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 3, 1, 'winners'::playoff_match_type, 
     (SELECT baggin_braggin FROM team_ids), (SELECT sweat_bandits FROM team_ids), 2, 0, 
     (SELECT baggin_braggin FROM team_ids), (SELECT sweat_bandits FROM team_ids), 'completed'),
    
    -- Winners Bracket Round 4 (Finals)
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 4, 1, 'winners'::playoff_match_type, 
     (SELECT baggin_braggin FROM team_ids), (SELECT happy_valley FROM team_ids), 2, 1, 
     (SELECT baggin_braggin FROM team_ids), (SELECT happy_valley FROM team_ids), 'completed'),
    
    -- Losers Bracket Round 1
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 1, 1, 'losers'::playoff_match_type, 
     (SELECT believers FROM team_ids), (SELECT miracle_marion FROM team_ids), 0, 2, 
     (SELECT miracle_marion FROM team_ids), (SELECT believers FROM team_ids), 'completed'),
    
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 1, 2, 'losers'::playoff_match_type, 
     (SELECT beards FROM team_ids), (SELECT mailmen FROM team_ids), 0, 2, 
     (SELECT mailmen FROM team_ids), (SELECT beards FROM team_ids), 'completed'),
    
    -- Losers Bracket Round 2
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 2, 1, 'losers'::playoff_match_type, 
     (SELECT miracle_marion FROM team_ids), (SELECT bag_assassins FROM team_ids), 1, 2, 
     (SELECT bag_assassins FROM team_ids), (SELECT miracle_marion FROM team_ids), 'completed'),
    
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 2, 2, 'losers'::playoff_match_type, 
     (SELECT mailmen FROM team_ids), (SELECT wrong_hole FROM team_ids), 0, 2, 
     (SELECT wrong_hole FROM team_ids), (SELECT mailmen FROM team_ids), 'completed'),
    
    -- Losers Bracket Round 3
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 3, 1, 'losers'::playoff_match_type, 
     (SELECT bag_assassins FROM team_ids), (SELECT sweat_bandits FROM team_ids), 1, 2, 
     (SELECT sweat_bandits FROM team_ids), (SELECT bag_assassins FROM team_ids), 'completed'),
    
    -- Losers Bracket Round 4
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 4, 1, 'losers'::playoff_match_type, 
     (SELECT wrong_hole FROM team_ids), (SELECT sweat_bandits FROM team_ids), 2, 0, 
     (SELECT wrong_hole FROM team_ids), (SELECT sweat_bandits FROM team_ids), 'completed'),
    
    -- Losers Bracket Round 5 (Losers Finals)
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 5, 1, 'losers'::playoff_match_type, 
     (SELECT wrong_hole FROM team_ids), (SELECT happy_valley FROM team_ids), 0, 2, 
     (SELECT happy_valley FROM team_ids), (SELECT wrong_hole FROM team_ids), 'completed'),
    
    -- Grand Finals
    (gen_random_uuid(), (SELECT bracket_id FROM bracket_info), 6, 1, 'finals'::playoff_match_type, 
     (SELECT baggin_braggin FROM team_ids), (SELECT happy_valley FROM team_ids), 2, 0, 
     (SELECT baggin_braggin FROM team_ids), (SELECT happy_valley FROM team_ids), 'completed')
) AS matches(id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status);

-- Update team_season_stats for all INT1 playoff participants
WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET champion = true, playoff_rank = 1
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Baggin'' & Braggin''');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET runner_up = true, playoff_rank = 2
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Happy Valley Hole Hunters');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 3
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Wrong Hole');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 4
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Sweat Bandits');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 5
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Bag Assassins');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 6
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Mailmen');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 7
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'The Beards');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 8
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Miracle @ Marion');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 9
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Believers');

-- Create playoff_team_records for all participants
WITH bracket_info AS (
  SELECT id as bracket_id FROM brackets WHERE title = 'Summer 2 (INT1) Playoffs'
)
INSERT INTO playoff_team_records (team_id, bracket_id, wins, losses, placement)
VALUES 
  ((SELECT id FROM teams WHERE name = 'Baggin'' & Braggin'''), (SELECT bracket_id FROM bracket_info), 5, 0, 1),
  ((SELECT id FROM teams WHERE name = 'Happy Valley Hole Hunters'), (SELECT bracket_id FROM bracket_info), 4, 2, 2),
  ((SELECT id FROM teams WHERE name = 'Wrong Hole'), (SELECT bracket_id FROM bracket_info), 3, 2, 3),
  ((SELECT id FROM teams WHERE name = 'Sweat Bandits'), (SELECT bracket_id FROM bracket_info), 2, 2, 4),
  ((SELECT id FROM teams WHERE name = 'Bag Assassins'), (SELECT bracket_id FROM bracket_info), 1, 2, 5),
  ((SELECT id FROM teams WHERE name = 'Mailmen'), (SELECT bracket_id FROM bracket_info), 1, 2, 6),
  ((SELECT id FROM teams WHERE name = 'The Beards'), (SELECT bracket_id FROM bracket_info), 0, 2, 7),
  ((SELECT id FROM teams WHERE name = 'Miracle @ Marion'), (SELECT bracket_id FROM bracket_info), 1, 2, 8),
  ((SELECT id FROM teams WHERE name = 'Believers'), (SELECT bracket_id FROM bracket_info), 0, 2, 9);