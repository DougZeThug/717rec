
-- =============================================
-- Finalize Recreational Winter 1 2026 Bracket
-- bracket_id: 29a823d8-47b3-489c-a9f1-ebc6586d9baf
-- =============================================

-- UPDATE 1: Winners R2 P1 — On a Mission 0 vs Here for Fireball 2
UPDATE public.playoff_matches SET
  team1_score = 0, team2_score = 2,
  winner_id = 'c577e0f9-6700-4220-a902-b368ca915bbd',
  loser_id = '00def929-de16-4f59-933f-ae0247b04358',
  best_of = 3, status = 'completed', updated_at = now()
WHERE id = '9da09b98-47b3-489c-a9f1-ebc6586d9baf'
   OR (bracket_id = '29a823d8-47b3-489c-a9f1-ebc6586d9baf' AND match_type = 'winners' AND round = 2 AND position = 1);

-- UPDATE 2: Winners R2 P2 — Double Trouble 0 vs Cornholy Trinity 2
UPDATE public.playoff_matches SET
  team1_score = 0, team2_score = 2,
  winner_id = '34b1dacf-0c30-4a4c-8228-432701868f34',
  loser_id = '31e0e752-e0fc-4bd1-892f-3b7123ad72b7',
  best_of = 3, status = 'completed', updated_at = now()
WHERE id = '6e9ace9a-47b3-489c-a9f1-ebc6586d9baf'
   OR (bracket_id = '29a823d8-47b3-489c-a9f1-ebc6586d9baf' AND match_type = 'winners' AND round = 2 AND position = 2);

-- UPDATE 3: Winners R3 P1 — Here for Fireball 0 vs Cornholy Trinity 2
UPDATE public.playoff_matches SET
  team1_id = 'c577e0f9-6700-4220-a902-b368ca915bbd',
  team2_id = '34b1dacf-0c30-4a4c-8228-432701868f34',
  team1_score = 0, team2_score = 2,
  winner_id = '34b1dacf-0c30-4a4c-8228-432701868f34',
  loser_id = 'c577e0f9-6700-4220-a902-b368ca915bbd',
  best_of = 3, status = 'completed', updated_at = now()
WHERE id = '6a6ddb74-47b3-489c-a9f1-ebc6586d9baf'
   OR (bracket_id = '29a823d8-47b3-489c-a9f1-ebc6586d9baf' AND match_type = 'winners' AND round = 3 AND position = 1);

-- UPDATE 4: Losers R2 P1 — On a Mission 2 vs Sack to the Future 0 (fix team2_id)
UPDATE public.playoff_matches SET
  team2_id = '92e9f091-82f2-446d-8990-576c89a120e1',
  team1_score = 2, team2_score = 0,
  winner_id = '00def929-de16-4f59-933f-ae0247b04358',
  loser_id = '92e9f091-82f2-446d-8990-576c89a120e1',
  best_of = 3, status = 'completed', updated_at = now()
WHERE id = '7edc89b2-47b3-489c-a9f1-ebc6586d9baf'
   OR (bracket_id = '29a823d8-47b3-489c-a9f1-ebc6586d9baf' AND match_type = 'losers' AND round = 2 AND position = 1);

-- UPDATE 5: Losers R2 P2 — Double Trouble 2 vs Corn Kitties 0 (fix team2_id)
UPDATE public.playoff_matches SET
  team2_id = 'ea3b15e7-8bc7-467c-85fc-7f91e89742a1',
  team1_score = 2, team2_score = 0,
  winner_id = '31e0e752-e0fc-4bd1-892f-3b7123ad72b7',
  loser_id = 'ea3b15e7-8bc7-467c-85fc-7f91e89742a1',
  best_of = 3, status = 'completed', updated_at = now()
WHERE id = '64fe17e9-47b3-489c-a9f1-ebc6586d9baf'
   OR (bracket_id = '29a823d8-47b3-489c-a9f1-ebc6586d9baf' AND match_type = 'losers' AND round = 2 AND position = 2);

-- INSERT 1: Losers R3 P1 — On a Mission 2 vs Double Trouble 0
INSERT INTO public.playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, updated_at)
SELECT '29a823d8-47b3-489c-a9f1-ebc6586d9baf', 3, 1, 'losers',
  '00def929-de16-4f59-933f-ae0247b04358', '31e0e752-e0fc-4bd1-892f-3b7123ad72b7',
  2, 0, '00def929-de16-4f59-933f-ae0247b04358', '31e0e752-e0fc-4bd1-892f-3b7123ad72b7',
  3, 'completed', now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.playoff_matches
  WHERE bracket_id = '29a823d8-47b3-489c-a9f1-ebc6586d9baf' AND match_type = 'losers' AND round = 3 AND position = 1
);

-- INSERT 2: Losers R4 P1 — Here for Fireball 1 vs On a Mission 2
INSERT INTO public.playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, updated_at)
SELECT '29a823d8-47b3-489c-a9f1-ebc6586d9baf', 4, 1, 'losers',
  'c577e0f9-6700-4220-a902-b368ca915bbd', '00def929-de16-4f59-933f-ae0247b04358',
  1, 2, '00def929-de16-4f59-933f-ae0247b04358', 'c577e0f9-6700-4220-a902-b368ca915bbd',
  3, 'completed', now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.playoff_matches
  WHERE bracket_id = '29a823d8-47b3-489c-a9f1-ebc6586d9baf' AND match_type = 'losers' AND round = 4 AND position = 1
);

-- INSERT 3: Winners R4 P1 (Grand Final) — Cornholy Trinity 2 vs On a Mission 0
INSERT INTO public.playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, updated_at)
SELECT '29a823d8-47b3-489c-a9f1-ebc6586d9baf', 4, 1, 'winners',
  '34b1dacf-0c30-4a4c-8228-432701868f34', '00def929-de16-4f59-933f-ae0247b04358',
  2, 0, '34b1dacf-0c30-4a4c-8228-432701868f34', '00def929-de16-4f59-933f-ae0247b04358',
  3, 'completed', now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.playoff_matches
  WHERE bracket_id = '29a823d8-47b3-489c-a9f1-ebc6586d9baf' AND match_type = 'winners' AND round = 4 AND position = 1
);

-- Set champion metadata
UPDATE public.brackets SET
  wb_champion_id = '34b1dacf-0c30-4a4c-8228-432701868f34',
  state = 'completed'
WHERE id = '29a823d8-47b3-489c-a9f1-ebc6586d9baf';
