-- Fix Summer 2 (INT1) Playoffs - Losers Finals and Championship
-- Bracket ID: c8936056-134a-4eb8-bb67-f09815e5e9c3

-- Step 1: Fix Losers Finals (Round 5) - Wrong Hole 2-0 Happy Valley Hole Hunters
-- Match ID: 716ecde1-29f9-4833-828f-ce8b1444cfcb
UPDATE playoff_matches 
SET 
  winner_id = (SELECT id FROM teams WHERE name = 'Wrong Hole'),
  loser_id = (SELECT id FROM teams WHERE name = 'Happy Valley Hole Hunters'),
  team1_score = 2,
  team2_score = 0
WHERE id = '716ecde1-29f9-4833-828f-ce8b1444cfcb';

-- Step 2: Fix Championship (Round 6) - Baggin' & Braggin' 2-0 Wrong Hole
-- Match ID: ff56c08b-4930-4487-ae34-f6ea978038a0
UPDATE playoff_matches 
SET 
  team2_id = (SELECT id FROM teams WHERE name = 'Wrong Hole'),
  loser_id = (SELECT id FROM teams WHERE name = 'Wrong Hole')
WHERE id = 'ff56c08b-4930-4487-ae34-f6ea978038a0';

-- Step 3: Recalculate all team season stats to reflect corrections
SELECT public.upsert_team_season_stats();