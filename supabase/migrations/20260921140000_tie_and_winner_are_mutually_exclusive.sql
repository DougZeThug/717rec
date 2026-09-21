-- Make confirming a tie and naming a winner mutually exclusive.
--
-- An admin can press "Alpha won" and "It was a tie" on the same unresolved match
-- before either write lands. Both writes were guarded, but each only against
-- itself:
--
--   approve_match_result   UPDATE ... WHERE id = $1 AND winner_id IS NULL
--   confirmMatchTie        UPDATE ... WHERE id = $1 AND winner_id IS NULL
--
-- So the tie-then-winner order still got through. The tie write leaves
-- winner_id NULL, which is exactly what the approve guard tests, so the approve
-- then succeeded and the row ended up with a winner AND a tie_confirmed_at
-- stamp. Standings and streaks read winner_id, so the league counted a decisive
-- win on a match the admin had been told was recorded as a tie.
--
-- The fix is symmetry: the winner write also refuses a match that already
-- carries the tie stamp. The condition lives in the UPDATE's own WHERE clause,
-- not in a check before it, so there is no window between testing and writing.
--
-- This blocks no legitimate correction. reopen_live_match drops
-- tie_confirmed_at and tie_confirmed_by (20260916120000), so an admin who
-- decides a confirmed tie really had a winner reopens the match first, which
-- clears the stamp, and can then name the winner.
--
-- Everything else about the function is unchanged: the admin gate, the team
-- validations, the counter updates, the season-stats refresh and the badge
-- processing are all as they were.
CREATE OR REPLACE FUNCTION public.approve_match_result(p_match_id uuid, p_winner_id uuid, p_loser_id uuid, p_winner_game_wins integer DEFAULT 0, p_loser_game_wins integer DEFAULT 0)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_rows integer;
  v_winner_rows integer;
  v_loser_rows integer;
BEGIN
  -- Require admin
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Idempotent, and mutually exclusive with a confirmed tie. Both conditions
  -- are in this statement rather than in a check above it, so a tie confirmed
  -- between the two could not slip past.
  UPDATE public.matches
  SET winner_id = p_winner_id, loser_id = p_loser_id
  WHERE id = p_match_id
    AND winner_id IS NULL
    AND metadata->>'tie_confirmed_at' IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    -- Nothing was written. Read the row back only to choose the wording: the
    -- UPDATE above is the guard, so this read cannot reopen the race.
    IF EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = p_match_id AND metadata->>'tie_confirmed_at' IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'This match is already recorded as a tie. Reopen it before naming a winner.'
        USING HINT = 'user-visible';
    END IF;
    RETURN false; -- already approved or match not found, as before
  END IF;

  -- Validate teams exist
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_winner_id) THEN
    RAISE EXCEPTION 'Winner team not found: %', p_winner_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_loser_id) THEN
    RAISE EXCEPTION 'Loser team not found: %', p_loser_id;
  END IF;

  -- Update winner stats (inline, same logic as update_team_stats)
  UPDATE public.teams
  SET
    wins = COALESCE(wins, 0) + 1,
    game_wins = COALESCE(game_wins, 0) + COALESCE(p_winner_game_wins, 0),
    game_losses = COALESCE(game_losses, 0) + COALESCE(p_loser_game_wins, 0)
  WHERE id = p_winner_id;
  GET DIAGNOSTICS v_winner_rows = ROW_COUNT;

  -- Update loser stats
  UPDATE public.teams
  SET
    losses = COALESCE(losses, 0) + 1,
    game_wins = COALESCE(game_wins, 0) + COALESCE(p_loser_game_wins, 0),
    game_losses = COALESCE(game_losses, 0) + COALESCE(p_winner_game_wins, 0)
  WHERE id = p_loser_id;
  GET DIAGNOSTICS v_loser_rows = ROW_COUNT;

  IF (v_winner_rows + v_loser_rows) <> 2 THEN
    RAISE EXCEPTION 'Expected to update 2 teams but updated % rows', (v_winner_rows + v_loser_rows);
  END IF;

  -- Refresh season stats
  PERFORM public.upsert_team_season_stats();
  -- B-32: award badges in the same transaction as the result.
  PERFORM public.process_all_match_badges(p_match_id);

  RETURN true;
END;
$function$;
