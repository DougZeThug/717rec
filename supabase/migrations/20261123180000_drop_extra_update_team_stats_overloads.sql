SET lock_timeout = '5s';

-- Clean-up: drop 2 extra overloads of update_team_stats that only exist on live.
--
-- Why this file exists. The live database has three functions named
-- update_team_stats. Only one of them is in the repo migrations and is used:
-- update_team_stats(uuid, uuid, integer, integer). It is SECURITY DEFINER and only
-- the service role can run it. The other two were made outside the repo
-- migrations (Doug's live check, 2026-11-23). No code calls them: not src/, not
-- supabase/functions/, and supabase/tests/score_stats_business_logic.sql only calls
-- the 4-argument form. Doug approved dropping them on 2026-11-23.
--
-- What goes (schema public, exact argument types):
--   update_team_stats()
--       An empty stub. Its whole body is the comment "-- Function logic here".
--   update_team_stats(team_id uuid)
--       RETURNS void, SECURITY INVOKER. It recounts the wins and losses of ONE team
--       from the completed matches.
--   Both are executable by PUBLIC, anon, authenticated and service_role. Nothing
--   in the app uses that. This file does not claim to close a security hole: it
--   removes two unused functions.
--
-- What stays. These are LIVE and are not touched: update_team_stats(uuid, uuid,
-- integer, integer) (the 4-argument one), reverse_team_stats and every other
-- function. The 4-argument function is a different overload, so DROP with the
-- exact arguments below cannot touch it.
--
-- No CASCADE. Both DROPs are plain. If something unknown still depends on one of
-- them, that DROP fails with an error and nothing is dropped.
--
-- One block, all or nothing. Both drops run inside one DO block, so they succeed
-- together or neither happens.
--
-- Historical impact: none. No season, match, player or stat row is read or
-- changed.
--
-- A merged migration does NOT reach production. Production is unchanged until
-- Doug applies this file by hand. Steps (backup first, then apply, then check):
-- docs/OPERATIONS.md section 6j. After he applies it, regenerate
-- src/integrations/supabase/types.ts, because the function list changes.
--
-- Idempotent: both DROPs use IF EXISTS, so a second run changes nothing.
--
-- Revert: DROP cannot be undone from this file. Before applying, Doug saves the
-- two definitions with the backup query in docs/OPERATIONS.md section 6j. As a
-- fallback, these are the definitions as read on live on 2026-11-23:
--
--   CREATE OR REPLACE FUNCTION public.update_team_stats()
--   RETURNS void
--   LANGUAGE plpgsql
--   SET search_path TO 'public'
--   AS $function$
--   BEGIN
--     -- Function logic here
--   END;
--   $function$;
--
--   CREATE OR REPLACE FUNCTION public.update_team_stats(team_id uuid)
--   RETURNS void
--   LANGUAGE plpgsql
--   SET search_path TO 'public'
--   AS $function$
--   BEGIN
--     UPDATE teams SET
--       wins = (SELECT count(*) FROM matches WHERE iscompleted = true AND winner_id = team_id),
--       losses = (SELECT count(*) FROM matches WHERE iscompleted = true AND loser_id = team_id)
--     WHERE id = team_id;
--   END;
--   $function$;
--
-- (The exact text of the saved definitions wins over this copy.) The grants on
-- both were {=X, postgres, anon, authenticated, service_role}. To put them back:
--   GRANT EXECUTE ON FUNCTION public.update_team_stats() TO PUBLIC, anon, authenticated, service_role;
--   GRANT EXECUTE ON FUNCTION public.update_team_stats(uuid) TO PUBLIC, anon, authenticated, service_role;

DO $mig$
BEGIN
  DROP FUNCTION IF EXISTS public.update_team_stats();
  DROP FUNCTION IF EXISTS public.update_team_stats(uuid);
END
$mig$;

RESET lock_timeout;
