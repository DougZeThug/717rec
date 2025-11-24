-- Fix Summer 2 (COMP) Playoffs Bracket Structure and Match Results
-- Bracket ID: 91aae806-4249-48ef-824d-dde8bcf14909

-- Step 1: Delete incorrect Winners Round 1 matches (positions 3 & 4 shouldn't exist)
DELETE FROM playoff_matches 
WHERE bracket_id = '91aae806-4249-48ef-824d-dde8bcf14909'
  AND round = 1
  AND match_type = 'winners'
  AND position IN (3, 4);

-- Step 2: Delete incorrect Losers Round 2 match where Pepperoni wrongly beat Hole Violators
DELETE FROM playoff_matches 
WHERE bracket_id = '91aae806-4249-48ef-824d-dde8bcf14909'
  AND round = 2
  AND match_type = 'losers'
  AND winner_id = (SELECT id FROM teams WHERE name = 'Pepperoni Cheesers')
  AND (team1_id = (SELECT id FROM teams WHERE name = 'Hole Violators') 
       OR team2_id = (SELECT id FROM teams WHERE name = 'Hole Violators'));

-- Step 3: Delete incorrect Losers Round 3 match (Cuzzo's vs Pepperoni instead of vs Hole Violators)
DELETE FROM playoff_matches 
WHERE bracket_id = '91aae806-4249-48ef-824d-dde8bcf14909'
  AND round = 3
  AND match_type = 'losers'
  AND (team1_id = (SELECT id FROM teams WHERE name = 'Pepperoni Cheesers') 
       OR team2_id = (SELECT id FROM teams WHERE name = 'Pepperoni Cheesers'));

-- Step 4: Update Winners Round 2 score (Cuzzo's 2-1 Shut Your Cornhole, not 2-0)
UPDATE playoff_matches 
SET team1_score = 2, team2_score = 1
WHERE bracket_id = '91aae806-4249-48ef-824d-dde8bcf14909'
  AND round = 2
  AND match_type = 'winners'
  AND winner_id = (SELECT id FROM teams WHERE name = 'Cuzzo''s Clinic')
  AND (team2_id = (SELECT id FROM teams WHERE name = 'Shut Your Cornhole'));

-- Step 5: Insert correct Losers Round 2 match (Hole Violators 2-0 Pepperoni Cheesers)
INSERT INTO playoff_matches (
  bracket_id, round, position, match_type,
  team1_id, team2_id, 
  team1_score, team2_score,
  winner_id, loser_id,
  status, best_of
)
SELECT 
  '91aae806-4249-48ef-824d-dde8bcf14909',
  2,
  1,
  'losers',
  (SELECT id FROM teams WHERE name = 'Hole Violators'),
  (SELECT id FROM teams WHERE name = 'Pepperoni Cheesers'),
  2,
  0,
  (SELECT id FROM teams WHERE name = 'Hole Violators'),
  (SELECT id FROM teams WHERE name = 'Pepperoni Cheesers'),
  'completed',
  3
WHERE NOT EXISTS (
  SELECT 1 FROM playoff_matches 
  WHERE bracket_id = '91aae806-4249-48ef-824d-dde8bcf14909'
    AND round = 2
    AND match_type = 'losers'
    AND team1_id = (SELECT id FROM teams WHERE name = 'Hole Violators')
    AND team2_id = (SELECT id FROM teams WHERE name = 'Pepperoni Cheesers')
);

-- Step 6: Insert correct Losers Round 3 match (Cuzzo's Clinic 2-0 Hole Violators)
INSERT INTO playoff_matches (
  bracket_id, round, position, match_type,
  team1_id, team2_id,
  team1_score, team2_score,
  winner_id, loser_id,
  status, best_of
)
SELECT 
  '91aae806-4249-48ef-824d-dde8bcf14909',
  3,
  1,
  'losers',
  (SELECT id FROM teams WHERE name = 'Cuzzo''s Clinic'),
  (SELECT id FROM teams WHERE name = 'Hole Violators'),
  2,
  0,
  (SELECT id FROM teams WHERE name = 'Cuzzo''s Clinic'),
  (SELECT id FROM teams WHERE name = 'Hole Violators'),
  'completed',
  3
WHERE NOT EXISTS (
  SELECT 1 FROM playoff_matches 
  WHERE bracket_id = '91aae806-4249-48ef-824d-dde8bcf14909'
    AND round = 3
    AND match_type = 'losers'
    AND team1_id = (SELECT id FROM teams WHERE name = 'Cuzzo''s Clinic')
    AND team2_id = (SELECT id FROM teams WHERE name = 'Hole Violators')
);

-- Step 7: Recalculate all team season stats to reflect corrections
SELECT public.upsert_team_season_stats();