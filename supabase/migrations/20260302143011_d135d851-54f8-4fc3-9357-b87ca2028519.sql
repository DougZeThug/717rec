
-- =============================================
-- Finalize Intermediate Winter 1 2026 Bracket
-- bracket_id: dbf640b8-2f5e-4a05-8ecb-71b49aee15b0
-- =============================================

-- Team ID reference:
-- Wrong Hole:       0c7261b9-db22-48d1-8487-ba9eeb90fbef
-- Bumbleweed:       37bf909c-3bcf-45fc-860e-9f64b7b03cbe
-- Buttery Nips:     01ec006b-6ee3-47b3-ac8d-f93cc11d3460
-- Miracle @ Marion: 2ab2e684-8c28-45c3-801a-ea215433a8e4
-- Happy Valley:     a484a124-89f8-468d-9ebb-2709ad47c7f5
-- Smooth Sliders:   8aef742f-f7d7-4996-a2bb-96a430b5e005

-- UPDATE 1: Winners R2 P1 — Miracle @ Marion 1 vs Wrong Hole 2
UPDATE public.playoff_matches SET
  team1_score = 1, team2_score = 2,
  winner_id = '0c7261b9-db22-48d1-8487-ba9eeb90fbef',
  loser_id = '2ab2e684-8c28-45c3-801a-ea215433a8e4',
  best_of = 3, status = 'completed', updated_at = now()
WHERE id = '8b048a1a-6dc3-4078-b54b-71186b6bdc8f';

-- UPDATE 2: Winners R2 P2 — Buttery Nips 1 vs Bumbleweed 2
UPDATE public.playoff_matches SET
  team1_score = 1, team2_score = 2,
  winner_id = '37bf909c-3bcf-45fc-860e-9f64b7b03cbe',
  loser_id = '01ec006b-6ee3-47b3-ac8d-f93cc11d3460',
  best_of = 3, status = 'completed', updated_at = now()
WHERE id = 'd6a9fa1f-5607-414a-afd5-6001354a615f';

-- UPDATE 3: Winners R3 P1 — Wrong Hole 0 vs Bumbleweed 2
UPDATE public.playoff_matches SET
  team1_id = '0c7261b9-db22-48d1-8487-ba9eeb90fbef',
  team2_id = '37bf909c-3bcf-45fc-860e-9f64b7b03cbe',
  team1_score = 0, team2_score = 2,
  winner_id = '37bf909c-3bcf-45fc-860e-9f64b7b03cbe',
  loser_id = '0c7261b9-db22-48d1-8487-ba9eeb90fbef',
  best_of = 3, status = 'completed', updated_at = now()
WHERE id = '9f4e8b30-de26-4fda-b32a-45a4b43624cd';

-- UPDATE 4: Losers R2 P1 — Miracle @ Marion 1 vs Happy Valley 2 (fix team2_id)
UPDATE public.playoff_matches SET
  team2_id = 'a484a124-89f8-468d-9ebb-2709ad47c7f5',
  team1_score = 1, team2_score = 2,
  winner_id = 'a484a124-89f8-468d-9ebb-2709ad47c7f5',
  loser_id = '2ab2e684-8c28-45c3-801a-ea215433a8e4',
  best_of = 3, status = 'completed', updated_at = now()
WHERE id = '3689c92b-cc60-4b3f-b363-e898472fafb5';

-- UPDATE 5: Losers R2 P2 — Buttery Nips 2 vs Smooth Sliders 0 (fix team2_id)
UPDATE public.playoff_matches SET
  team2_id = '8aef742f-f7d7-4996-a2bb-96a430b5e005',
  team1_score = 2, team2_score = 0,
  winner_id = '01ec006b-6ee3-47b3-ac8d-f93cc11d3460',
  loser_id = '8aef742f-f7d7-4996-a2bb-96a430b5e005',
  best_of = 3, status = 'completed', updated_at = now()
WHERE id = '4dfe4167-da66-44a4-a734-cea266311dad';

-- INSERT 1: Losers R3 P1 — Happy Valley 0 vs Buttery Nips 2
INSERT INTO public.playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, updated_at)
VALUES ('dbf640b8-2f5e-4a05-8ecb-71b49aee15b0', 3, 1, 'losers',
  'a484a124-89f8-468d-9ebb-2709ad47c7f5', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460',
  0, 2, '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 'a484a124-89f8-468d-9ebb-2709ad47c7f5',
  3, 'completed', now());

-- INSERT 2: Losers R4 P1 — Wrong Hole 0 vs Buttery Nips 2
INSERT INTO public.playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, updated_at)
VALUES ('dbf640b8-2f5e-4a05-8ecb-71b49aee15b0', 4, 1, 'losers',
  '0c7261b9-db22-48d1-8487-ba9eeb90fbef', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460',
  0, 2, '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', '0c7261b9-db22-48d1-8487-ba9eeb90fbef',
  3, 'completed', now());

-- INSERT 3: Winners R4 P1 (Grand Final) — Bumbleweed 2 vs Buttery Nips 1
INSERT INTO public.playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, updated_at)
VALUES ('dbf640b8-2f5e-4a05-8ecb-71b49aee15b0', 4, 1, 'winners',
  '37bf909c-3bcf-45fc-860e-9f64b7b03cbe', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460',
  2, 1, '37bf909c-3bcf-45fc-860e-9f64b7b03cbe', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460',
  3, 'completed', now());

-- Set champion metadata on brackets table
UPDATE public.brackets SET
  wb_champion_id = '37bf909c-3bcf-45fc-860e-9f64b7b03cbe',
  state = 'completed'
WHERE id = 'dbf640b8-2f5e-4a05-8ecb-71b49aee15b0';
