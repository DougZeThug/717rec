\set ON_ERROR_STOP on

-- Pins which database guards opt their message in to being shown to a user.
--
-- The client sanitises database errors, because a raw Postgres message can name
-- tables, constraints and RLS policies. `USING HINT = 'user-visible'` is the
-- opt-in that lets a guard written for a person through -- see
-- getUIErrorMessage in src/utils/errorHandler.ts.
--
-- Both halves matter. If a marked guard loses its hint, a scorer goes back to
-- reading "Something went wrong" instead of why the match will not finalise.
-- If an internal message gains one, implementation detail starts leaking.
--
-- Uses strpos on dollar-quoted literals rather than LIKE: several of these
-- messages contain a literal %, which LIKE would treat as a wildcard and match
-- against a different guard's hint further down the same function.

BEGIN;

DO $$
DECLARE
  v_def  text;
  v_hint text;
BEGIN
  -- ── Marked: written for a league member to read ────────────────────────────

  v_def := pg_get_functiondef('public.finalize_live_match(uuid)'::regprocedure);

  IF strpos(v_def, $q$'Not authorized to finalize this match' USING HINT = 'user-visible'$q$) = 0 THEN
    RAISE EXCEPTION 'finalize_live_match: authorization guard lost its user-visible hint';
  END IF;
  IF strpos(v_def, $q$'Match is missing team assignments' USING HINT = 'user-visible'$q$) = 0 THEN
    RAISE EXCEPTION 'finalize_live_match: team-assignment guard lost its user-visible hint';
  END IF;
  IF strpos(
       v_def,
       $q$'Match is not decided yet (game wins: % - %)', v_t1_wins, v_t2_wins USING HINT = 'user-visible'$q$
     ) = 0 THEN
    RAISE EXCEPTION 'finalize_live_match: not-decided guard lost its user-visible hint';
  END IF;

  -- Not marked: this one names a match id, so it stays hidden. Asserted by
  -- finding the raise terminated immediately, with no USING clause.
  IF strpos(v_def, $q$'Match not found: %', p_match_id;$q$) = 0 THEN
    RAISE EXCEPTION
      'finalize_live_match: the not-found message must stay unmarked -- it names an id';
  END IF;

  v_def := pg_get_functiondef('public.validate_match_rounds_row()'::regprocedure);

  IF strpos(v_def, $q$'Thrower does not play for team 1 of this match' USING HINT = 'user-visible'$q$) = 0 THEN
    RAISE EXCEPTION 'validate_match_rounds_row: team 1 guard lost its user-visible hint';
  END IF;
  IF strpos(v_def, $q$'Thrower does not play for team 2 of this match' USING HINT = 'user-visible'$q$) = 0 THEN
    RAISE EXCEPTION 'validate_match_rounds_row: team 2 guard lost its user-visible hint';
  END IF;

  v_def := pg_get_functiondef('public.validate_game_players_row()'::regprocedure);

  IF strpos(v_def, $q$'Team is not part of this match' USING HINT = 'user-visible'$q$) = 0 THEN
    RAISE EXCEPTION 'validate_game_players_row: guard lost its user-visible hint';
  END IF;

  v_def := pg_get_functiondef('public.validate_membership_approval()'::regprocedure);

  IF strpos(v_def, $q$'Cannot approve own membership' USING HINT = 'user-visible'$q$) = 0 THEN
    RAISE EXCEPTION 'validate_membership_approval: self-approval guard lost its user-visible hint';
  END IF;

  -- Not marked: developer diagnostics about how the row was built.
  IF strpos(v_def, $q$'approved_by must be an admin';$q$) = 0 THEN
    RAISE EXCEPTION 'validate_membership_approval: internal message must stay unmarked';
  END IF;
  IF strpos(v_def, $q$'approved_by is required when approving membership';$q$) = 0 THEN
    RAISE EXCEPTION 'validate_membership_approval: internal message must stay unmarked';
  END IF;

  -- ── The mechanism itself: a hint survives to the client ────────────────────

  BEGIN
    RAISE EXCEPTION 'probe' USING HINT = 'user-visible';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint IS DISTINCT FROM 'user-visible' THEN
      RAISE EXCEPTION 'USING HINT did not survive: got %', COALESCE(v_hint, '<null>');
    END IF;
  END;

  RAISE NOTICE 'user_visible_error_hints: OK';
END $$;

ROLLBACK;
