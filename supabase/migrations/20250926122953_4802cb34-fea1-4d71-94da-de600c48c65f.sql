-- Create Summer 2 (REC) Playoffs bracket
INSERT INTO public.brackets (id, title, format, state, division_id, created_at)
VALUES (
  gen_random_uuid(),
  'Summer 2 (REC) Playoffs', 
  'Double Elimination',
  'completed',
  'c297a811-5dbe-4695-8aef-4c99b6972a46'::uuid,
  now()
);

-- Get the bracket ID for reference
WITH bracket_ref AS (
  SELECT id as bracket_id FROM public.brackets WHERE title = 'Summer 2 (REC) Playoffs' ORDER BY created_at DESC LIMIT 1
)
-- Insert all playoff matches for Summer 2 REC
-- Winners Bracket Round 1
INSERT INTO public.playoff_matches (id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status, created_at) 
SELECT 
  gen_random_uuid(),
  bracket_ref.bracket_id,
  1, 1, 'winners'::playoff_match_type, 
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Corn Kitties
  'de3cb5fe-7c5f-4211-8876-a52140df49b7'::uuid, -- Sour Patch Kids
  2, 0, 
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Winner: Corn Kitties
  'de3cb5fe-7c5f-4211-8876-a52140df49b7'::uuid, -- Loser: Sour Patch Kids
  'completed', now()
FROM bracket_ref

UNION ALL

SELECT 
  gen_random_uuid(),
  bracket_ref.bracket_id,
  1, 2, 'winners'::playoff_match_type,
  'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
  'f6dbab64-cc61-4efe-ac3f-e756345d94ed'::uuid, -- Cornographic Material
  2, 0,
  'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Winner: Here for Fireball
  'f6dbab64-cc61-4efe-ac3f-e756345d94ed'::uuid, -- Loser: Cornographic Material
  'completed', now()
FROM bracket_ref

UNION ALL

-- Winners Bracket Round 2
SELECT 
  gen_random_uuid(),
  bracket_ref.bracket_id,
  2, 1, 'winners'::playoff_match_type,
  'aa967a4d-b9a8-496e-81e9-7993ac005763'::uuid, -- Jerm
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Corn Kitties
  2, 0,
  'aa967a4d-b9a8-496e-81e9-7993ac005763'::uuid, -- Winner: Jerm
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Loser: Corn Kitties
  'completed', now()
FROM bracket_ref

UNION ALL

SELECT 
  gen_random_uuid(),
  bracket_ref.bracket_id,
  2, 2, 'winners'::playoff_match_type,
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Killa Queens
  'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
  0, 2,
  'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Winner: Here for Fireball
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Loser: Killa Queens
  'completed', now()
FROM bracket_ref

UNION ALL

-- Winners Bracket Semifinals
SELECT 
  gen_random_uuid(),
  bracket_ref.bracket_id,
  3, 1, 'winners'::playoff_match_type,
  'aa967a4d-b9a8-496e-81e9-7993ac005763'::uuid, -- Jerm
  'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
  2, 1,
  'aa967a4d-b9a8-496e-81e9-7993ac005763'::uuid, -- Winner: Jerm
  'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Loser: Here for Fireball
  'completed', now()
FROM bracket_ref

UNION ALL

-- Winners Bracket Finals
SELECT 
  gen_random_uuid(),
  bracket_ref.bracket_id,
  4, 1, 'winners'::playoff_match_type,
  'aa967a4d-b9a8-496e-81e9-7993ac005763'::uuid, -- Jerm
  'f6dbab64-cc61-4efe-ac3f-e756345d94ed'::uuid, -- Cornographic Material
  2, 0,
  'aa967a4d-b9a8-496e-81e9-7993ac005763'::uuid, -- Winner: Jerm
  'f6dbab64-cc61-4efe-ac3f-e756345d94ed'::uuid, -- Loser: Cornographic Material
  'completed', now()
FROM bracket_ref

UNION ALL

-- Losers Bracket Round 1
SELECT 
  gen_random_uuid(),
  bracket_ref.bracket_id,
  1, 1, 'losers'::playoff_match_type,
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Killa Queens
  'de3cb5fe-7c5f-4211-8876-a52140df49b7'::uuid, -- Sour Patch Kids
  2, 1,
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Winner: Killa Queens
  'de3cb5fe-7c5f-4211-8876-a52140df49b7'::uuid, -- Loser: Sour Patch Kids
  'completed', now()
FROM bracket_ref

UNION ALL

SELECT 
  gen_random_uuid(),
  bracket_ref.bracket_id,
  1, 2, 'losers'::playoff_match_type,
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Corn Kitties
  'f6dbab64-cc61-4efe-ac3f-e756345d94ed'::uuid, -- Cornographic Material
  0, 2,
  'f6dbab64-cc61-4efe-ac3f-e756345d94ed'::uuid, -- Winner: Cornographic Material
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Loser: Corn Kitties
  'completed', now()
FROM bracket_ref

UNION ALL

-- Losers Bracket Round 2
SELECT 
  gen_random_uuid(),
  bracket_ref.bracket_id,
  2, 1, 'losers'::playoff_match_type,
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Killa Queens
  'f6dbab64-cc61-4efe-ac3f-e756345d94ed'::uuid, -- Cornographic Material
  0, 2,
  'f6dbab64-cc61-4efe-ac3f-e756345d94ed'::uuid, -- Winner: Cornographic Material
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Loser: Killa Queens
  'completed', now()
FROM bracket_ref

UNION ALL

-- Losers Bracket Round 3
SELECT 
  gen_random_uuid(),
  bracket_ref.bracket_id,
  3, 1, 'losers'::playoff_match_type,
  'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
  'f6dbab64-cc61-4efe-ac3f-e756345d94ed'::uuid, -- Cornographic Material
  0, 2,
  'f6dbab64-cc61-4efe-ac3f-e756345d94ed'::uuid, -- Winner: Cornographic Material
  'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Loser: Here for Fireball
  'completed', now()
FROM bracket_ref

UNION ALL

-- Grand Finals
SELECT 
  gen_random_uuid(),
  bracket_ref.bracket_id,
  1, 1, 'finals'::playoff_match_type,
  'aa967a4d-b9a8-496e-81e9-7993ac005763'::uuid, -- Jerm
  'f6dbab64-cc61-4efe-ac3f-e756345d94ed'::uuid, -- Cornographic Material
  2, 0,
  'aa967a4d-b9a8-496e-81e9-7993ac005763'::uuid, -- Winner: Jerm (Champion)
  'f6dbab64-cc61-4efe-ac3f-e756345d94ed'::uuid, -- Loser: Cornographic Material
  'completed', now()
FROM bracket_ref;