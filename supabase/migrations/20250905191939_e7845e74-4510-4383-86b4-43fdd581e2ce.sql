-- Backfill Spring 2025 Recreational Playoff Matches
-- Step 1: Create missing "Smacked" team
INSERT INTO public.teams (id, name, division_id, created_at)
VALUES (
  gen_random_uuid(),
  'Smacked', 
  'c297a811-5dbe-4695-8aef-4c99b6972a46', -- Recreational division
  '2025-03-01 00:00:00+00'
);

-- Get the ID for the Smacked team we just created
WITH smacked_team AS (
  SELECT id as smacked_id FROM public.teams WHERE name = 'Smacked'
),
-- Step 2: Create the Spring 2025 Recreational Playoffs bracket
new_bracket AS (
  INSERT INTO public.brackets (id, title, division_id, format, state, created_at)
  VALUES (
    gen_random_uuid(),
    'Spring 2025 Recreational Playoffs',
    'c297a811-5dbe-4695-8aef-4c99b6972a46', -- Recreational division
    'Double Elimination',
    'completed',
    '2025-03-01 00:00:00+00'
  )
  RETURNING id as bracket_id
)
-- Step 3: Insert all playoff matches
INSERT INTO public.playoff_matches (
  id, bracket_id, round, position, match_type, 
  team1_id, team2_id, team1_score, team2_score, 
  winner_id, loser_id, best_of, status, created_at
) 
SELECT * FROM (
  SELECT 
    bracket_id,
    -- Winners Bracket Round 1
    gen_random_uuid() as id, bracket_id, 1 as round, 1 as position, 'winners'::playoff_match_type as match_type,
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid as team1_id, -- Here for Fireball
    smacked_id as team2_id, -- Smacked
    2 as team1_score, 0 as team2_score,
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid as winner_id, -- Here for Fireball
    smacked_id as loser_id, -- Smacked
    3 as best_of, 'completed' as status, '2025-03-15 10:00:00+00'::timestamptz as created_at
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  SELECT 
    gen_random_uuid(), bracket_id, 1, 2, 'winners'::playoff_match_type,
    'e91cb2d1-ef48-48e7-b15f-735c941f3679'::uuid, -- Red Roof Rockets
    '31e0e752-e0fc-4bd1-892f-3b7123ad72b7'::uuid, -- Triple Dippers
    0, 2,
    '31e0e752-e0fc-4bd1-892f-3b7123ad72b7'::uuid, -- Triple Dippers
    'e91cb2d1-ef48-48e7-b15f-735c941f3679'::uuid, -- Red Roof Rockets
    3, 'completed', '2025-03-15 10:30:00+00'::timestamptz
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  SELECT 
    gen_random_uuid(), bracket_id, 1, 3, 'winners'::playoff_match_type,
    '34b73bf9-d170-4fee-ab68-e506db5cbe05'::uuid, -- T-Baggers
    'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Killa Queens
    0, 2,
    'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Killa Queens
    '34b73bf9-d170-4fee-ab68-e506db5cbe05'::uuid, -- T-Baggers
    3, 'completed', '2025-03-15 11:00:00+00'::timestamptz
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  SELECT 
    gen_random_uuid(), bracket_id, 1, 4, 'winners'::playoff_match_type,
    'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Corn Kitties
    'de3cb5fe-7c5f-4211-8876-a52140df49b7'::uuid, -- Sour Patch Kids
    2, 0,
    'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Corn Kitties
    'de3cb5fe-7c5f-4211-8876-a52140df49b7'::uuid, -- Sour Patch Kids
    3, 'completed', '2025-03-15 11:30:00+00'::timestamptz
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  -- Winners Bracket Round 2
  SELECT 
    gen_random_uuid(), bracket_id, 2, 1, 'winners'::playoff_match_type,
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
    '31e0e752-e0fc-4bd1-892f-3b7123ad72b7'::uuid, -- Triple Dippers
    1, 2,
    '31e0e752-e0fc-4bd1-892f-3b7123ad72b7'::uuid, -- Triple Dippers
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
    3, 'completed', '2025-03-15 14:00:00+00'::timestamptz
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  SELECT 
    gen_random_uuid(), bracket_id, 2, 2, 'winners'::playoff_match_type,
    'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Killa Queens
    'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Corn Kitties
    2, 0,
    'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Killa Queens
    'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Corn Kitties
    3, 'completed', '2025-03-15 14:30:00+00'::timestamptz
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  -- Winners Bracket Final
  SELECT 
    gen_random_uuid(), bracket_id, 3, 1, 'winners'::playoff_match_type,
    '31e0e752-e0fc-4bd1-892f-3b7123ad72b7'::uuid, -- Triple Dippers
    'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Killa Queens
    2, 0,
    '31e0e752-e0fc-4bd1-892f-3b7123ad72b7'::uuid, -- Triple Dippers
    'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Killa Queens
    3, 'completed', '2025-03-15 17:00:00+00'::timestamptz
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  -- Losers Bracket Round 1
  SELECT 
    gen_random_uuid(), bracket_id, 1, 1, 'losers'::playoff_match_type,
    smacked_id, -- Smacked
    'e91cb2d1-ef48-48e7-b15f-735c941f3679'::uuid, -- Red Roof Rockets
    0, 2,
    'e91cb2d1-ef48-48e7-b15f-735c941f3679'::uuid, -- Red Roof Rockets
    smacked_id, -- Smacked
    3, 'completed', '2025-03-15 12:00:00+00'::timestamptz
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  SELECT 
    gen_random_uuid(), bracket_id, 1, 2, 'losers'::playoff_match_type,
    '34b73bf9-d170-4fee-ab68-e506db5cbe05'::uuid, -- T-Baggers
    'de3cb5fe-7c5f-4211-8876-a52140df49b7'::uuid, -- Sour Patch Kids
    0, 2,
    'de3cb5fe-7c5f-4211-8876-a52140df49b7'::uuid, -- Sour Patch Kids
    '34b73bf9-d170-4fee-ab68-e506db5cbe05'::uuid, -- T-Baggers
    3, 'completed', '2025-03-15 12:30:00+00'::timestamptz
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  -- Losers Bracket Round 2
  SELECT 
    gen_random_uuid(), bracket_id, 2, 1, 'losers'::playoff_match_type,
    'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Corn Kitties
    'e91cb2d1-ef48-48e7-b15f-735c941f3679'::uuid, -- Red Roof Rockets
    2, 1,
    'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Corn Kitties
    'e91cb2d1-ef48-48e7-b15f-735c941f3679'::uuid, -- Red Roof Rockets
    3, 'completed', '2025-03-15 15:00:00+00'::timestamptz
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  SELECT 
    gen_random_uuid(), bracket_id, 2, 2, 'losers'::playoff_match_type,
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
    'de3cb5fe-7c5f-4211-8876-a52140df49b7'::uuid, -- Sour Patch Kids
    2, 0,
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
    'de3cb5fe-7c5f-4211-8876-a52140df49b7'::uuid, -- Sour Patch Kids
    3, 'completed', '2025-03-15 15:30:00+00'::timestamptz
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  -- Losers Bracket Round 3
  SELECT 
    gen_random_uuid(), bracket_id, 3, 1, 'losers'::playoff_match_type,
    'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Corn Kitties
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
    1, 2,
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
    'ea3b15e7-8bc7-467c-85fc-7f91e89742a1'::uuid, -- Corn Kitties
    3, 'completed', '2025-03-15 16:00:00+00'::timestamptz
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  -- Losers Bracket Round 4 (Losers Final)
  SELECT 
    gen_random_uuid(), bracket_id, 4, 1, 'losers'::playoff_match_type,
    'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Killa Queens
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
    0, 2,
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
    'eb7976c7-fc7f-40e9-926d-d8bd1754003d'::uuid, -- Killa Queens
    3, 'completed', '2025-03-15 16:30:00+00'::timestamptz
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  -- Grand Finals Match 1 (Bracket Reset)
  SELECT 
    gen_random_uuid(), bracket_id, 1, 1, 'finals'::playoff_match_type,
    '31e0e752-e0fc-4bd1-892f-3b7123ad72b7'::uuid, -- Triple Dippers
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
    0, 2,
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
    '31e0e752-e0fc-4bd1-892f-3b7123ad72b7'::uuid, -- Triple Dippers
    3, 'completed', '2025-03-15 18:00:00+00'::timestamptz
  FROM new_bracket, smacked_team
  
  UNION ALL
  
  -- Grand Finals Match 2 (Championship)
  SELECT 
    gen_random_uuid(), bracket_id, 2, 1, 'finals'::playoff_match_type,
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
    '31e0e752-e0fc-4bd1-892f-3b7123ad72b7'::uuid, -- Triple Dippers
    0, 2,
    '31e0e752-e0fc-4bd1-892f-3b7123ad72b7'::uuid, -- Triple Dippers (CHAMPION)
    'c577e0f9-6700-4220-a902-b368ca915bbd'::uuid, -- Here for Fireball
    3, 'completed', '2025-03-15 18:30:00+00'::timestamptz
  FROM new_bracket, smacked_team
) matches;