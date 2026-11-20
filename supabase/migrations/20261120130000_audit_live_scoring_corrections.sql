-- Audit trail for live-scoring corrections: who undid a round, edited or
-- deleted a round, reopened a game, changed a winner or deleted a game.
--
-- Before this, nothing recorded those actions. match_rounds and games are not
-- covered by the admin audit triggers (20260701120000): audit_admin_mutation()
-- skips every non-admin, it is shared by about 17 tables, and a scorer's undo of
-- a round or reopen of a game is exactly what Doug needs to find later ("who
-- removed round 3 of the Tuesday final?"). This migration adds a second, narrow
-- trigger function for the two live-scoring tables. It does not touch
-- audit_admin_mutation() or admin_audit_coverage_drift().
--
-- What is written: one row in security_audit_log (the existing table, written by
-- the existing log_security_operation()). user_id is auth.uid(), created_at is
-- the time, old_values is the whole row before, new_values the whole row after
-- (NULL for a delete). The action says what happened, so it can be filtered:
--   live_round_update  an admin edit of a round that really changed the row
--   live_round_delete  a round was deleted (a scorer's undo, or an admin delete)
--   live_game_change   a COMPLETED game was changed (a reopen, or an admin
--                      winner or score change)
--   live_game_delete   a game was deleted
--
-- Decisions:
--   * ANY signed-in actor is logged, scorers too (Doug, 2026-11-20). A scorer's
--     undo is the correction nobody else can see. current_user_is_admin() is NOT
--     used. auth.uid() IS NULL (cron, service role, the SQL editor) is skipped:
--     there is nobody to name.
--   * Never INSERT. A round is inserted on every round; that is volume, not a
--     correction. A game's normal finish (in_progress -> completed) is not a
--     correction either.
--   * match_rounds UPDATE is logged only when the row really changed, ignoring
--     updated_at. The admin Edit Round dialog always sends both scores, so a save
--     that changes nothing must not write a row. (match_rounds has no updated_at
--     today; the guard is for the day it gets one.)
--   * games UPDATE is logged only when the OLD row is 'completed' (a WHEN clause
--     on the trigger, so the function is not even called for the rest) and
--     something other than updated_at changed. That catches a reopen by a scorer
--     or an admin and an admin setting the winner of a completed game. It leaves
--     out the normal finish (the OLD status is in_progress) and the touch trigger
--     (20261120120000), which only writes updated_at of in-progress games.
--   * A WHEN clause cannot read NEW on a DELETE, so games has two triggers
--     (_upd and _del). The function never reads NEW on a DELETE.
--   * Failure-safe. The WHOLE body sits in one block with EXCEPTION WHEN others.
--     If the audit write fails (a full disk, a constraint, a lock), the change the
--     scorer made still lands and Postgres only prints a WARNING. Scoring never
--     fails because of the audit.
--   * Cascades. Deleting a game or a match cascades to match_rounds (and a match
--     to games), and each cascaded row fires the AFTER trigger. The function skips
--     those: a round whose game or match is already gone, and a game whose match
--     is already gone, are not logged. The match or game delete is the event.
--     supabase/tests/live_scoring_audit_triggers.sql proves it with a match that
--     holds 2 games and 3 rounds (0 live_* rows). A direct game delete logs ONE
--     live_game_delete row, not one per round.
--   * SECURITY DEFINER with a pinned search_path: a scorer cannot write
--     security_audit_log (RLS denies it), and the CI check
--     security_definer_search_path.sql requires the pin. EXECUTE is revoked from
--     PUBLIC, anon and authenticated: only the trigger machinery calls it.
--
-- Residual gaps, on purpose:
--   * An edit in the SQL editor (or by the service role) is not logged: no
--     auth.uid(), nobody to name.
--   * An admin edit of the winner of an IN-PROGRESS game is not logged: games
--     UPDATE logging is limited to completed games.
--   * Match-level actions (reopen_live_match, finalize, a match delete) are not
--     audited here: public.matches has no audit trigger today. A match delete
--     shows up only as the absence of its rounds and games.
--   * There is no screen. Read it with SQL (docs/OPERATIONS.md section 6).
--   * Cascade skipping is by lookup: if a future foreign key stops cascading, the
--     lookup still decides row by row, so nothing breaks, but re-run the test.
--
-- Takes a brief lock on match_rounds and games (DROP TRIGGER needs ACCESS
-- EXCLUSIVE). Apply when no game is being scored; see OPERATIONS.md section 6.
--
-- Idempotent: CREATE OR REPLACE for the functions, DROP TRIGGER IF EXISTS before
-- CREATE TRIGGER. No data is written when this migration runs. No backfill.
--
-- ROLLBACK (rows already written stay in security_audit_log):
--   DROP TRIGGER IF EXISTS audit_live_scoring_correction ON public.match_rounds;
--   DROP TRIGGER IF EXISTS audit_live_scoring_correction_upd ON public.games;
--   DROP TRIGGER IF EXISTS audit_live_scoring_correction_del ON public.games;
--   DROP FUNCTION IF EXISTS public.audit_live_scoring_correction();
--   DROP FUNCTION IF EXISTS public.live_scoring_audit_coverage_drift();

CREATE OR REPLACE FUNCTION public.audit_live_scoring_correction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_action text;
  v_new jsonb := NULL;
BEGIN
  -- Cron, service role and the SQL editor have no auth.uid(): nobody to name.
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  IF TG_TABLE_NAME = 'match_rounds' THEN
    IF TG_OP = 'DELETE' THEN
      -- A cascade from a game or match delete: the parent is already gone.
      IF NOT EXISTS (SELECT 1 FROM public.games g WHERE g.id = OLD.game_id)
         OR NOT EXISTS (SELECT 1 FROM public.matches m WHERE m.id = OLD.match_id) THEN
        RETURN NULL;
      END IF;
      v_action := 'live_round_delete';
    ELSE
      -- A save that re-sends the same values is not a correction.
      IF (to_jsonb(OLD) - 'updated_at') IS NOT DISTINCT FROM (to_jsonb(NEW) - 'updated_at') THEN
        RETURN NULL;
      END IF;
      v_action := 'live_round_update';
      v_new := to_jsonb(NEW);
    END IF;
  ELSIF TG_TABLE_NAME = 'games' THEN
    IF TG_OP = 'DELETE' THEN
      -- A cascade from a match delete: the match is already gone.
      IF OLD.match_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM public.matches m WHERE m.id = OLD.match_id) THEN
        RETURN NULL;
      END IF;
      v_action := 'live_game_delete';
    ELSE
      -- The trigger's WHEN clause already limits this to a completed OLD game.
      IF (to_jsonb(OLD) - 'updated_at') IS NOT DISTINCT FROM (to_jsonb(NEW) - 'updated_at') THEN
        RETURN NULL;
      END IF;
      v_action := 'live_game_change';
      v_new := to_jsonb(NEW);
    END IF;
  ELSE
    RETURN NULL;
  END IF;

  PERFORM public.log_security_operation(v_action, TG_TABLE_NAME, OLD.id, to_jsonb(OLD), v_new);

  RETURN NULL; -- AFTER trigger: the return value is ignored.
EXCEPTION WHEN others THEN
  -- Scoring must never fail because of the audit. The change still lands.
  RAISE WARNING 'audit_live_scoring_correction failed on % %: %', TG_TABLE_NAME, TG_OP, SQLERRM;
  RETURN NULL;
END;
$$;

-- Trigger helper: the client never calls it. Same pattern as
-- touch_game_on_round_change (20261120120000).
REVOKE EXECUTE ON FUNCTION public.audit_live_scoring_correction() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.audit_live_scoring_correction() IS
  'AFTER row trigger on match_rounds and games. Writes security_audit_log (live_round_update, live_round_delete, live_game_change, live_game_delete) for ANY signed-in user, scorers too. Logs a round delete or real round edit, a change to a completed game (reopen, winner) and a game delete. Never logs an INSERT, a normal game finish, a no-change save or a cascaded delete. Failure-safe: an audit error only raises a WARNING.';

DROP TRIGGER IF EXISTS audit_live_scoring_correction ON public.match_rounds;
CREATE TRIGGER audit_live_scoring_correction
  AFTER UPDATE OR DELETE
  ON public.match_rounds
  FOR EACH ROW EXECUTE FUNCTION public.audit_live_scoring_correction();

DROP TRIGGER IF EXISTS audit_live_scoring_correction_upd ON public.games;
CREATE TRIGGER audit_live_scoring_correction_upd
  AFTER UPDATE
  ON public.games
  FOR EACH ROW
  WHEN (OLD.status = 'completed')
  EXECUTE FUNCTION public.audit_live_scoring_correction();

DROP TRIGGER IF EXISTS audit_live_scoring_correction_del ON public.games;
CREATE TRIGGER audit_live_scoring_correction_del
  AFTER DELETE
  ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.audit_live_scoring_correction();

-- Drift helper for the SQL smoke test (and for Doug after the hand-apply):
-- one row per problem, no rows when all is well. Own function: it does not touch
-- admin_audit_coverage_drift(). tgtype bits: 1 row, 2 BEFORE, 4 INSERT, 8 DELETE,
-- 16 UPDATE, 32 TRUNCATE; the event mask must match exactly.
CREATE OR REPLACE FUNCTION public.live_scoring_audit_coverage_drift()
RETURNS TABLE(issue text)
LANGUAGE plpgsql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_expected record;
  v_func oid := to_regproc('public.audit_live_scoring_correction');
BEGIN
  IF v_func IS NULL THEN
    issue := 'missing function public.audit_live_scoring_correction()';
    RETURN NEXT;
  ELSIF NOT (SELECT p.prosecdef FROM pg_proc p WHERE p.oid = v_func) THEN
    issue := 'public.audit_live_scoring_correction() is not SECURITY DEFINER';
    RETURN NEXT;
  END IF;

  FOR v_expected IN
    SELECT * FROM (VALUES
      ('match_rounds', 'audit_live_scoring_correction',     24, false),
      ('games',        'audit_live_scoring_correction_upd', 16, true),
      ('games',        'audit_live_scoring_correction_del',  8, false)
    ) AS e(table_name, trigger_name, event_mask, needs_when)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = v_expected.table_name
        AND tg.tgname = v_expected.trigger_name
        AND NOT tg.tgisinternal
        AND tg.tgfoid = v_func
        AND tg.tgenabled = 'O'
        AND (tg.tgtype::integer & 1) = 1                       -- row-level
        AND (tg.tgtype::integer & 2) = 0                       -- AFTER
        AND (tg.tgtype::integer & 60) = v_expected.event_mask  -- exact events, no INSERT or TRUNCATE
        AND (tg.tgqual IS NOT NULL) = v_expected.needs_when    -- the games UPDATE trigger has a WHEN
    ) THEN
      issue := format('missing or misconfigured trigger %s on public.%s',
                      v_expected.trigger_name, v_expected.table_name);
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.live_scoring_audit_coverage_drift() IS
  'Returns one row per problem with the live-scoring audit triggers (function or trigger missing, disabled, wrong events, or the games UPDATE trigger without its WHEN). No rows means all is well.';
