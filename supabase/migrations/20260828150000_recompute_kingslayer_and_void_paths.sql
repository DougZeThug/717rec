-- Follow-up to B-32: make King Slayer self-healing, and re-run the badge checks
-- when a result is taken away.
--
-- Every badge check but one recomputes from a team's whole season history, so it
-- corrects itself. King Slayer was the exception: award_kingslayer_badge() judged
-- one specific pairing, so nothing could re-derive it. Two consequences:
--
--   * Voiding a result left the badge behind. Marking a match a tie or reopening
--     it cleared the winner, but the King Slayer that win earned stayed.
--   * Order decided the outcome. The badge is one per team per season, and the
--     function revokes when the gap is under threshold -- so a later narrow win
--     silently revoked a badge an earlier giant-killing had earned.
--
-- recompute_kingslayer_badge() replaces the pairing judgement with the same
-- history scan every other check uses: look at all of this team's wins this
-- season, take the best qualifying one, and revoke if none qualifies. Both
-- problems disappear, and every check in the rulebook is now team-scoped.
--
-- award_kingslayer_badge() is left in place. It is still correct for a single
-- pairing and is referenced by earlier migrations.

-- The King Slayer rules, unchanged, applied across a team's whole season:
-- the opponent must be from a tougher division (a higher division weight) and
-- must be at least 25 career power score above this team.
CREATE OR REPLACE FUNCTION public.recompute_kingslayer_badge(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_threshold        numeric := 25;   -- same threshold as award_kingslayer_badge
  v_season_id        uuid;
  v_my_weight        numeric;
  v_my_score         numeric;
  v_opponent_id      uuid;
  v_opponent_weight  numeric;
  v_gap              numeric;
BEGIN
  SELECT id INTO v_season_id FROM public.seasons WHERE is_active = true LIMIT 1;
  IF v_season_id IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'message', 'No active season');
  END IF;

  SELECT d.division_weight INTO v_my_weight
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE t.id = p_team_id;

  -- No division data means the cross-division rule cannot be judged either way,
  -- so leave whatever badge exists alone -- as award_kingslayer_badge() did.
  IF v_my_weight IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'message', 'Division data not available');
  END IF;

  v_my_score := public.calculate_career_power_score(p_team_id);

  -- The best giant-killing this team has this season, if any.
  WITH beaten AS (
    SELECT DISTINCT opp.id AS opponent_id, od.division_weight AS opponent_weight
    FROM public.matches m
    JOIN public.teams opp    ON opp.id = m.loser_id
    JOIN public.divisions od ON od.id = opp.division_id
    WHERE m.season_id = v_season_id
      AND m.iscompleted = true
      AND m.winner_id = p_team_id
      AND od.division_weight > v_my_weight    -- a tougher division
  ), scored AS (
    SELECT b.opponent_id, b.opponent_weight,
           public.calculate_career_power_score(b.opponent_id) - v_my_score AS gap
    FROM beaten b
  )
  SELECT s.opponent_id, s.opponent_weight, s.gap
    INTO v_opponent_id, v_opponent_weight, v_gap
  FROM scored s
  ORDER BY s.gap DESC
  LIMIT 1;

  IF v_opponent_id IS NULL OR v_gap < v_threshold THEN
    UPDATE public.team_badge_events
    SET is_active = false
    WHERE team_id = p_team_id
      AND badge_type = 'king_slayer'
      AND season_id = v_season_id
      AND is_active = true;

    RETURN jsonb_build_object('awarded', false,
                              'career_score_gap', COALESCE(v_gap, 0));
  END IF;

  -- Metadata keys match award_kingslayer_badge() so the tooltip reads the same.
  INSERT INTO public.team_badge_events (team_id, badge_type, season_id, metadata)
  VALUES (p_team_id, 'king_slayer', v_season_id,
          jsonb_build_object(
            'career_score_gap',          v_gap,
            'winner_career_score',       v_my_score,
            'loser_career_score',        v_my_score + v_gap,
            'opponent_division_weight',  v_opponent_weight,
            'winner_division_weight',    v_my_weight
          ))
  ON CONFLICT (team_id, badge_type, season_id) DO UPDATE
    SET is_active  = true,
        awarded_at = now(),
        metadata   = EXCLUDED.metadata;

  RETURN jsonb_build_object('awarded', true,
                            'career_score_gap', v_gap,
                            'opponent_id', v_opponent_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.recompute_kingslayer_badge(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_kingslayer_badge(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recompute_kingslayer_badge(uuid) FROM authenticated;


-- ---------------------------------------------------------------------------
-- The rulebook, now that every check is a team-scoped recompute.
-- ---------------------------------------------------------------------------
--
-- Three things change from 20260828120000:
--
--   * King Slayer is recomputed per team rather than judged per pairing, so it
--     joins the other checks and no longer depends on which match triggered it.
--   * Clutch Performer and Consistent Performer run for both teams, not just the
--     winner. Both count from history and both revoke when the count falls, so
--     running them for one team only meant a stale badge survived on the other.
--   * A match with no result is no longer skipped. Every check reads the team's
--     history rather than this match, so running them after a result is taken
--     away is exactly what reopening or voiding a match needs.
CREATE OR REPLACE FUNCTION public.process_all_match_badges(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  -- Every check recomputes from the team's whole season history, so each is
  -- correct for both teams whatever the result was -- a win, a loss, a tie, or
  -- a result that has just been taken away.
  c_checks constant text[] := ARRAY[
    'award_streak_badges',
    'award_ice_cold_badge',
    'award_broom_crew_badge',
    'award_gatekeeper_badge',
    'award_chaos_agent_badge',
    'award_bully_badge',
    'award_clutch_performer_badge',
    'award_consistent_performer_badge',
    'recompute_kingslayer_badge'
  ];
  v_team1_id  uuid;
  v_team2_id  uuid;
  v_team      uuid;
  v_fn        text;
  v_ran       integer := 0;
  v_errors    jsonb := '[]'::jsonb;
  v_sqlstate  text;
  v_message   text;
BEGIN
  SELECT m.team1_id, m.team2_id
    INTO v_team1_id, v_team2_id
  FROM public.matches m
  WHERE m.id = p_match_id;

  -- Unknown match id: report it, never raise. Raising here would abort the
  -- caller's transaction and undo a result that was correctly saved.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'match_not_found',
                              'match_id', p_match_id, 'checks_run', 0, 'errors', v_errors);
  END IF;

  IF v_team1_id IS NULL OR v_team2_id IS NULL THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'match_missing_teams',
                              'match_id', p_match_id, 'checks_run', 0, 'errors', v_errors);
  END IF;

  -- Each check is trapped on its own. A trapped exception rolls back only that
  -- block's implicit subtransaction, so a failing badge check can never roll
  -- back the result the caller just saved, and never stops the rest running.
  FOREACH v_team IN ARRAY ARRAY[v_team1_id, v_team2_id] LOOP
    FOREACH v_fn IN ARRAY c_checks LOOP
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

  RETURN jsonb_build_object(
    'processed',  true,
    'match_id',   p_match_id,
    'checks_run', v_ran,          -- 18: nine checks for each of the two teams
    'errors',     v_errors
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.process_all_match_badges(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_all_match_badges(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_all_match_badges(uuid) FROM authenticated;


-- ---------------------------------------------------------------------------
-- mark_match_as_tie -- voids a result, clearing the winner
-- Restated verbatim from the live definition, with the badge call added.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_match_as_tie(p_match_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_winner_id uuid;
  v_loser_id uuid;
  v_team1_id uuid;
  v_team1_game_wins integer;
  v_team2_game_wins integer;
  v_winner_gw integer;
  v_loser_gw integer;
  v_winner_rows integer;
  v_loser_rows integer;
BEGIN
  -- Require admin
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Lock row and get current state
  SELECT winner_id, loser_id, team1_id, team1_game_wins, team2_game_wins
  INTO v_winner_id, v_loser_id, v_team1_id, v_team1_game_wins, v_team2_game_wins
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  -- Already a tie (idempotent)
  IF v_winner_id IS NULL THEN
    RETURN false;
  END IF;

  -- Determine winner/loser game wins based on which team was the winner
  IF v_winner_id = v_team1_id THEN
    v_winner_gw := COALESCE(v_team1_game_wins, 0);
    v_loser_gw := COALESCE(v_team2_game_wins, 0);
  ELSE
    v_winner_gw := COALESCE(v_team2_game_wins, 0);
    v_loser_gw := COALESCE(v_team1_game_wins, 0);
  END IF;

  -- Reverse winner stats (inline, same logic as reverse_team_stats)
  UPDATE public.teams
  SET
    wins = GREATEST(0, COALESCE(wins, 0) - 1),
    game_wins = GREATEST(0, COALESCE(game_wins, 0) - v_winner_gw),
    game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_loser_gw)
  WHERE id = v_winner_id;
  GET DIAGNOSTICS v_winner_rows = ROW_COUNT;

  -- Reverse loser stats
  UPDATE public.teams
  SET
    losses = GREATEST(0, COALESCE(losses, 0) - 1),
    game_wins = GREATEST(0, COALESCE(game_wins, 0) - v_loser_gw),
    game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_winner_gw)
  WHERE id = v_loser_id;
  GET DIAGNOSTICS v_loser_rows = ROW_COUNT;

  IF (v_winner_rows + v_loser_rows) <> 2 THEN
    RAISE EXCEPTION 'Expected to update 2 teams but updated % rows', (v_winner_rows + v_loser_rows);
  END IF;

  -- Clear winner/loser on match
  UPDATE public.matches
  SET winner_id = NULL, loser_id = NULL
  WHERE id = p_match_id;

  -- Refresh season stats
  PERFORM public.upsert_team_season_stats();
  -- Taking a result away changes both teams' badge patterns, so recompute them.
  PERFORM public.process_all_match_badges(p_match_id);

  RETURN true;
END;
$function$;


-- ---------------------------------------------------------------------------
-- reopen_live_match -- puts a finalised match back into play
-- Restated verbatim from the live definition, with the badge call added.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reopen_live_match(p_match_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_winner_id uuid;
  v_loser_id uuid;
  v_team1_id uuid;
  v_t1_gw integer;
  v_t2_gw integer;
  v_winner_gw integer;
  v_loser_gw integer;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT winner_id, loser_id, team1_id,
         COALESCE(team1_game_wins, 0), COALESCE(team2_game_wins, 0)
  INTO v_winner_id, v_loser_id, v_team1_id, v_t1_gw, v_t2_gw
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF v_winner_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_winner_id = v_team1_id THEN
    v_winner_gw := v_t1_gw; v_loser_gw := v_t2_gw;
  ELSE
    v_winner_gw := v_t2_gw; v_loser_gw := v_t1_gw;
  END IF;

  UPDATE public.teams
  SET wins = GREATEST(0, COALESCE(wins, 0) - 1),
      game_wins = GREATEST(0, COALESCE(game_wins, 0) - v_winner_gw),
      game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_loser_gw)
  WHERE id = v_winner_id;

  UPDATE public.teams
  SET losses = GREATEST(0, COALESCE(losses, 0) - 1),
      game_wins = GREATEST(0, COALESCE(game_wins, 0) - v_loser_gw),
      game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_winner_gw)
  WHERE id = v_loser_id;

  UPDATE public.matches
  SET winner_id = NULL,
      loser_id = NULL,
      iscompleted = false,
      team1_score = 0,
      team2_score = 0
  WHERE id = p_match_id;

  PERFORM public.upsert_team_season_stats();
  -- Taking a result away changes both teams' badge patterns, so recompute them.
  PERFORM public.process_all_match_badges(p_match_id);

  RETURN true;
END;
$function$;
