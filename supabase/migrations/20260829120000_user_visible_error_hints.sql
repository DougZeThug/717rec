-- Mark the guards whose message a league member is meant to read.
--
-- The client sanitises database errors, because a raw Postgres message can name
-- tables, constraints and RLS policies. That also hid the guards below, which
-- are written for a person: a scorer tapping Save too early was told only
-- "Something went wrong" instead of why the match would not finalise.
--
-- `USING HINT = 'user-visible'` is the opt-in. PostgREST returns the hint and
-- getUIErrorMessage shows the message when it is present. The marker is on the
-- hint rather than a custom SQLSTATE deliberately: PostgREST derives the HTTP
-- status from SQLSTATE, and an unrecognised code turns a 400 into a 500.
--
-- Only the messages listed here are marked. Everything else stays generic, so
-- internal text such as 'Expected to delete 1 match but deleted % rows' and
-- 'Match not found: <uuid>' can never reach a user.
--
-- Each body below is copied unchanged from the migration that last defined it;
-- the only edit is the USING HINT clause.

-- ── finalize_live_match ─────────────────────────────────────────

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
    RAISE EXCEPTION 'Not authorized to finalize this match' USING HINT = 'user-visible';
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
    RAISE EXCEPTION 'Match is missing team assignments' USING HINT = 'user-visible';
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
    RAISE EXCEPTION 'Match is not decided yet (game wins: % - %)', v_t1_wins, v_t2_wins USING HINT = 'user-visible';
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

-- ── validate_match_rounds_row ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_match_rounds_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_team1 uuid;
  v_team2 uuid;
BEGIN
  SELECT m.team1_id, m.team2_id INTO v_team1, v_team2
  FROM public.matches m WHERE m.id = NEW.match_id;

  IF NEW.team1_thrower_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.team_players tp
    WHERE tp.id = NEW.team1_thrower_id AND tp.team_id = v_team1
  ) THEN
    RAISE EXCEPTION 'Thrower does not play for team 1 of this match' USING HINT = 'user-visible';
  END IF;

  IF NEW.team2_thrower_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.team_players tp
    WHERE tp.id = NEW.team2_thrower_id AND tp.team_id = v_team2
  ) THEN
    RAISE EXCEPTION 'Thrower does not play for team 2 of this match' USING HINT = 'user-visible';
  END IF;

  RETURN NEW;
END;
$$;

-- ── validate_game_players_row ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_game_players_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_team1 uuid;
  v_team2 uuid;
BEGIN
  SELECT m.team1_id, m.team2_id INTO v_team1, v_team2
  FROM public.games g
  JOIN public.matches m ON m.id = g.match_id
  WHERE g.id = NEW.game_id;

  IF NEW.team_id IS DISTINCT FROM v_team1 AND NEW.team_id IS DISTINCT FROM v_team2 THEN
    RAISE EXCEPTION 'Team is not part of this match' USING HINT = 'user-visible';
  END IF;

  RETURN NEW;
END;
$$;

-- ── validate_membership_approval ────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_membership_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_approved = true AND (OLD.is_approved = false OR OLD.is_approved IS NULL) THEN
    IF NEW.approved_by IS NULL THEN
      RAISE EXCEPTION 'approved_by is required when approving membership';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.approved_by AND is_admin = true) THEN
      RAISE EXCEPTION 'approved_by must be an admin';
    END IF;
    IF NEW.approved_by = NEW.user_id THEN
      RAISE EXCEPTION 'Cannot approve own membership' USING HINT = 'user-visible';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public';
