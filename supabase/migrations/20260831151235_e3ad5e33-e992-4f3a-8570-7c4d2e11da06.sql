ALTER TABLE public.games
  DROP CONSTRAINT IF EXISTS games_match_id_fkey;

ALTER TABLE public.games
  ADD CONSTRAINT games_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT games_match_id_fkey ON public.games IS
  'Cascades so deleting a match (the admin Scores bin, or archive_season '
  'clearing a finished season) also removes its live-scoring games, and through '
  'them its rounds and game-players. Without the cascade both paths fail with '
  '23503 on any match that was scored live.';