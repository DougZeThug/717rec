-- B-32: badges were awarded on one result path and not the others.
--
-- Badge processing used to live entirely in the browser: matchDatabaseUtils.ts
-- fired fourteen sequential RPCs after a score was reported. A match finalised
-- through live scoring never went near that code, so it earned no badges at all,
-- and closing the tab part-way through a reported score silently lost the rest.
--
-- This installs one shared rulebook in the database and calls it from every path
-- that results a match, so all three award the same badges, in the same
-- transaction as the result itself.

-- One shared badge rulebook for every path that results a match.
--
-- Each check is trapped on its own. A trapped exception rolls back only that
-- BEGIN/EXCEPTION block's implicit subtransaction, so a failing badge check can
-- never roll back the match result the caller just saved, and never stops the
-- remaining checks from running.
CREATE OR REPLACE FUNCTION public.process_all_match_badges(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  -- Team-scoped checks. Each recomputes from that team's whole season history,
  -- so they are self-healing and correct to run for both teams on any result,
  -- a tie included. award_streak_badges is what process_match_badges() ran.
  c_team_checks constant text[] := ARRAY[
    'award_streak_badges',
    'award_ice_cold_badge',
    'award_broom_crew_badge',
    'award_gatekeeper_badge',
    'award_chaos_agent_badge',
    'award_bully_badge'
  ];
  -- Winner-scoped, single argument. award_clutch_performer_badge counts 2-1 wins
  -- from history itself, so the client's "only call this on a 2-1" gate is
  -- deliberately not reproduced -- dropping it lets the function's own ELSE
  -- branch revoke a stale badge, which the gate used to prevent.
  c_winner_checks constant text[] := ARRAY[
    'award_clutch_performer_badge',
    'award_consistent_performer_badge'
  ];
  v_team1_id  uuid;
  v_team2_id  uuid;
  v_winner_id uuid;
  v_loser_id  uuid;
  v_completed boolean;
  v_team      uuid;
  v_fn        text;
  v_ran       integer := 0;
  v_errors    jsonb := '[]'::jsonb;
  v_sqlstate  text;
  v_message   text;
BEGIN
  SELECT m.team1_id, m.team2_id, m.winner_id, m.loser_id, COALESCE(m.iscompleted, false)
    INTO v_team1_id, v_team2_id, v_winner_id, v_loser_id, v_completed
  FROM public.matches m
  WHERE m.id = p_match_id;

  -- Unknown match id: report it, never raise. Raising here would abort the
  -- caller's transaction and undo a result that was correctly saved.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'match_not_found',
                              'match_id', p_match_id, 'checks_run', 0, 'errors', v_errors);
  END IF;

  -- No result yet: nothing to award, and the checks would read a half-written
  -- match.
  IF NOT v_completed OR v_team1_id IS NULL OR v_team2_id IS NULL THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'match_not_completed',
                              'match_id', p_match_id, 'checks_run', 0, 'errors', v_errors);
  END IF;

  FOREACH v_team IN ARRAY ARRAY[v_team1_id, v_team2_id] LOOP
    FOREACH v_fn IN ARRAY c_team_checks LOOP
      BEGIN
        EXECUTE format('SELECT public.%I($1)', v_fn) USING v_team;
        v_ran := v_ran + 1;
      EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
        v_errors := v_errors || jsonb_build_object(
          'check', v_fn, 'team_id', v_team, 'sqlstate', v_sqlstate, 'message', v_message);
      END;
    END LOOP;
  END LOOP;

  -- A tie is a completed match with no winner: mark_match_as_tie() clears
  -- winner_id and loser_id but leaves iscompleted true. The team-scoped checks
  -- above still ran for both teams, because a tie changes those patterns. The
  -- winner-scoped checks are skipped rather than passed NULLs.
  IF v_winner_id IS NOT NULL THEN
    FOREACH v_fn IN ARRAY c_winner_checks LOOP
      BEGIN
        EXECUTE format('SELECT public.%I($1)', v_fn) USING v_winner_id;
        v_ran := v_ran + 1;
      EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
        v_errors := v_errors || jsonb_build_object(
          'check', v_fn, 'team_id', v_winner_id, 'sqlstate', v_sqlstate, 'message', v_message);
      END;
    END LOOP;

    IF v_loser_id IS NOT NULL THEN
      BEGIN
        PERFORM public.award_kingslayer_badge(v_winner_id, v_loser_id);
        v_ran := v_ran + 1;
      EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
        v_errors := v_errors || jsonb_build_object(
          'check', 'award_kingslayer_badge', 'team_id', v_winner_id,
          'sqlstate', v_sqlstate, 'message', v_message);
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'processed',     true,
    'match_id',      p_match_id,
    'winner_scoped', v_winner_id IS NOT NULL,
    'checks_run',    v_ran,          -- 15 for a decided match, 12 for a tie
    'errors',        v_errors
  );
END;
$function$;

-- Called only by the result routines below, never by a client.
REVOKE EXECUTE ON FUNCTION public.process_all_match_badges(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_all_match_badges(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_all_match_badges(uuid) FROM authenticated;


-- ---------------------------------------------------------------------------
-- finalize_live_match -- the live-scoring path (B-32's headline case)
-- Restated verbatim from the live definition, with the badge call added.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_live_match(p_match_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_match record;
  v_t1_wins integer;
  v_t2_wins integer;
  v_winner uuid;
  v_loser uuid;
  v_winner_gw integer;
  v_loser_gw integer;
  v_rows integer;
BEGIN
  IF NOT (
    public.current_user_is_admin() OR EXISTS (
      SELECT 1
      FROM public.matches m
      JOIN public.team_memberships tm
        ON tm.team_id IN (m.team1_id, m.team2_id)
      WHERE m.id = p_match_id
        AND tm.user_id = (SELECT auth.uid())
        AND tm.is_approved = true
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to finalize this match';
  END IF;

  SELECT id, team1_id, team2_id, winner_id, iscompleted
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF v_match.id IS NULL THEN
    RAISE EXCEPTION 'Match not found: %', p_match_id;
  END IF;

  IF v_match.team1_id IS NULL OR v_match.team2_id IS NULL THEN
    RAISE EXCEPTION 'Match is missing team assignments';
  END IF;

  IF v_match.winner_id IS NOT NULL OR COALESCE(v_match.iscompleted, false) THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'already_completed');
  END IF;

  SELECT
    count(*) FILTER (WHERE winner_team_id = v_match.team1_id),
    count(*) FILTER (WHERE winner_team_id = v_match.team2_id)
  INTO v_t1_wins, v_t2_wins
  FROM public.games
  WHERE match_id = p_match_id AND status = 'completed';

  IF GREATEST(v_t1_wins, v_t2_wins) < 2 THEN
    RAISE EXCEPTION 'Match is not decided yet (game wins: % - %)', v_t1_wins, v_t2_wins;
  END IF;

  IF v_t1_wins > v_t2_wins THEN
    v_winner := v_match.team1_id; v_loser := v_match.team2_id;
    v_winner_gw := v_t1_wins;     v_loser_gw := v_t2_wins;
  ELSE
    v_winner := v_match.team2_id; v_loser := v_match.team1_id;
    v_winner_gw := v_t2_wins;     v_loser_gw := v_t1_wins;
  END IF;

  UPDATE public.matches
  SET team1_score = CASE WHEN v_winner = team1_id THEN 1 ELSE 0 END,
      team2_score = CASE WHEN v_winner = team2_id THEN 1 ELSE 0 END,
      team1_game_wins = v_t1_wins,
      team2_game_wins = v_t2_wins,
      winner_id = v_winner,
      loser_id = v_loser,
      iscompleted = true
  WHERE id = p_match_id AND winner_id IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'already_completed');
  END IF;

  UPDATE public.teams
  SET wins = COALESCE(wins, 0) + 1,
      game_wins = COALESCE(game_wins, 0) + v_winner_gw,
      game_losses = COALESCE(game_losses, 0) + v_loser_gw
  WHERE id = v_winner;

  UPDATE public.teams
  SET losses = COALESCE(losses, 0) + 1,
      game_wins = COALESCE(game_wins, 0) + v_loser_gw,
      game_losses = COALESCE(game_losses, 0) + v_winner_gw
  WHERE id = v_loser;

  PERFORM public.upsert_team_season_stats();
  -- B-32: award badges in the same transaction as the result.
  PERFORM public.process_all_match_badges(p_match_id);

  RETURN jsonb_build_object(
    'applied', true,
    'winner_id', v_winner,
    'team1_game_wins', v_t1_wins,
    'team2_game_wins', v_t2_wins
  );
END;
$function$;


-- ---------------------------------------------------------------------------
-- approve_match_result -- approving a submitted score report
-- Restated verbatim from the live definition, with the badge call added.
-- ---------------------------------------------------------------------------
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

  -- Idempotent: only update if not already approved
  UPDATE public.matches
  SET winner_id = p_winner_id, loser_id = p_loser_id
  WHERE id = p_match_id AND winner_id IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN false; -- already approved or match not found
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


-- ---------------------------------------------------------------------------
-- resubmit_match_result -- the ordinary reported-score path
-- Restated verbatim from the live definition, with the badge call added.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resubmit_match_result(p_match_id uuid, p_winner_id uuid, p_loser_id uuid, p_winner_game_wins integer, p_loser_game_wins integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_team1_id uuid;
  v_team2_id uuid;
  v_prev_winner uuid;
  v_prev_loser uuid;
  v_prev_completed boolean;
  v_prev_t1_gw integer;
  v_prev_t2_gw integer;
  v_prev_t1_score integer;
  v_prev_t2_score integer;
  v_prev_winner_gw integer;
  v_prev_loser_gw integer;
  v_new_t1_score integer;
  v_new_t2_score integer;
  v_new_t1_gw integer;
  v_new_t2_gw integer;
  v_reversed boolean := false;
  v_winner_rows integer;
  v_loser_rows integer;
BEGIN
  -- Require admin
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_winner_id IS NULL OR p_loser_id IS NULL THEN
    RAISE EXCEPTION 'Winner and loser required';
  END IF;
  IF p_winner_id = p_loser_id THEN
    RAISE EXCEPTION 'Winner and loser must be different teams';
  END IF;

  -- Lock the match row
  SELECT team1_id, team2_id, winner_id, loser_id, iscompleted,
         team1_game_wins, team2_game_wins, team1_score, team2_score
    INTO v_team1_id, v_team2_id, v_prev_winner, v_prev_loser, v_prev_completed,
         v_prev_t1_gw, v_prev_t2_gw, v_prev_t1_score, v_prev_t2_score
    FROM public.matches
    WHERE id = p_match_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found: %', p_match_id;
  END IF;

  IF v_team1_id IS NULL OR v_team2_id IS NULL THEN
    RAISE EXCEPTION 'Match % is missing team IDs', p_match_id;
  END IF;

  -- Validate winner/loser are the match's two teams
  IF NOT ((p_winner_id = v_team1_id AND p_loser_id = v_team2_id)
       OR (p_winner_id = v_team2_id AND p_loser_id = v_team1_id)) THEN
    RAISE EXCEPTION 'Winner/loser (% / %) do not match teams (% / %)',
      p_winner_id, p_loser_id, v_team1_id, v_team2_id;
  END IF;

  -- Compute new per-team fields relative to team1/team2 slots
  IF p_winner_id = v_team1_id THEN
    v_new_t1_score := 1;
    v_new_t2_score := 0;
    v_new_t1_gw := COALESCE(p_winner_game_wins, 0);
    v_new_t2_gw := COALESCE(p_loser_game_wins, 0);
  ELSE
    v_new_t1_score := 0;
    v_new_t2_score := 1;
    v_new_t1_gw := COALESCE(p_loser_game_wins, 0);
    v_new_t2_gw := COALESCE(p_winner_game_wins, 0);
  END IF;

  -- Idempotency: exact same completed result already stored -> no-op
  IF v_prev_completed IS TRUE
     AND v_prev_winner = p_winner_id
     AND v_prev_loser  = p_loser_id
     AND COALESCE(v_prev_t1_gw, 0) = v_new_t1_gw
     AND COALESCE(v_prev_t2_gw, 0) = v_new_t2_gw
     AND COALESCE(v_prev_t1_score, 0) = v_new_t1_score
     AND COALESCE(v_prev_t2_score, 0) = v_new_t2_score THEN
    -- Re-saving an identical result changes nothing, but the browser used to
    -- run the badge checks here anyway. Keep that: it is how an admin forces a
    -- badge recompute, and the checks are recomputes, so it is safe.
  -- B-32: award badges in the same transaction as the result.
  PERFORM public.process_all_match_badges(p_match_id);
    RETURN jsonb_build_object(
      'applied', false,
      'reversed_previous', false,
      'previous_winner_id', v_prev_winner
    );
  END IF;

  -- Reverse prior counters if match was previously completed with a winner
  IF v_prev_winner IS NOT NULL AND v_prev_loser IS NOT NULL THEN
    IF v_prev_winner = v_team1_id THEN
      v_prev_winner_gw := COALESCE(v_prev_t1_gw, 0);
      v_prev_loser_gw  := COALESCE(v_prev_t2_gw, 0);
    ELSE
      v_prev_winner_gw := COALESCE(v_prev_t2_gw, 0);
      v_prev_loser_gw  := COALESCE(v_prev_t1_gw, 0);
    END IF;

    UPDATE public.teams
      SET wins        = GREATEST(0, COALESCE(wins, 0) - 1),
          game_wins   = GREATEST(0, COALESCE(game_wins, 0) - v_prev_winner_gw),
          game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_prev_loser_gw)
      WHERE id = v_prev_winner;

    UPDATE public.teams
      SET losses      = GREATEST(0, COALESCE(losses, 0) - 1),
          game_wins   = GREATEST(0, COALESCE(game_wins, 0) - v_prev_loser_gw),
          game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_prev_winner_gw)
      WHERE id = v_prev_loser;

    v_reversed := true;
  END IF;

  -- Write the new match result
  UPDATE public.matches
     SET winner_id        = p_winner_id,
         loser_id         = p_loser_id,
         team1_score      = v_new_t1_score,
         team2_score      = v_new_t2_score,
         team1_game_wins  = v_new_t1_gw,
         team2_game_wins  = v_new_t2_gw,
         iscompleted      = true
     WHERE id = p_match_id;

  -- Apply new counters
  UPDATE public.teams
    SET wins        = COALESCE(wins, 0) + 1,
        game_wins   = COALESCE(game_wins, 0) + COALESCE(p_winner_game_wins, 0),
        game_losses = COALESCE(game_losses, 0) + COALESCE(p_loser_game_wins, 0)
    WHERE id = p_winner_id;
  GET DIAGNOSTICS v_winner_rows = ROW_COUNT;

  UPDATE public.teams
    SET losses      = COALESCE(losses, 0) + 1,
        game_wins   = COALESCE(game_wins, 0) + COALESCE(p_loser_game_wins, 0),
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

  RETURN jsonb_build_object(
    'applied', true,
    'reversed_previous', v_reversed,
    'previous_winner_id', v_prev_winner
  );
END;
$function$;
