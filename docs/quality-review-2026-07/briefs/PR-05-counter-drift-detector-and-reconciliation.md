# PR-05 — Counter-drift detector + one-click reconciliation

> **Resolution status:** Open — detector/reconciliation remediation brief; not part of PR-15 docs-only scope.

**Phase:** 2 (Data integrity) · **Tier:** 1 · **Agent:** Claude Code or Codex (SQL + service + small admin UI); not Lovable for the migration · **Parallelizable:** yes (after PR-04 merges, or independently — see dependencies) · **Depends on:** conceptually pairs with PR-04; can land first · **Expected score impact:** +1.2 overall (Reliability & data integrity +7)

## 1. Background

`teams.wins/losses/game_wins/game_losses` are **denormalized counters**, updated only by the atomic RPCs (`approve_match_result`, `reverse_team_stats`). The matches table is the source of truth, and `v_team_details` prefers match-derived stats (`COALESCE(stats.wins, t.wins)` via `v_team_match_stats`). The 2026-07-15 review reproduced drift empirically on a fresh PG15 with the full migration set applied:

```
S4: direct UPDATE of matches (winner_id/loser_id/iscompleted) — the legacy
MatchWriteService-style write — moved the VIEW to 2 wins while teams.wins
stayed at 1: counters and view now disagree.
```

(evidence/scoring-verify.log, scenario S4). Any past or future write that touches `matches` without the RPC — legacy code paths, manual SQL in the dashboard, a future bot edit — silently desynchronizes standings surfaces that read the raw counters from those that read the view. **Whether production data has drifted today is unknown and unverifiable from the repo** — that's exactly why a detector is needed.

## 2. Objective

Drift becomes (a) detectable in one query, (b) visible to admins, and (c) fixable with one idempotent action — instead of invisible and permanent.

**Scope boundary, stated precisely:** this PR detects and repairs the **global `teams` counters** (wins/losses/game_wins/game_losses). The per-season cache (`team_season_stats`) is refreshed as part of reconciliation via the existing `upsert_team_season_stats()`, which recomputes it. **Not covered:** historical `ranking_snapshots` rows (append-only history — if drift existed when a snapshot was taken, that snapshot stays wrong) and any orphaned season-stat rows from deleted seasons. Extending detection to those caches is a reasonable follow-up, but "detector reports 0 rows" claims only what it checks: current teams counters agree with decided-match history.

## 3. Exact scope

One migration (view + two functions), one service function, one small admin-dashboard card, tests. No changes to existing scoring RPCs.

## 4. Files to modify / create

- `supabase/migrations/<timestamp>_add_counter_drift_tools.sql` (new)
- `supabase/tests/counter_drift_tools.sql` (new smoke test)
- `src/services/admin/DriftService.ts` (new)
- `src/hooks/admin/useCounterDrift.ts` (new, TanStack Query)
- Admin dashboard: one new card/section in the existing admin overview component
- `src/services/admin/__tests__/DriftService.test.ts`

## 5. Implementation steps

1. Migration — detector view. **Do NOT compare against `v_team_match_stats`'s game columns**: that view sums `team1_game_wins`/`team2_game_wins` for every completed match *including ties*, while the scoring RPCs deliberately leave ties contributing **nothing** to `teams` counters (`mark_match_as_tie` reverses the match's entire counter contribution — verified in migration `20260310151239`). A naive comparison would flag every completed tie as drift and "Repair now" would corrupt tie counters. Derive the expectation with exactly the RPC semantics — only matches with a winner contribute:
   ```sql
   CREATE OR REPLACE VIEW public.v_counter_drift
   WITH (security_invoker = true) AS
   WITH derived AS (
     SELECT t.id AS team_id,
            COUNT(*) FILTER (WHERE m.winner_id = t.id) AS wins,
            COUNT(*) FILTER (WHERE m.loser_id  = t.id) AS losses,
            COALESCE(SUM(CASE WHEN m.winner_id IS NULL THEN 0            -- ties: no contribution
                              WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                              WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                              ELSE 0 END), 0) AS game_wins,
            COALESCE(SUM(CASE WHEN m.winner_id IS NULL THEN 0
                              WHEN m.team1_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                              WHEN m.team2_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                              ELSE 0 END), 0) AS game_losses
     FROM public.teams t
     LEFT JOIN public.matches m
       ON (m.team1_id = t.id OR m.team2_id = t.id)
      AND m.winner_id IS NOT NULL          -- decided matches only, mirroring approve/reverse RPCs
     GROUP BY t.id
   )
   SELECT t.id AS team_id, t.name,
          t.wins  AS counter_wins,  d.wins  AS derived_wins,
          t.losses AS counter_losses, d.losses AS derived_losses,
          t.game_wins AS counter_game_wins, d.game_wins AS derived_game_wins,
          t.game_losses AS counter_game_losses, d.game_losses AS derived_game_losses
   FROM public.teams t JOIN derived d ON d.team_id = t.id
   WHERE t.wins IS DISTINCT FROM d.wins OR t.losses IS DISTINCT FROM d.losses
      OR t.game_wins IS DISTINCT FROM d.game_wins OR t.game_losses IS DISTINCT FROM d.game_losses;
   ```
   Grants — be explicit, don't rely on default privileges, and keep drift internals off the anonymous surface:
   ```sql
   REVOKE ALL ON public.v_counter_drift FROM PUBLIC, anon;
   GRANT SELECT ON public.v_counter_drift TO authenticated, service_role;
   ```
   (`security_invoker = true` keeps underlying-table RLS in force, matching the repo's view-lint posture.)
2. Migration — reconciliation function `public.reconcile_team_counters()` (SECURITY DEFINER, `SET search_path TO 'pg_catalog','public'`, admin-gated via `current_user_is_admin()`, mirroring `approve_match_result`'s header): one `UPDATE public.teams t SET ...` from the same `derived` expression (factor it into the function; do not reference the view's game columns from `v_team_match_stats`), returning the number of repaired rows; then `PERFORM public.upsert_team_season_stats();`. Idempotent by construction (second run repairs 0 rows). Privileges must follow the repo's existing RPC convention (see `mark_match_as_tie`'s migration):
   ```sql
   REVOKE EXECUTE ON FUNCTION public.reconcile_team_counters() FROM PUBLIC;
   GRANT EXECUTE ON FUNCTION public.reconcile_team_counters() TO authenticated;
   ```
3. Smoke test (`supabase/tests/counter_drift_tools.sql`, following `score_stats_business_logic.sql`'s fixture pattern):
   - seed 2 teams + an approved match, corrupt a counter directly → `v_counter_drift` reports 1 row; `reconcile_team_counters()` repairs it; second run repairs 0;
   - **completed-tie case**: approve then `mark_match_as_tie` a match with recorded game scores → assert `v_counter_drift` reports **0 rows** (ties must not read as drift) and reconciliation is a no-op;
   - permissions: as `anon`, calling the function fails with a **permission-denied** error (revoked); as an authenticated **non-admin** member, it raises `Admin access required`.
4. `DriftService.fetchDrift()` (select from the view, columns listed explicitly) and `DriftService.reconcile()` (rpc call). Use `handleDatabaseError`/service-throws convention.
5. Admin UI: card on the admin overview showing "Standings counters: ✓ in sync" or "⚠ N teams out of sync" with a "Repair now" button (confirm dialog; show repaired count in a toast). Use `useAdminAccess()`.
6. Unit tests for the service + hook; component test for the card's three states (in sync / drifted / repairing).

## 6. Database requirements

- New view + function are additive; no data migration. RPC must be `GRANT EXECUTE ... TO authenticated` only (admin check inside), consistent with existing RPCs.
- Must pass the CI migration-replay job (single-transaction psql apply).

## 7. UI/UX requirements

- Plain language for a non-coder admin: "Standings counters" not "denormalized aggregates".
- The card must never block the dashboard load (independent query, skeleton on load, error state with retry).

## 8. Testing requirements

- SQL smoke test as step 3 (runs in `supabase-ci.yml` automatically because it lives in `supabase/tests/`).
- Service/hook/component unit tests; mock at the service boundary as house style.

## 9. Validation commands

```bash
npm run test:file -- src/services/admin/__tests__/DriftService.test.ts
npm run typecheck && npm run lint && npm run test:coverage && npm run build
# migration replay (CI mirrors this):
# psql -v ON_ERROR_STOP=1 -f <bootstrap+migrations+new file>
```

## 10. Manual verification checklist (Doug)

- [ ] Admin dashboard shows the sync card.
- [ ] In Supabase SQL editor (staging or with care): `SELECT * FROM v_counter_drift;` — expect 0 rows; if rows appear, click "Repair now" and re-check.
- [ ] After repair, standings pages and team detail pages show identical W-L everywhere.

## 11. Acceptance criteria

- `v_counter_drift` returns 0 rows after reconciliation on production (scope: global `teams` counters — see §2's boundary; historical snapshots are explicitly not claimed).
- A completed tie with recorded game scores produces 0 drift rows (smoke-tested).
- Reconciliation is idempotent (second run: 0 repaired); `anon` gets permission-denied (execute revoked), authenticated non-admin gets "Admin access required" (both smoke-tested).
- CI migration replay + all smoke tests green.

## 12. Non-goals / rollback

- Non-goals: removing the legacy write paths (PR-04), changing how counters are written, scheduled auto-repair (start manual; automate later if drift recurs).
- Rollback: `DROP VIEW v_counter_drift; DROP FUNCTION reconcile_team_counters();` in a down migration; remove the card. No existing behavior depends on either.
