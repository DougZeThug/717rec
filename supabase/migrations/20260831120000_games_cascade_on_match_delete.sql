-- ============================================================
-- Let a live-scored match be deleted, and its season archived
-- ============================================================
--
-- WHY
--   games.match_id was created in the baseline as a plain
--   FOREIGN KEY (match_id) REFERENCES public.matches(id) with no ON DELETE
--   action, so it defaults to NO ACTION. Nothing in the app or in any RPC ever
--   deletes a games row. Two paths delete matches, and both therefore fail with
--   23503 on any match that was scored live:
--
--     1. delete_match_with_stats_reversal (20260608142313) runs a bare
--        DELETE FROM public.matches WHERE id = p_match_id. This is the bin on a
--        row in the admin Scores tool - "reverse and remove". On a live-scored
--        match it raises and the admin is told the delete failed.
--
--     2. archive_season and partial_archive_season copy a season's finished
--        matches into matches_archive and then
--        DELETE FROM public.matches WHERE season_id = ... AND iscompleted = true.
--        A season containing one live-scored finished match cannot be archived
--        at all: the whole RPC rolls back.
--
--   match_rounds already cascades on both match_id and game_id
--   (20260708120000_live_scoring.sql), and game_players cascades on game_id, so
--   games is the only link in the chain that blocks the delete.
--
-- SCOPE
--   Re-creates the one constraint with ON DELETE CASCADE. No data is changed by
--   this migration and no other constraint is touched. Re-running is safe.
--
-- WHAT THIS DELETES, ONCE IT WORKS
--   Deleting a match now takes its games, its rounds and its game-players with
--   it. That is what "delete this match" already means to the admin pressing the
--   bin, and what archiving already does to the match row itself - only the
--   match-level summary is kept, in matches_archive.
--
--   No per-round history that the app can still show is lost. v_player_match_stats
--   and v_player_season_stats are built by joining public.matches, which
--   archiving empties for that season, so an archived season's round-level
--   player statistics are already unreachable today.
-- ============================================================

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
