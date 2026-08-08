-- Playoff final standings: populate the win/loss + game record columns, and
-- fix the placement tie caused by unplayed double-elimination reset matches.
--
-- Two defects in _do_finalize_bracket_standings as shipped by
-- 20260717154931_4444905a-67fb-4416-bf7f-2e91791c90d6.sql:
--
--  1. Only (team_id, bracket_id, placement) was ever written, so
--     playoff_team_records.wins/losses/game_wins/game_losses were never
--     populated and FinalStandings.tsx rendered every team as
--     "0-0 (0-0 games)".
--
--  2. The `last_match` CTE picked each participant's deepest match over ALL
--     matches in the stage, including matches that were never played. In a
--     double-elimination bracket brackets-manager always materializes the
--     grand-final RESET match (group 3, round 2). When the winners-bracket
--     champion wins grand final #1 the reset is never needed: the row still
--     exists with BOTH opponents set but NULL scores and NULL results. Both
--     finalists' "deepest match" therefore resolved to that unplayed row with
--     won = false, and rank() tied them BOTH at placement 1.
--
-- Fix: derive both the record and the elimination depth from PLAYED matches
-- only. A match counts as played when both opponent slots hold a real
-- participant (so BYE rows are excluded) AND both scores are recorded (so the
-- unplayed reset is excluded). match.status cannot be used for this — the
-- unplayed reset row already satisfies the >= 4 "resolved" guard below.
--
-- Match scores in this schema are GAMES WON within the best-of series (see
-- src/hooks/playoffs/usePlayoffMatchUpdate.ts, which passes team1GameWins /
-- team2GameWins as opponentN.score), so summing them yields game_wins and
-- game_losses directly.

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
  -- BYE slots) are ignored — they never resolve and must not block
  -- finalization. Unchanged from 20260717154931.
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
  --  * Each participant is ranked by the depth of their last PLAYED match.
  --  * "Depth" = (group_number, round_number). Later group + later round
  --    means the participant survived longer.
  --  * The champion is the only participant whose last played match is a win;
  --    everyone else lost their last played match, so `won DESC` separates
  --    champion from runner-up at equal depth.
  --  * rank() produces 1, 2, 3, 3, 5, 5, 5, 5 style placements for teams
  --    eliminated in the same round (semis tie at 3, quarters at 5, etc.).
  --  * A participant with zero played matches (bye-only degenerate bracket)
  --    falls back to depth (-1, -1) / won = false so they sort last but still
  --    receive a placement row instead of disappearing from the standings.
  --    The coalesce() calls are load-bearing: `ORDER BY ... DESC` is
  --    NULLS FIRST in Postgres, so an un-coalesced NULL depth would rank a
  --    bye-only participant *first*.
  WITH matches AS (
    SELECT m.opponent1_id, m.opponent2_id,
           m.opponent1_score, m.opponent2_score,
           m.opponent1_result, m.opponent2_result,
           g.number AS group_number,
           r.number AS round_number,
           (    m.opponent1_id    IS NOT NULL
            AND m.opponent2_id    IS NOT NULL
            AND m.opponent1_score IS NOT NULL
            AND m.opponent2_score IS NOT NULL) AS played
      FROM public.match m
      JOIN public.round  r ON r.id = m.round_id
      JOIN public.group  g ON g.id = m.group_id
     WHERE m.stage_id = v_stage_id
  ),
  -- One row per (participant, match slot) for EVERY match the participant
  -- appears in — played or not — so bye-only participants still surface.
  -- `won` prefers the explicit brackets-manager result and falls back to the
  -- score comparison, matching src/hooks/brackets/transformBracketData.ts.
  participant_matches AS (
    SELECT m.opponent1_id AS pid,
           m.group_number,
           m.round_number,
           m.played,
           coalesce(m.opponent1_score, 0) AS own_score,
           coalesce(m.opponent2_score, 0) AS opp_score,
           CASE
             WHEN m.opponent1_result = 'win' THEN true
             WHEN m.opponent2_result = 'win' THEN false
             ELSE coalesce(m.opponent1_score, 0) > coalesce(m.opponent2_score, 0)
           END AS won
      FROM matches m
     WHERE m.opponent1_id IS NOT NULL
    UNION ALL
    SELECT m.opponent2_id,
           m.group_number,
           m.round_number,
           m.played,
           coalesce(m.opponent2_score, 0),
           coalesce(m.opponent1_score, 0),
           CASE
             WHEN m.opponent2_result = 'win' THEN true
             WHEN m.opponent1_result = 'win' THEN false
             ELSE coalesce(m.opponent2_score, 0) > coalesce(m.opponent1_score, 0)
           END
      FROM matches m
     WHERE m.opponent2_id IS NOT NULL
  ),
  bracket_participants AS (
    SELECT DISTINCT pm.pid FROM participant_matches pm
  ),
  -- Records over played matches only: BYEs and never-contested rows (the
  -- unplayed grand-final reset) contribute nothing.
  records AS (
    SELECT pm.pid,
           count(*) FILTER (WHERE pm.won IS TRUE)     AS wins,
           count(*) FILTER (WHERE pm.won IS NOT TRUE) AS losses,
           coalesce(sum(pm.own_score), 0)             AS game_wins,
           coalesce(sum(pm.opp_score), 0)             AS game_losses
      FROM participant_matches pm
     WHERE pm.played
     GROUP BY pm.pid
  ),
  last_played AS (
    SELECT DISTINCT ON (pm.pid)
           pm.pid, pm.group_number, pm.round_number, pm.won
      FROM participant_matches pm
     WHERE pm.played
     ORDER BY pm.pid, pm.group_number DESC, pm.round_number DESC, pm.won DESC
  ),
  ranked AS (
    SELECT p.team_id,
           rank() OVER (
             ORDER BY coalesce(lp.group_number, -1) DESC,
                      coalesce(lp.round_number, -1) DESC,
                      coalesce(lp.won, false)       DESC
           ) AS placement,
           coalesce(rc.wins, 0)        AS wins,
           coalesce(rc.losses, 0)      AS losses,
           coalesce(rc.game_wins, 0)   AS game_wins,
           coalesce(rc.game_losses, 0) AS game_losses
      FROM bracket_participants bp
      JOIN public.participant p ON p.id = bp.pid
      LEFT JOIN last_played lp ON lp.pid = bp.pid
      LEFT JOIN records     rc ON rc.pid = bp.pid
     WHERE p.team_id IS NOT NULL
  ),
  -- Defensive: playoff_team_records is unique on (team_id, bracket_id). If a
  -- bracket ever has two participant rows pointing at the same team, an
  -- ungrouped INSERT would abort with "ON CONFLICT DO UPDATE command cannot
  -- affect row a second time" — which, on the trigger path, would roll back
  -- the bracket completion itself. Collapse to one row per team: best
  -- (lowest) placement, combined record.
  by_team AS (
    SELECT team_id,
           min(placement)::integer   AS placement,
           sum(wins)::integer        AS wins,
           sum(losses)::integer      AS losses,
           sum(game_wins)::integer   AS game_wins,
           sum(game_losses)::integer AS game_losses
      FROM ranked
     GROUP BY team_id
  ),
  upsert AS (
    INSERT INTO public.playoff_team_records
      (team_id, bracket_id, placement, wins, losses, game_wins, game_losses,
       inserted_at, updated_at)
    SELECT team_id, p_bracket_id, placement, wins, losses, game_wins, game_losses,
           now(), now()
      FROM by_team
    ON CONFLICT (team_id, bracket_id)
    DO UPDATE SET placement   = EXCLUDED.placement,
                  wins        = EXCLUDED.wins,
                  losses      = EXCLUDED.losses,
                  game_wins   = EXCLUDED.game_wins,
                  game_losses = EXCLUDED.game_losses,
                  updated_at  = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_written FROM upsert;

  RETURN v_written;
END;
$$;

-- Unchanged posture from 20260717154931: definer-rights, pinned search_path,
-- not granted to any role directly. CREATE OR REPLACE preserves ACLs, but
-- re-asserting keeps this file self-describing.
REVOKE ALL ON FUNCTION public._do_finalize_bracket_standings(uuid) FROM PUBLIC;

-- One-time repair. Every bracket already completed under the old function has
-- placement-only rows (rendered as 0-0 in the UI), and every completed
-- double-elimination bracket whose reset match went unplayed has two teams
-- tied at placement 1. Re-run the finalizer for each of them. The function is
-- idempotent, so this is safe on an already-repaired database and a no-op on a
-- fresh CI database (no completed brackets exist there).
--
-- Per-bracket exception handling: one malformed legacy bracket must not abort
-- the migration. Brackets that still have unresolved matches simply return 0
-- and keep whatever rows they have.
DO $$
DECLARE
  r          record;
  v_rows     integer;
  v_brackets integer := 0;
  v_total    integer := 0;
  v_skipped  integer := 0;
BEGIN
  FOR r IN
    SELECT b.id, b.title
      FROM public.brackets b
     WHERE b.state = 'completed'
       AND coalesce(b.uses_brackets_manager, false)
     ORDER BY b.created_at
  LOOP
    BEGIN
      v_rows := public._do_finalize_bracket_standings(r.id);
      v_brackets := v_brackets + 1;
      v_total := v_total + coalesce(v_rows, 0);
      IF coalesce(v_rows, 0) = 0 THEN
        v_skipped := v_skipped + 1;
        RAISE NOTICE 'finalize backfill: bracket % (%) wrote 0 rows (no stage, or unresolved matches)',
          r.id, r.title;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
      RAISE WARNING 'finalize backfill: bracket % (%) failed: %', r.id, r.title, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'finalize backfill: % bracket(s) processed, % record row(s) written, % skipped/failed',
    v_brackets, v_total, v_skipped;
END $$;
