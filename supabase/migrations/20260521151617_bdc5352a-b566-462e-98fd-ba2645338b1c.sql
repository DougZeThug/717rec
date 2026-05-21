-- Harden SECURITY DEFINER function exposure to the anon role.
-- Most SECURITY DEFINER functions in this project intentionally power the
-- public-facing read-only site (badges, power scores, blind-draw counts,
-- head-to-head, season metadata) and MUST remain anon-executable.
-- Helpers used inside RLS policies bound to the {public} role
-- (current_user_is_admin, user_is_team_member, is_team_opted_out_active)
-- must also stay anon-executable or policy evaluation will fail with
-- "permission denied for function" for logged-out visitors.
--
-- The only function that is unambiguously user-scoped, not referenced
-- by any RLS policy and not called from frontend/edge-function code is
-- public.user_belongs_to_team(uuid). Revoke anon EXECUTE on it.
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_team(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_team(uuid) FROM PUBLIC;