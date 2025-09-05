-- Backfill Spring 2025 Recreational Playoff Matches
-- Step 1: Create missing "Smacked" team
INSERT INTO public.teams (id, name, division_id, created_at)
VALUES (
  gen_random_uuid(),
  'Smacked', 
  'c297a811-5dbe-4695-8aef-4c99b6972a46', -- Recreational division
  '2025-03-01 00:00:00+00'
);

-- Step 2: Create the Spring 2025 Recreational Playoffs bracket
INSERT INTO public.brackets (id, title, division_id, format, state, created_at)
VALUES (
  gen_random_uuid(),
  'Spring 2025 Recreational Playoffs',
  'c297a811-5dbe-4695-8aef-4c99b6972a46', -- Recreational division
  'Double Elimination',
  'completed',
  '2025-03-01 00:00:00+00'
);

-- Step 3: Insert all playoff matches with the new bracket and team IDs
INSERT INTO public.playoff_matches (
  id, bracket_id, round, position, match_type, 
  team1_id, team2_id, team1_score, team2_score, 
  winner_id, loser_id, best_of, status, created_at
) VALUES
-- Winners Bracket Round 1
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  1, 1, 'winners',
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  (SELECT id FROM public.teams WHERE name = 'Smacked'), -- Smacked
  2, 0,
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  (SELECT id FROM public.teams WHERE name = 'Smacked'), -- Smacked
  3, 'completed', '2025-03-15 10:00:00+00'
),
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  1, 2, 'winners',
  'e91cb2d1-ef48-48e7-b15f-735c941f3679', -- Red Roof Rockets
  '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', -- Triple Dippers
  0, 2,
  '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', -- Triple Dippers
  'e91cb2d1-ef48-48e7-b15f-735c941f3679', -- Red Roof Rockets
  3, 'completed', '2025-03-15 10:30:00+00'
),
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  1, 3, 'winners',
  '34b73bf9-d170-4fee-ab68-e506db5cbe05', -- T-Baggers
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d', -- Killa Queens
  0, 2,
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d', -- Killa Queens
  '34b73bf9-d170-4fee-ab68-e506db5cbe05', -- T-Baggers
  3, 'completed', '2025-03-15 11:00:00+00'
),
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  1, 4, 'winners',
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', -- Corn Kitties
  'de3cb5fe-7c5f-4211-8876-a52140df49b7', -- Sour Patch Kids
  2, 0,
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', -- Corn Kitties
  'de3cb5fe-7c5f-4211-8876-a52140df49b7', -- Sour Patch Kids
  3, 'completed', '2025-03-15 11:30:00+00'
),
-- Winners Bracket Round 2
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  2, 1, 'winners',
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', -- Triple Dippers
  1, 2,
  '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', -- Triple Dippers
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  3, 'completed', '2025-03-15 14:00:00+00'
),
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  2, 2, 'winners',
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d', -- Killa Queens
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', -- Corn Kitties
  2, 0,
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d', -- Killa Queens
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', -- Corn Kitties
  3, 'completed', '2025-03-15 14:30:00+00'
),
-- Winners Bracket Final
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  3, 1, 'winners',
  '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', -- Triple Dippers
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d', -- Killa Queens
  2, 0,
  '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', -- Triple Dippers
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d', -- Killa Queens
  3, 'completed', '2025-03-15 17:00:00+00'
),
-- Losers Bracket Round 1
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  1, 1, 'losers',
  (SELECT id FROM public.teams WHERE name = 'Smacked'), -- Smacked
  'e91cb2d1-ef48-48e7-b15f-735c941f3679', -- Red Roof Rockets
  0, 2,
  'e91cb2d1-ef48-48e7-b15f-735c941f3679', -- Red Roof Rockets
  (SELECT id FROM public.teams WHERE name = 'Smacked'), -- Smacked
  3, 'completed', '2025-03-15 12:00:00+00'
),
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  1, 2, 'losers',
  '34b73bf9-d170-4fee-ab68-e506db5cbe05', -- T-Baggers
  'de3cb5fe-7c5f-4211-8876-a52140df49b7', -- Sour Patch Kids
  0, 2,
  'de3cb5fe-7c5f-4211-8876-a52140df49b7', -- Sour Patch Kids
  '34b73bf9-d170-4fee-ab68-e506db5cbe05', -- T-Baggers
  3, 'completed', '2025-03-15 12:30:00+00'
),
-- Losers Bracket Round 2
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  2, 1, 'losers',
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', -- Corn Kitties
  'e91cb2d1-ef48-48e7-b15f-735c941f3679', -- Red Roof Rockets
  2, 1,
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', -- Corn Kitties
  'e91cb2d1-ef48-48e7-b15f-735c941f3679', -- Red Roof Rockets
  3, 'completed', '2025-03-15 15:00:00+00'
),
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  2, 2, 'losers',
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  'de3cb5fe-7c5f-4211-8876-a52140df49b7', -- Sour Patch Kids
  2, 0,
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  'de3cb5fe-7c5f-4211-8876-a52140df49b7', -- Sour Patch Kids
  3, 'completed', '2025-03-15 15:30:00+00'
),
-- Losers Bracket Round 3
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  3, 1, 'losers',
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', -- Corn Kitties
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  1, 2,
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', -- Corn Kitties
  3, 'completed', '2025-03-15 16:00:00+00'
),
-- Losers Bracket Round 4 (Losers Final)
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  4, 1, 'losers',
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d', -- Killa Queens
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  0, 2,
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d', -- Killa Queens
  3, 'completed', '2025-03-15 16:30:00+00'
),
-- Grand Finals Match 1 (Bracket Reset)
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  1, 1, 'finals',
  '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', -- Triple Dippers
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  0, 2,
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', -- Triple Dippers
  3, 'completed', '2025-03-15 18:00:00+00'
),
-- Grand Finals Match 2 (Championship)
(
  gen_random_uuid(), 
  (SELECT id FROM public.brackets WHERE title = 'Spring 2025 Recreational Playoffs'), 
  2, 1, 'finals',
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', -- Triple Dippers
  0, 2,
  '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', -- Triple Dippers (CHAMPION)
  'c577e0f9-6700-4220-a902-b368ca915bbd', -- Here for Fireball
  3, 'completed', '2025-03-15 18:30:00+00'
);