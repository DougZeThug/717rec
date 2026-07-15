# PR-05 — Counter-drift detector + one-click reconciliation

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

1. Migration — detector view:
   ```sql
   CREATE OR REPLACE VIEW public.v_counter_drift AS
   SELECT t.id AS team_id, t.name,
          t.wins  AS counter_wins,  s.wins  AS derived_wins,
          t.losses AS counter_losses, s.losses AS derived_losses,
          t.game_wins AS counter_game_wins, s.game_wins AS derived_game_wins,
          t.game_losses AS counter_game_losses, s.game_losses AS derived_game_losses
   FROM public.teams t
   JOIN public.v_team_match_stats s ON s.team_id = t.id
   WHERE t.wins IS DISTINCT FROM s.wins
      OR t.losses IS DISTINCT FROM s.losses
      OR t.game_wins IS DISTINCT FROM s.game_wins
      OR t.game_losses IS DISTINCT FROM s.game_losses;
   ```
2. Migration — reconciliation function `public.reconcile_team_counters()` (SECURITY DEFINER, `SET search_path TO 'pg_catalog','public'`, admin-gated via `current_user_is_admin()`, mirroring `approve_match_result`'s header): one `UPDATE public.teams t SET ... FROM public.v_team_match_stats s WHERE s.team_id = t.id AND (…IS DISTINCT FROM…)` returning the number of repaired rows; then `PERFORM public.upsert_team_season_stats();`. Idempotent by construction (second run repairs 0 rows).
3. Smoke test (`supabase/tests/counter_drift_tools.sql`, following `score_stats_business_logic.sql`'s fixture pattern): seed 2 teams + approved match, corrupt a counter directly, assert `v_counter_drift` reports 1 row, run `reconcile_team_counters()`, assert 0 rows and counters equal derived values, assert second run returns 0.
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

- `v_counter_drift` returns 0 rows after reconciliation on production.
- Reconciliation is idempotent (second run: 0 repaired) and admin-only (anon/member call raises "Admin access required").
- CI migration replay + all smoke tests green.

## 12. Non-goals / rollback

- Non-goals: removing the legacy write paths (PR-04), changing how counters are written, scheduled auto-repair (start manual; automate later if drift recurs).
- Rollback: `DROP VIEW v_counter_drift; DROP FUNCTION reconcile_team_counters();` in a down migration; remove the card. No existing behavior depends on either.
