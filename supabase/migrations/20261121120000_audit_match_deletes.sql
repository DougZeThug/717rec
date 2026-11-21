SET lock_timeout = '5s';

-- Audit trail for match deletes: who deleted a match, and when.
--
-- Before this, a match delete left no record. The admin Scores bin calls
-- delete_match_with_stats_reversal(), which removes the row from public.matches
-- and reverses the team stats. Nothing wrote down who did it or what the match
-- held. public.matches has no audit trigger today (see the "Residual gaps" of
-- 20261120130000_audit_live_scoring_corrections.sql). This migration adds one
-- narrow AFTER DELETE trigger. It does not change delete_match_with_stats_reversal(),
-- the season archive functions, the cleanup trigger
-- cleanup_team_stats_on_match_delete, scoring or standings.
--
-- What is written: ONE row in security_audit_log (the existing table, written by
-- the existing log_security_operation()) for each deleted match:
--   action      match_delete
--   table_name  matches
--   record_id   the id of the deleted match
--   old_values  the whole match row before the delete (teams, scores, winner,
--               season, date, round, bracket, metadata)
--   new_values  NULL
--   user_id     auth.uid(), the person who deleted it. It is EMPTY (NULL) when no
--               one is signed in: the SQL editor, a cron job or the service role.
--   created_at  the time
--
-- Decisions:
--   * A delete is logged even when auth.uid() IS NULL (Doug, 2026-11-21). A delete
--     from the SQL editor is the one nobody else would see, so an empty user_id is
--     better than no row. This differs on purpose from the live-scoring audit
--     (20261120130000), which skips a caller with no auth.uid().
--   * Season archive deletes are skipped. archive_season() and
--     partial_archive_season() copy the completed matches into matches_archive
--     (same id) and then DELETE them from matches, in the same function. That is a
--     move, not a delete, so the trigger finds the id in matches_archive and
--     writes nothing. A season with 60 matches would otherwise write 60 rows.
--   * Failure-safe. The WHOLE body sits in one block with EXCEPTION WHEN others.
--     If the audit write fails (a full disk, a constraint, a lock), the delete
--     still lands and Postgres only prints a WARNING. A match delete never fails
--     because of the audit.
--   * SECURITY DEFINER with a pinned search_path: an admin cannot write
--     security_audit_log directly (RLS), log_security_operation() is revoked from
--     the client roles, and the CI check security_definer_search_path.sql requires
--     the pin. EXECUTE is revoked from PUBLIC, anon and authenticated: only the
--     trigger machinery calls the function.
--   * The trigger does not read or depend on cleanup_team_stats_on_match_delete or
--     any other trigger on matches.
--
-- What this does NOT do, on purpose:
--   * It does not keep the games and rounds of the deleted match. The foreign keys
--     cascade, so they are gone before this trigger runs (and no live_* audit row
--     is written for them). A delete cannot be restored from the log alone: it
--     holds the match row only.
--   * It does not log season archive deletes (see above).
--   * It is not tamper-proof. security_audit_log can be edited by the database
--     owner, and an admin who can run SQL can disable the trigger.
--   * It does not log the match INSERT or UPDATE, only the DELETE.
--   * There is no screen. Read it with SQL (docs/OPERATIONS.md section 6h).
--   * No backfill. Deletes made before the hand-apply are not in the log.
--
-- Hand-apply (docs/OPERATIONS.md section 6h): a merged migration does not reach
-- production. Run this file in the Supabase SQL Editor at a quiet time (no match
-- being deleted). CREATE TRIGGER takes a short lock on matches; the lock_timeout
-- above makes it give up after 5 seconds instead of waiting in line.
--
-- Idempotent: CREATE OR REPLACE for the function. The trigger is created only if
-- it is missing (no DROP TRIGGER: that takes a heavy lock on matches). No data is
-- written when this migration runs.
--
-- ROLLBACK (rows already written stay in security_audit_log):
--   DROP TRIGGER IF EXISTS audit_match_delete ON public.matches;
--   DROP FUNCTION IF EXISTS public.audit_match_delete();

CREATE OR REPLACE FUNCTION public.audit_match_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  -- A season archive moves the match into matches_archive first (same id), then
  -- deletes it from matches. That is not a delete: write nothing.
  IF EXISTS (SELECT 1 FROM public.matches_archive a WHERE a.id = OLD.id) THEN
    RETURN NULL;
  END IF;

  -- No early return when auth.uid() IS NULL: that delete is logged with an empty
  -- user_id (Doug, 2026-11-21).
  PERFORM public.log_security_operation('match_delete', 'matches', OLD.id, to_jsonb(OLD), NULL);

  RETURN NULL; -- AFTER trigger: the return value is ignored.
EXCEPTION WHEN others THEN
  -- A delete must never fail because of the audit. The delete still lands.
  RAISE WARNING 'audit_match_delete failed on matches DELETE: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Trigger helper: the client never calls it. Same pattern as
-- audit_live_scoring_correction (20261120130000).
REVOKE EXECUTE ON FUNCTION public.audit_match_delete() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.audit_match_delete() IS
  'AFTER DELETE row trigger on matches. Writes one security_audit_log row (action match_delete, record_id = the match id, old_values = the whole match row) for every match delete, also when no one is signed in (user_id empty). Skips a match that is already in matches_archive (a season archive move). Does not keep the games or rounds of the match. Failure-safe: an audit error only raises a WARNING.';

-- Create the trigger only if it is missing. No DROP TRIGGER, no CREATE OR REPLACE
-- TRIGGER: both take a heavier lock on matches than this needs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger tg
    WHERE tg.tgname = 'audit_match_delete'
      AND tg.tgrelid = 'public.matches'::regclass
      AND NOT tg.tgisinternal
  ) THEN
    CREATE TRIGGER audit_match_delete
      AFTER DELETE
      ON public.matches
      FOR EACH ROW EXECUTE FUNCTION public.audit_match_delete();
  END IF;
END $$;

RESET lock_timeout;
