
-- PR-06: Server-side finalization of playoff bracket standings.
-- Ports the client-side BracketStandingsService ordering rules to SQL,
-- and fires automatically on the bracket state -> 'completed' transition.

-- Inner worker: computes and upserts placements. Does not check caller.
-- Not granted to any role directly; only reachable via the trigger below
-- (which runs SECURITY DEFINER as the function owner) or via the public
-- RPC wrapper which enforces admin-only.
CREATE OR REPLACE FUNCTION public._do_finalize_bracket_standings(p_bracket_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_stage_id       integer;
  v_unresolved     integer;
  v_written        integer := 0;
BEGIN
  -- Highest-numbered stage for this bracket is the "final" stage
  SELECT s.id
    INTO v_stage_id
    FROM public.stage s
   WHERE s.tournament_id = p_bracket_id
   ORDER BY s.number DESC
   LIMIT 1;

  IF v_stage_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Refuse to finalize if any match is still unresolved (brackets-manager
  -- status < 4 == Completed). Matches with both opponents NULL (unpopulated
  -- BYE slots) are ignored — they never resolve and must not block finalization.
  SELECT count(*)
    INTO v_unresolved
    FROM public.match m
   WHERE m.stage_id = v_stage_id
     AND coalesce(m.status, 0) < 4
     AND NOT (m.opponent1_id IS NULL AND m.opponent2_id IS NULL);

  IF v_unresolved > 0 THEN
    RETURN 0;
  END IF;

  -- Placement algorithm (mirrors brackets-manager finalStandings ordering):
  --  * Each participant is ranked by the depth of their last played match.
  --  * "Depth" = (group_number, round_number). Later group + later round
  --    means the participant survived longer.
  --  * The champion is the only participant whose last match is a win;
  --    everyone else lost their last match. Ordering ties by `won DESC`
  --    places the champion above the runner-up when both share the final
  --    match's depth (grand final in DE, final in SE).
  --  * rank() produces 1, 2, 3, 3, 5, 5, 5, 5 style placements for teams
  --    eliminated in the same round (semis tie at 3, quarters at 5, etc.).
  WITH matches AS (
    SELECT m.id, m.opponent1_id, m.opponent2_id,
           m.opponent1_score, m.opponent2_score,
           g.number AS group_number,
           r.number AS round_number
      FROM public.match m
      JOIN public.round  r ON r.id = m.round_id
      JOIN public.group  g ON g.id = m.group_id
     WHERE m.stage_id = v_stage_id
  ),
  participant_matches AS (
    SELECT opponent1_id AS pid, group_number, round_number,
           (coalesce(opponent1_score,0) > coalesce(opponent2_score,0)) AS won
      FROM matches WHERE opponent1_id IS NOT NULL
    UNION ALL
    SELECT opponent2_id, group_number, round_number,
           (coalesce(opponent2_score,0) > coalesce(opponent1_score,0)) AS won
      FROM matches WHERE opponent2_id IS NOT NULL
  ),
  last_match AS (
    SELECT DISTINCT ON (pid) pid, group_number, round_number, won
      FROM participant_matches
     ORDER BY pid, group_number DESC, round_number DESC
  ),
  ranked AS (
    SELECT p.team_id,
           rank() OVER (
             ORDER BY lm.group_number DESC, lm.round_number DESC, lm.won DESC
           ) AS placement
      FROM last_match lm
      JOIN public.participant p ON p.id = lm.pid
     WHERE p.team_id IS NOT NULL
  ),
  upsert AS (
    INSERT INTO public.playoff_team_records (team_id, bracket_id, placement)
    SELECT team_id, p_bracket_id, placement FROM ranked
    ON CONFLICT (team_id, bracket_id)
    DO UPDATE SET placement = EXCLUDED.placement, updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_written FROM upsert;

  RETURN v_written;
END;
$$;

REVOKE ALL ON FUNCTION public._do_finalize_bracket_standings(uuid) FROM PUBLIC;

-- Public RPC: admin-only manual re-run for repair. Trigger uses inner helper.
CREATE OR REPLACE FUNCTION public.finalize_bracket_standings(p_bracket_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Only admins can finalize bracket standings'
      USING ERRCODE = '42501';
  END IF;
  RETURN public._do_finalize_bracket_standings(p_bracket_id);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_bracket_standings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_bracket_standings(uuid) TO authenticated, service_role;

-- Trigger: fire when bracket transitions to 'completed'.
CREATE OR REPLACE FUNCTION public.tg_finalize_bracket_standings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
BEGIN
  IF NEW.state = 'completed'
     AND (OLD.state IS DISTINCT FROM 'completed')
     AND coalesce(NEW.uses_brackets_manager, false) THEN
    PERFORM public._do_finalize_bracket_standings(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finalize_bracket_standings ON public.brackets;
CREATE TRIGGER trg_finalize_bracket_standings
AFTER UPDATE ON public.brackets
FOR EACH ROW
EXECUTE FUNCTION public.tg_finalize_bracket_standings();

-- Tighten client write policies on playoff_team_records: the client no longer
-- writes this table. Admins keep DELETE for repair; INSERT/UPDATE flow through
-- the SECURITY DEFINER finalization function only.
DROP POLICY IF EXISTS "Admins can insert playoff team records" ON public.playoff_team_records;
DROP POLICY IF EXISTS "Admins can update playoff team records" ON public.playoff_team_records;
