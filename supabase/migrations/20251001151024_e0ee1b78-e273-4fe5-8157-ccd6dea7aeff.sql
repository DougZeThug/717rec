
-- First, update playoff_matches to reference the correct "Smacked" team
-- Replace references to the duplicate team (9b67da79-e740-4218-82f6-979d3590e13c)
-- with the correct team that has the image and records (1aa161b8-9016-4bc8-9d93-a58370f02e7b)

UPDATE playoff_matches
SET team1_id = '1aa161b8-9016-4bc8-9d93-a58370f02e7b'
WHERE team1_id = '9b67da79-e740-4218-82f6-979d3590e13c';

UPDATE playoff_matches
SET team2_id = '1aa161b8-9016-4bc8-9d93-a58370f02e7b'
WHERE team2_id = '9b67da79-e740-4218-82f6-979d3590e13c';

UPDATE playoff_matches
SET winner_id = '1aa161b8-9016-4bc8-9d93-a58370f02e7b'
WHERE winner_id = '9b67da79-e740-4218-82f6-979d3590e13c';

UPDATE playoff_matches
SET loser_id = '1aa161b8-9016-4bc8-9d93-a58370f02e7b'
WHERE loser_id = '9b67da79-e740-4218-82f6-979d3590e13c';

-- Now delete the duplicate "Smacked" team
DELETE FROM teams 
WHERE id = '9b67da79-e740-4218-82f6-979d3590e13c';
