-- Undoing or editing a round now moves the game's updated_at.
--
-- completeGame (LiveMatchService) only finishes a game that is still
-- 'in_progress' AND whose games.updated_at equals the value the scorer's screen
-- loaded. That stops a stale phone from ending a game an admin just reopened.
-- It had one gap: undoing a round (RoundService.deleteLastRound) and an admin's
-- round edit or delete (AdminCorrectionsService.updateRound / deleteRound) write
-- only match_rounds. games.updated_at did not move, so a phone that still showed
-- "game won" could finish the game on the old totals.
--
-- This trigger closes the gap in the database, so no app code changes. When a
-- round of an in-progress game is DELETED, or its score or game is UPDATED, the
-- parent game's updated_at moves, and the stale phone's guarded write matches no
-- row and is refused.
--
-- Decisions:
--   * DELETE and UPDATE only. Not INSERT. A round is inserted on every round,
--     and a touch there would refuse the scorer's OWN last round (their screen
--     still holds the version from before the insert) and add a realtime refetch
--     for every round. A stale phone never needs an INSERT touch: rounds cannot
--     be added after the win.
--   * The UPDATE is limited to game_id, team1_score and team2_score, the columns
--     that change the totals. Editing a thrower or a bag count does not move the
--     game. net_points and winner_team are generated from the two scores.
--   * Only a game with status = 'in_progress' is touched. A completed game is
--     history and is never written here.
--   * AFTER trigger, row level. SECURITY DEFINER with a pinned search_path: a
--     scorer's own RLS must not block the touch (scorers may delete the last
--     round but have no say over what the trigger then does), and the CI check
--     security_definer_search_path.sql requires the pin. No FORCE RLS exists, so
--     the owner bypasses RLS.
--   * The write is "SET updated_at = now()". set_games_updated_at (BEFORE UPDATE
--     on games) sets the same value; it is written out so this file does not
--     depend on that trigger.
--   * A match or game delete cascades to match_rounds. The trigger then finds the
--     parent game gone (or being deleted) and updates no row. validate_games_row
--     only checks winner_team_id, which is NULL for an in-progress game, so a
--     touch cannot raise. Nothing on games writes back to match_rounds.
--
-- Residual window, not closed on purpose: fetchLiveMatchBundle reads matches,
-- games and rounds in parallel. If the rounds read lands before a committed undo
-- and the games read lands after it, a stale phone can still pass the guard. The
-- window is milliseconds and the realtime event refreshes the screen. Closing it
-- would add a request round trip to every refresh.
--
-- Idempotent: CREATE OR REPLACE for the function, DROP TRIGGER IF EXISTS before
-- CREATE TRIGGER. No data is written when this migration runs.
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS touch_game_on_round_change ON public.match_rounds;
--   DROP FUNCTION IF EXISTS public.touch_game_on_round_change();

CREATE OR REPLACE FUNCTION public.touch_game_on_round_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.games
    SET updated_at = now()
    WHERE id = NEW.game_id AND status = 'in_progress';
  END IF;

  -- A delete touches the game the round left. An update that moved the round to
  -- another game touches the old game too.
  IF TG_OP = 'DELETE'
     OR (TG_OP = 'UPDATE' AND OLD.game_id IS DISTINCT FROM NEW.game_id) THEN
    UPDATE public.games
    SET updated_at = now()
    WHERE id = OLD.game_id AND status = 'in_progress';
  END IF;

  RETURN NULL;
END;
$$;

-- Trigger helper: the client never calls it. Same pattern as
-- 20261003192751 / 20261003192832 for the other trigger functions.
REVOKE EXECUTE ON FUNCTION public.touch_game_on_round_change() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.touch_game_on_round_change() IS
  'Trigger on match_rounds. Moves games.updated_at of an in-progress game when one of its rounds is deleted or its score changes, so a stale scorer screen cannot finish the game on old totals. Not on INSERT. See completeGame in LiveMatchService.';

DROP TRIGGER IF EXISTS touch_game_on_round_change ON public.match_rounds;
CREATE TRIGGER touch_game_on_round_change
  AFTER DELETE OR UPDATE OF game_id, team1_score, team2_score
  ON public.match_rounds
  FOR EACH ROW EXECUTE FUNCTION public.touch_game_on_round_change();
