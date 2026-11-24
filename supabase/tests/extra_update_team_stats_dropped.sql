\set ON_ERROR_STOP on

-- The two extra live-only overloads of update_team_stats are gone, and the real
-- 4-argument function is still there
-- (20261123180000_drop_extra_update_team_stats_overloads.sql).
--
-- Cases:
--   1 no function named update_team_stats exists in public with a number of
--     arguments other than 4 (checked by NAME and argument count, so a hidden
--     overload fails the test too)
--   2 update_team_stats(uuid, uuid, integer, integer) still exists
--   3 reverse_team_stats still exists

BEGIN;

DO $test$
DECLARE
  v_found integer;
BEGIN
  -- Case 1: no extra overload.
  SELECT count(*) INTO v_found
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'update_team_stats'
    AND p.pronargs <> 4;
  IF v_found <> 0 THEN
    RAISE EXCEPTION 'expected no extra update_team_stats overload, found %', v_found;
  END IF;

  -- Case 2: the 4-argument function is still there.
  IF to_regprocedure('public.update_team_stats(uuid, uuid, integer, integer)') IS NULL THEN
    RAISE EXCEPTION 'update_team_stats(uuid, uuid, integer, integer) should still exist';
  END IF;

  -- Case 3: reverse_team_stats is still there.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'reverse_team_stats'
  ) THEN
    RAISE EXCEPTION 'reverse_team_stats should still exist';
  END IF;

  RAISE NOTICE 'extra_update_team_stats_dropped smoke test passed';
END $test$;

ROLLBACK;
