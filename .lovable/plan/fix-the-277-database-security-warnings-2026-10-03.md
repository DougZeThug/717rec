# Fix the 277 database security warnings

## What the warnings are

The database check found 277 warnings in 5 groups:

1. **11 warnings — old backup tables with no access rules.** Leftovers from the power-score rebuild (power_score backups, pre-unification team stats). Decision: **delete them**.
2. **77 + 84 warnings — GraphQL API exposure.** The app does not use GraphQL. The same data is already public by design through the normal data API (standings, teams, stats). Decision: **document as accepted, no change**.
3. **34 warnings — anyone on the internet can run certain database functions.** Some are needed by public pages (team badges, head-to-head, season info). Others are internal tools that should never be public (match deletion, bracket finalizing, admin audit).
4. **71 warnings — any signed-in user can run certain database functions.** Many are internal-only: badge awarding, admin power-score tools, season archiving, trigger helpers.

## Changes

### 1. Delete the 11 backup tables (one migration)

Drop: `power_score_floor_ddl_backup`, `power_score_rollout_ddl_backup`, `team_details_power_pre_unification`, `team_details_pre_career_split`, `team_details_pre_floor_adjustment`, `team_details_pre_power_rollout`, `team_season_stats_pre_career_split`, `team_season_stats_pre_division_history`, `team_season_stats_pre_floor_adjustment`, `team_season_stats_pre_power_rollout`, `team_season_stats_pre_unification`.

Check first that no code or docs reference them; update any doc that does.

### 2. Lock down internal functions (one migration)

Revoke public access (`anon`) from internal functions that no public page calls, e.g. `_do_finalize_bracket_standings`, `audit_admin_mutation`, `delete_match_with_stats_reversal`, `finalize_live_match`, `finalize_bracket_standings`, `prevent_member_competitive_field_updates`, `prevent_team_membership_reassignment`, `enforce_message_identity`, `enforce_message_author_identity`.

Keep public access on functions the public pages really call: `get_team_badges`, `get_all_team_badges`, `get_season_badges`, `get_batch_head_to_head`, `get_opponent_match_history`, `get_blind_draw_signup_count`, `get_participants`, `get_season_team_power_scores`, `get_season_week_number`, `is_team_opted_out_active`, `current_user_is_admin`.

Revoke signed-in access (`authenticated`) from internal-only functions: `admin_*` power-score tools, `award_*` badge functions, `archive_season`, `partial_archive_season`, `activate_season_with_partial_archive`, trigger helpers (`handle_new_user`, `handle_message_update`, `log_*`, `prevent_*`, `insert_participant`, `check_rate_limit`, `cleanup_orphaned_team_season_stat`).

Before each revoke, grep `src/` to confirm the app never calls that function from the client. Anything the client calls keeps its access.

### 3. Document the accepted warnings

Add a short section to `docs/RLS_NOTES.md`: the GraphQL warnings (161) are accepted because the app does not use GraphQL and the same data is public by design; list which functions stay public on purpose and why.

## Verification

- Re-run the database security check; the count must drop from 277 to about 161 (only the accepted GraphQL group remains).
- Run the focused test gates (auth, MCP, validation) plus the page tests.
- Open public pages (Standings, Teams, Schedule, History) in the preview to confirm public data still loads.
- Type check and lint clean.

## Technical notes

- All database changes go through the migration tool; no direct SQL edits.
- `REVOKE EXECUTE ON FUNCTION public.<name>(...) FROM anon;` / `FROM authenticated;` — signatures must match the live function arguments exactly.
- Backup tables are dropped with `DROP TABLE IF EXISTS ... ;` (destructive — approval prompt expected).
- No app behaviour change for visitors or signed-in users; only internal access paths are closed.
