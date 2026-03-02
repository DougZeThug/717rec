
-- 3 UPDATEs on existing rows
UPDATE public.playoff_matches SET
  team1_id = 'b214167b-7f7e-4470-a811-bf2a093c9620',
  team2_id = '77110b92-d2d8-495b-afed-cac65deb6253',
  team1_score = 1, team2_score = 2,
  winner_id = '77110b92-d2d8-495b-afed-cac65deb6253',
  loser_id = 'b214167b-7f7e-4470-a811-bf2a093c9620',
  best_of = 3, status = 'completed', updated_at = now()
WHERE id = '1b74e515-1db9-4f10-b498-1b5622e3a498';

UPDATE public.playoff_matches SET
  team1_id = 'ad4ec289-fd85-4322-8ebb-68647607de23',
  team2_id = '626be920-071d-4aea-a1f5-1819893215ca',
  team1_score = 2, team2_score = 0,
  winner_id = 'ad4ec289-fd85-4322-8ebb-68647607de23',
  loser_id = '626be920-071d-4aea-a1f5-1819893215ca',
  best_of = 3, status = 'completed', updated_at = now()
WHERE id = '6ae7ec84-2089-4ba0-a7f3-2d73f7ed01f3';

UPDATE public.playoff_matches SET
  team1_id = 'c9d644a4-4e5a-43a0-9805-9d93299cda35',
  team2_id = '8c5adea2-09b7-4298-83dc-295dae74fdb8',
  team1_score = 0, team2_score = 2,
  winner_id = '8c5adea2-09b7-4298-83dc-295dae74fdb8',
  loser_id = 'c9d644a4-4e5a-43a0-9805-9d93299cda35',
  best_of = 3, status = 'completed', updated_at = now()
WHERE id = 'b376b6cc-f0b5-4567-b44e-3a7c8d9e1f2a';

-- 4 INSERTs for new rounds
INSERT INTO public.playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, updated_at)
VALUES ('428f974f-7295-410d-a3d0-d1f11280c17d', 5, 1, 'losers',
  'ad4ec289-fd85-4322-8ebb-68647607de23', '8c5adea2-09b7-4298-83dc-295dae74fdb8',
  2, 0, 'ad4ec289-fd85-4322-8ebb-68647607de23', '8c5adea2-09b7-4298-83dc-295dae74fdb8',
  3, 'completed', now());

INSERT INTO public.playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, updated_at)
VALUES ('428f974f-7295-410d-a3d0-d1f11280c17d', 6, 1, 'losers',
  'b214167b-7f7e-4470-a811-bf2a093c9620', 'ad4ec289-fd85-4322-8ebb-68647607de23',
  0, 2, 'ad4ec289-fd85-4322-8ebb-68647607de23', 'b214167b-7f7e-4470-a811-bf2a093c9620',
  3, 'completed', now());

INSERT INTO public.playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, updated_at)
VALUES ('428f974f-7295-410d-a3d0-d1f11280c17d', 5, 1, 'winners',
  '77110b92-d2d8-495b-afed-cac65deb6253', 'ad4ec289-fd85-4322-8ebb-68647607de23',
  0, 2, 'ad4ec289-fd85-4322-8ebb-68647607de23', '77110b92-d2d8-495b-afed-cac65deb6253',
  3, 'completed', now());

INSERT INTO public.playoff_matches (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, best_of, status, updated_at)
VALUES ('428f974f-7295-410d-a3d0-d1f11280c17d', 6, 2, 'winners',
  '77110b92-d2d8-495b-afed-cac65deb6253', 'ad4ec289-fd85-4322-8ebb-68647607de23',
  0, 2, 'ad4ec289-fd85-4322-8ebb-68647607de23', '77110b92-d2d8-495b-afed-cac65deb6253',
  3, 'completed', now());

-- Set champion metadata
UPDATE public.brackets SET
  wb_champion_id = 'ad4ec289-fd85-4322-8ebb-68647607de23',
  state = 'completed'
WHERE id = '428f974f-7295-410d-a3d0-d1f11280c17d';
