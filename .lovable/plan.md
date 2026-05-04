## Plan: Lock down SECURITY DEFINER function execute permissions

### Background

Lints `0028` (anon) and `0029` (authenticated) flag every `SECURITY DEFINER` function in the `public` schema as callable by anon and signed-in users. There are ~50 such functions. Some genuinely need broad EXECUTE (RLS helpers, public data lookups), some are admin-only mutations that just happen to have admin checks **inside** the body (defense-in-depth would also revoke EXECUTE from anon), and some are pure trigger/internal helpers that should not be callable from any client at all.

RLS still gates row access, and the admin-gated functions all check `current_user_is_admin()` before doing anything, so this is a hardening pass — not a bug fix. The goal is to reduce attack surface and drop the lint count.

### Categorization (50 SECURITY DEFINER functions)

**A. Internal-only — revoke EXECUTE from `anon`, `authenticated`, and `PUBLIC`** (triggers, helper functions never called via `supabase.rpc`):
- `trg_set_timestamp`, `handle_new_user`, `handle_message_update`
- `prevent_admin_privilege_escalation`, `prevent_admin_privilege_escalation_on_insert`
- `log_admin_privilege_change`, `log_security_operation`
- `validate_membership_approval`
- `sync_match_delete_to_playoff_matches`, `sync_match_insert_to_playoff_matches`, `sync_match_update_to_playoff_matches`
- `trigger_cleanup_team_season_stats_on_match_delete`, `trigger_cleanup_team_season_stats_on_playoff_delete`
- `fn_update_playoff_record`
- `cleanup_orphaned_team_season_stat`
- `insert_participant`

Triggers run as the table owner regardless of grants, so revoking EXECUTE doesn't break them.

**B. Admin-only RPCs — revoke from `anon`, keep `authenticated`** (called from admin UI, all have `current_user_is_admin()` check inside or are only called by admin-gated callers):
- Season/playoffs: `activate_season`, `activate_season_with_partial_archive`, `archive_season`, `partial_archive_season`, `finalize_playoffs`
- Match admin: `approve_match_result`, `mark_match_as_tie`, `update_team_stats`, `reverse_team_stats`, `upsert_team_season_stats`
- Seeds: `auto_assign_seeds`, `batch_update_team_seeds`, `reset_division_seeds`, `validate_division_seeds`
- Badges (admin-triggered backfills): all `award_*_badge` (12 fns), `award_streak_badges`, `process_match_badges`
- Stats helpers used by admin tools: `calculate_career_power_score`, `calculate_team_streak`

**C. Public read-only helpers — keep EXECUTE for both `anon` and `authenticated`** (used by public pages and/or RLS policies):
- RLS-critical: `current_user_is_admin`, `user_is_team_member`, `user_belongs_to_team`
- Public data: `get_batch_head_to_head`, `get_opponent_match_history`, `get_team_badges`, `get_all_team_badges`, `get_season_badges`, `get_season_team_power_scores`, `get_participants`, `get_season_week_number`, `get_blind_draw_signup_count`, `get_head_to_head_records`

(`get_all_team_badges`, `get_season_badges`, `get_season_team_power_scores` look read-only and are likely called by public stats pages — keeping them broadly executable is consistent with the public-data posture.)

### Migration

```sql
-- A. Internal-only: revoke from everyone except postgres/service_role
REVOKE EXECUTE ON FUNCTION
  public.trg_set_timestamp(),
  public.handle_new_user(),
  public.handle_message_update(),
  public.prevent_admin_privilege_escalation(),
  public.prevent_admin_privilege_escalation_on_insert(),
  public.log_admin_privilege_change(),
  public.log_security_operation(text, text, uuid, jsonb, jsonb),
  public.validate_membership_approval(),
  public.sync_match_delete_to_playoff_matches(),
  public.sync_match_insert_to_playoff_matches(),
  public.sync_match_update_to_playoff_matches(),
  public.trigger_cleanup_team_season_stats_on_match_delete(),
  public.trigger_cleanup_team_season_stats_on_playoff_delete(),
  public.fn_update_playoff_record(),
  public.cleanup_orphaned_team_season_stat(uuid, uuid),
  public.insert_participant(uuid, uuid, integer)
FROM anon, authenticated, PUBLIC;

-- B. Admin-only: revoke from anon (and PUBLIC), keep authenticated
REVOKE EXECUTE ON FUNCTION
  public.activate_season(uuid),
  public.activate_season_with_partial_archive(uuid),
  public.archive_season(uuid, uuid, uuid, uuid),
  public.partial_archive_season(uuid),
  public.finalize_playoffs(uuid, uuid, uuid, uuid),
  public.approve_match_result(uuid, uuid, uuid, integer, integer),
  public.mark_match_as_tie(uuid),
  public.update_team_stats(uuid, uuid, integer, integer),
  public.reverse_team_stats(uuid, uuid, integer, integer),
  public.upsert_team_season_stats(),
  public.auto_assign_seeds(uuid),
  public.batch_update_team_seeds(jsonb),
  public.reset_division_seeds(uuid),
  public.validate_division_seeds(uuid),
  public.award_broom_crew_badge(uuid),
  public.award_bully_badge(uuid),
  public.award_chaos_agent_badge(uuid),
  public.award_clutch_performer_badge(uuid),
  public.award_consistent_performer_badge(uuid),
  public.award_gatekeeper_badge(uuid),
  public.award_ice_cold_badge(uuid),
  public.award_kingslayer_badge(uuid, uuid),
  public.award_streak_badges(uuid),
  public.process_match_badges(uuid, uuid),
  public.calculate_career_power_score(uuid),
  public.calculate_team_streak(uuid)
FROM anon, PUBLIC;
```

(Argument signatures verified against `pg_get_function_identity_arguments` output.)

### Then ignore remaining findings + update memory

After the migration, the remaining `0028`/`0029` exposures will be the legitimate public read helpers (group C). Mark the lint findings as **ignored** with a clear rationale and update the security memory so future scans understand which functions are intentionally public.

### What I will NOT do
- Will not change function bodies or switch any to `SECURITY INVOKER` (would break RLS callers like `current_user_is_admin`).
- Will not revoke EXECUTE from `service_role` or `postgres` — edge functions and the migration owner must keep access.
- Will not touch any RLS policies or `src/integrations/supabase/types.ts`.

### Verification
- Re-run `supabase--linter`: `0028` count should drop from current ~50 to ~10 (group C); `0029` should drop from ~50 to ~38 (group A revoked).
- Smoke test: load homepage (anon), team detail (anon), admin score entry (authenticated admin), season activate flow (authenticated admin).
