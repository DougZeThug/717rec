# Supabase SQL smoke tests

Small, dependency-free SQL scripts that assert post-migration invariants.
These now run automatically in CI via
`.github/workflows/supabase-ci.yml` (`db-apply-and-smoke` job) on every PR
that touches `supabase/**`. See `docs/SUPABASE_CI.md` for the full setup.

## Running

```bash
psql "$SUPABASE_DB_URL" -f supabase/tests/seasons_rls.sql
```

Each script uses `\set ON_ERROR_STOP on` and `RAISE EXCEPTION` on failure,
so a non-zero exit code means drift was detected.

## Current tests

- `seasons_rls.sql` — confirms the four canonical RLS policies on
  `public.seasons` are present and attached to the expected roles.
  Backed by the `public.seasons_rls_drift()` helper function.
- `migrations_apply.sql` — sanity check that core tables exist after
  the full migration set (baseline + all migrations) has been applied.
- `score_stats_business_logic.sql` — end-to-end business-rule coverage for
  score/stat RPCs: approving match results, marking ties, deleting completed
  matches with stats reversal, finalizing/reopening live matches,
  update/reverse team stat guardrails, season-stat refreshes, and scorer
  authorization for admins and approved team members.
- `season_rollover_workflow.sql` — end-to-end season rollover coverage for
  partial archive activation, active-season uniqueness, match archival, season
  stats preservation, team counter reset, playoff finalization snapshots, and
  archived-season reactivation guards.
- `blind_draw_workflow.sql` — blind draw smoke coverage for public signup
  permissions, admin-only visibility/deletion, public signup counts, settings
  updates, and clear-signups behavior. Its privilege assertions depend on
  migrated grants from `20260723143100_grant_blind_draw_workflow_privileges.sql`,
  not local `GRANT` setup in the smoke script.
- `playoff_status_mapping.sql` — asserts the match → playoff_matches sync
  triggers map every brackets-manager status correctly
  (`map_bm_status_to_playoff_status`): 3 Running → 'in_progress',
  5 Archived → 'archived', and mapped statuses on INSERT (not hardcoded
  'pending').
- `finalize_bracket_standings.sql` — covers the bracket-completion trigger and
  `_do_finalize_bracket_standings`: placements and win/loss + game records for a
  single-elimination bracket, a double-elimination bracket whose grand-final
  reset match is materialized but never played (must not tie both finalists at
  placement 1, and must not count toward any record), a BYE-only participant
  still receiving a placement, and idempotency on re-run.
- `power_unification_admin.sql` — smoke coverage for the power-unification
  admin controls: the applied → reverted → applied round trip, guard behavior on
  a database without the unification, and admin/anon gating on all seven RPCs.
- `power_score_weighted_denominators.sql` — pins the power score formula.
  Asserts that `weighted_win_pct` and `weighted_game_win_pct` are true weighted
  averages (a perfect team reads 1.0 on both whatever it played, so the old
  `100 × average opponent weight` ceiling is gone), that strength of schedule
  still separates identical records, that beating a stronger opponent is worth
  more than beating a weaker one, and that Hidden-division matches are excluded
  from the three weighted terms while still counting in the W-L record (the
  exclusion is one-directional — a Hidden team keeps a rating of its own for
  the admin surfaces that fetch it deliberately).
- `power_score_historical_opponent_division.sql` — pins that an opponent is
  rated by the division they were **actually in when the match was played**.
  Reproduces the real defect (a team plays in Recreational, drops out, is moved
  to Hidden) and asserts the match still rates at the Recreational weight via
  the weekly snapshot. Also covers: every rated match resolving to a real
  `divisions` row rather than a name, nothing ever resolving to a hidden or
  weightless division, `Hidden2` being caught despite its positive weight,
  division weights being versioned so a re-weight cannot move a past match,
  archived seasons being frozen against routine recomputes while
  `admin_recompute_season_power()` can still move them, and a coverage floor of
  zero `unresolved` matches.
- `member_team_update_guard.sql` — asserts an approved non-admin can rename
  their own team but cannot change `division_id` or the win/loss counters.
  Regression cover for `prevent_member_competitive_field_updates()`, which
  referenced a `teams.is_hidden` column that never existed and therefore threw
  on every non-admin team update.
- `opponent_match_history_winner_id.sql` — asserts
  `get_opponent_match_history` returns `team1_id`, `team2_id` and a `winner_id`
  that is NULL for a tie. Uses two teams deliberately given the same name:
  `teams.name` has no unique constraint, so `winner_name` cannot tell a win
  from a loss and the head-to-head dialog's badge read every result as a loss.
  Also seeds a playoff match: `playoff_matches` scores are `numeric` while the
  `matches` columns are `integer`, and the resulting `UNION ALL` type made the
  function raise on every call (B-39).
- `match_badge_processing.sql` — covers `process_all_match_badges`, the shared
  badge rulebook every result path now calls. Asserts a match finalised through
  live scoring awards the same streak badges the ordinary score path does (B-32:
  before the fix it awarded none), that all fifteen checks dispatch on a decided
  match — which is what catches a mistyped function name, since the team-scoped
  checks resolve through `EXECUTE format(...)` and a failure there would
  otherwise be trapped into a silent no-op — and that a tie, an unfinished match
  and an unknown match id are each reported rather than raised. It also breaks
  one check on purpose and asserts the match result survives, the other checks
  still run, and the failure is reported: the badge checks run inside the
  result's own transaction, so a badge failure must never roll the result back.
  A second block covers King Slayer, the one check that used to judge a single
  pairing: a recreational team beats a competitive one 85 career power score
  above it and earns the badge; a later narrow win must not revoke it (the old
  pairing-scoped check let whichever match ran last decide); and voiding the
  upset must take it away, which nothing could do before, because the badge
  records no match.
- `season_placement_badges.sql` — covers both halves of B-33. Asserts a real
  double-elimination bracket closed with `finalize_playoffs` writes champion,
  runner-up **and** third-place badges (only champions were written before);
  that closing a season leaves an earlier season's championship badge active
  while still rotating its own revocable badges (the rotation had no season
  filter); that re-running the placement writer is idempotent (the old INSERT had
  no `ON CONFLICT` and raised `23505`); and that nobody is awarded third place
  when the bracket ranks nobody third, as a single-elimination bracket does not.
- `_bootstrap.sql` — CI-only Supabase stubs (auth/storage/roles/realtime
  publication). Files prefixed with `_` are helpers and are skipped by
  the smoke runner.

The core tables themselves come from
`supabase/migrations/00000000000000_baseline.sql` (see
`docs/SUPABASE_CI.md`), which recreates the pre-migration dashboard-era
schema so the whole chain can replay on an empty database.

## Adding a new smoke test

1. Create `supabase/tests/<topic>.sql` (no leading underscore).
2. Start with `\set ON_ERROR_STOP on`.
3. `RAISE EXCEPTION` on drift; print `RAISE NOTICE` on success.
4. Open a PR and confirm the `db-apply-and-smoke` CI job picks it up.

## Drift-prevention rule

Any future migration that touches `public.seasons` policies MUST keep
`Anyone can view seasons` for role `public` (or an equivalent
`TO anon, authenticated` SELECT policy). Public read is intentional —
standings, history, and the marketing site depend on it.

See `docs/RLS_NOTES.md` for the full access model.