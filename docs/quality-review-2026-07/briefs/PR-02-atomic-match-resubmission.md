# PR-02 — Make match score submission/edit atomic with a single SQL function (flagship data-integrity fix)

| | |
|---|---|
| **Phase** | 2 — Reliability, database, and security |
| **Tier** | 1 — Critical (data-corruption risk on the league's core workflow) |
| **Priority** | High — the most valuable single change in this plan |
| **Recommended agent** | Claude Code (multi-layer: SQL migration + services + hooks + tests). Not Lovable — too much SQL nuance. |
| **Difficulty** | High (the one genuinely hard PR here) |
| **Risk** | Medium — touches the scoring path; mitigations below |
| **Expected score improvement** | +2.3 overall (Reliability 76→92, Core functionality 88→90) |
| **Parallel-safe?** | No — must not run alongside PR-04 (same files) |
| **Depends on** | PR-01 (green CI baseline) |

## Background and problem statement

**Current behavior.** The app has two ways to record a match result:

1. **Pending-match approval** (`src/hooks/usePendingMatches.ts`) calls the SQL function `approve_match_result` — one transaction that sets winner/loser on the match AND updates both teams' win/loss/game counters, idempotently (double-call returns `false` and changes nothing). This path is excellent. Verified by the repo's SQL smoke test and my own fresh-database experiments.
2. **Score submission and editing** — `useMatchSubmission.handleSubmitScore` (used by `useUncompletedMatches` and the admin **mass score entry** tool via `src/components/admin/mass-score-entry/hooks/useScoreEntryData.ts`), and the single-match editor `src/hooks/matches/updates/useMatchUpdate.ts` — instead performs a **client-orchestrated sequence of separate network calls**:
   - (mass entry, edited matches only) `reverse_team_stats` RPC — decrements old counters
   - direct `UPDATE matches` via `MatchWriteService.updateMatch` — sets scores + winner + `iscompleted`
   - `update_team_stats` RPC — increments new counters
   - `upsert_team_season_stats` RPC — refreshes season stats
   - up to 14 badge-processing RPCs

**The problem.** Any failure *between* those calls (network drop, tab closed, browser crash, RLS hiccup) leaves the database internally inconsistent: a match row that says one thing and team counters that say another. This is not hypothetical:

- **Demonstrated empirically** on a fresh database rebuilt from the repo's own migrations: a direct `UPDATE matches` flipping the winner, with no stats call, produced a match row saying team B won while `teams.wins` still said team A won (`evidence/scoring-verification.log`, section B5).
- The code itself knows: `useTeamRecordUpdate` shows a *"Partial Update — match scores updated, but team records may not be fully synchronized"* toast when step 3 fails after step 2 succeeded.
- The mass-entry tool tracks "reversal ran but submit failed" **in browser memory** (`useScoreEntryData.ts`, the `reversalAppliedButFailed` set in the `finally` block) specifically to avoid double-reversal on retry — but that memory is lost on page refresh, after which a retry **re-reverses the same match** and double-decrements the counters.
- History: migration `20260310140000_fix_career_power_score_double_count.sql` records that a double-count bug class has bitten before.

**Who is affected:** admins entering weekly scores (the league's central Tuesday-night workflow), and every player whose standings depend on correct counters.

**Status:** Confirmed architectural weakness with an empirical drift demonstration; the mid-batch/refresh double-decrement is a reasoned failure scenario, not observed in production data (I had no production access to check).

**Preserve:** `approve_match_result` and `mark_match_as_tie` behavior and signatures; the mass-entry UI/UX (filters, optimistic states, per-match error chips); badge processing semantics (fire-and-forget with `FailedBadgeOperationsService` retry queue); validation rules (`useScoreValidation`: scores 0/1, one winner, game wins sum 2–3, winner ≥2 and > loser).

## Objective

Recording or editing a match result — including reversing a previous result — happens in **one atomic, idempotent SQL function call**, so no client-side failure at any moment can leave match rows and team counters disagreeing.

## Exact scope

1. **New SQL function** `public.resubmit_match_result(p_match_id uuid, p_winner_id uuid, p_loser_id uuid, p_winner_game_wins int, p_loser_game_wins int) RETURNS jsonb`, `SECURITY DEFINER`, `SET search_path = pg_catalog, public`, admin-gated (`current_user_is_admin()` → RAISE if not), that in ONE transaction:
   - `SELECT ... FOR UPDATE` the match row (RAISE if missing);
   - validates `p_winner_id`/`p_loser_id` are the match's two teams and distinct;
   - if the match already has a `winner_id` (previously completed): reverse the OLD result's counters (mirror `reverse_team_stats` math, clamped at 0 like the existing function);
   - update the match row: winner/loser, `team1_score`/`team2_score` (1/0 by winner side), `team1_game_wins`/`team2_game_wins`, `iscompleted = true`;
   - apply NEW counters (mirror `update_team_stats` math);
   - `PERFORM public.upsert_team_season_stats()`;
   - return jsonb `{applied, reversed_previous, previous_winner_id}` for logging.
   - **Idempotency:** if the match's stored result already equals the requested result exactly (same winner/loser/game wins, `iscompleted = true`), return `{applied:false}` without touching counters. This makes accidental double-submission harmless — the property the client-side guard was trying to approximate.
2. **Service layer:** add `resubmitMatchResult(...)` to `src/services/matches/MatchWriteService.ts` following the existing `approveMatchResult` wrapper pattern (rpc call, `handleDatabaseError`, return parsed result).
3. **Rewire the three callers:**
   - `src/hooks/matches/useMatchSubmission.ts`: replace the `updateMatchScore` (direct update) + `updateTeamStats` pair with one `resubmitMatchResult` call. Keep validation, the in-flight `submittingMatchIds` guard, toasts, cache invalidation, and badge processing (badges run AFTER the RPC succeeds, unchanged).
   - `src/components/admin/mass-score-entry/hooks/useScoreEntryData.ts`: delete the per-match `reverseTeamStats` pre-call and the entire `reversalAppliedButFailed` compensation bookkeeping in the `finally` block (the RPC now owns reversal). Keep filters, optimistic UI, per-match success/failure merge.
   - `src/hooks/matches/updates/useMatchUpdate.ts`: for edits that change result fields (winner/loser/game wins/completion), call `resubmitMatchResult`; for a completed→incomplete transition keep using the existing reversal path or `mark_match_as_tie` semantics — inspect `applyStatChanges` first and preserve its decision matrix; for non-result edits (date, location, teams on an unplayed match) keep the plain `updateMatch`.
4. **Badge processing** stays client-side and failure-queued — explicitly out of scope to move into SQL.
5. **Out of scope:** deleting the now-less-used legacy functions (PR-04 does that after this lands); live-scoring (`finalize_live_match`) — already atomic; playoff bracket score editing (separate brackets-manager subsystem).

## Likely files and systems affected

- New migration: `supabase/migrations/<timestamp>_resubmit_match_result.sql`
- `src/services/matches/MatchWriteService.ts`
- `src/hooks/matches/useMatchSubmission.ts`
- `src/hooks/matches/useTeamRecordUpdate.ts` (likely becomes unused by this flow — leave deletion to PR-04)
- `src/components/admin/mass-score-entry/hooks/useScoreEntryData.ts`
- `src/hooks/matches/updates/useMatchUpdate.ts` (+ its `applyStatChanges` util — read before changing)
- `src/integrations/supabase/types.ts` (regenerate — see DB requirements)
- Tests: `supabase/tests/score_stats_business_logic.sql` (extend), `src/services/matches/__tests__/`, `src/hooks/matches/__tests__/`, mass-score-entry `__tests__/`, plus a new integration test modeled on `tests/liveScoringFinalize.integration.test.ts`

## Implementation instructions

1. **Read first:** `supabase/migrations/20260310151239_*.sql` (approve/tie functions — copy their locking, admin-check, and counter patterns), `20251217182022_*.sql` (reverse math + clamping), `20260422120000_*.sql` (season-stats upsert), and all three caller hooks end-to-end. Map every caller of `updateMatch`, `updateMatchScore` (both the service one and `matchDatabaseUtils` one), `updateTeamStats`, `reverseTeamStats`.
2. Write the migration. Follow repo conventions: idempotent (`CREATE OR REPLACE`), `REVOKE ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated`, pinned search_path, `RAISE EXCEPTION 'Admin access required'` matching the exact message other functions use (the smoke tests assert on it).
3. Extend `supabase/tests/score_stats_business_logic.sql` with: first-submit counters; exact-duplicate resubmit `{applied:false}`; changed-result resubmit (reverse+apply nets correctly, including winner flip); non-admin rejection; missing-match rejection.
4. Verify the migration on a fresh database the same way CI does (commands below) **before** touching TypeScript.
5. Rewire the three hooks with the smallest diffs that remove the multi-call orchestration. Do not restyle or reorganize surrounding code.
6. Regenerate Supabase types; update service + hook unit tests (mock the rpc, assert parameters and error paths); add the integration test proving: submit → edit (winner flip) → counters match a from-scratch recomputation over `matches`.
7. Run the full validation block; report any behavior in `applyStatChanges` that doesn't fit the decision matrix above instead of guessing.

## Database requirements

- **Migration:** yes, one new function (no table changes, no backfill — existing drifted data, if any, is PR-14's reconciliation report, not this PR).
- **Idempotent & replayable:** must apply cleanly on both a fresh database (CI does this weekly) and the live one.
- **Types:** regenerate `src/integrations/supabase/types.ts` via the project's usual Supabase codegen so the new RPC is typed (never hand-edit).
- **RLS/authz:** function is `SECURITY DEFINER` with an internal admin check — identical trust model to `approve_match_result`.
- **Rollback:** dropping the function restores the status quo; the client changes revert with git. Counters written by the function are indistinguishable from the legacy path's writes, so no data migration is needed either way.
- **Testing on fresh DB:** the combined replay + smoke commands below.

## UI and UX requirements

No visual changes. Behavior guarantees to preserve, all viewports:

- Mass entry: submit-all still shows per-match spinners, success toast with counts, failed matches keep edits + red error chip and can be retried (desktop and 375 px).
- A retried failure after page refresh must now be **safe** (this is the point of the PR).
- Single-match editor: same dialogs/toasts; permission-denied (non-admin RPC rejection) surfaces the existing destructive toast, not a silent failure.
- Loading/disabled states unchanged (`submitting`, `isSubmitting` flags).

## Testing requirements

- **SQL (must):** the smoke-suite extensions in step 3 — run via the fresh-DB replay.
- **Unit:** MatchWriteService.resubmitMatchResult (rpc args, error mapping); useMatchSubmission (validation short-circuit, rpc called once, badge ops fire after success, no badge ops on failure); useScoreEntryData (no reversal pre-call remains; failure of one match doesn't block others).
- **Integration (must):** new `tests/` file modeled on `liveScoringFinalize.integration.test.ts` with a fake DB implementing the RPC contract: submit → flip → assert counters equal recomputation from match rows; duplicate submit is a no-op.
- **Regression:** entire existing suite; the SQL smoke suite already asserts `approve_match_result`/`mark_match_as_tie` are unchanged.

## Required validation commands

```bash
npm ci
# Fresh-DB migration replay + smoke tests (mirror .github/workflows/supabase-ci.yml):
docker run -d --name qa-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=postgres -p 54329:5432 postgres:15
# apply supabase/tests/_bootstrap.sql, then all supabase/migrations/*.sql sorted, ON_ERROR_STOP=1,
# then the supabase/tests/*.sql smoke suites (see the workflow file for the exact loop)
npm run typecheck && npm run lint
npm run test:file -- src/services/matches src/hooks/matches src/components/admin/mass-score-entry tests/
npm run test:coverage
npm run build
```

## Manual verification checklist (for Doug)

1. Admin → Scores (mass entry) → enter a result for an uncompleted match → Submit All. **Expect:** success toast; standings on `/stats` reflect it after refresh. **Must not:** show "Partial Update".
2. Edit that same match's score to flip the winner → submit. **Expect:** standings flip accordingly, exactly one win/loss moved between the teams.
3. Submit the identical result twice (submit, then submit again without changes). **Expect:** second submit is a quiet no-op — standings unchanged.
4. Mid-flight failure sanity: with your network throttled/offline mid-submit, retry after a page refresh. **Expect:** final standings correct — no team loses 2 wins.

## Acceptance criteria

- [ ] A single network call performs reversal + match update + counters + season stats (verify in devtools: one `/rest/v1/rpc/resubmit_match_result` per match).
- [ ] Fresh-DB replay + extended smoke suite pass.
- [ ] Integration test proves counters == recomputation after submit→edit→duplicate-submit.
- [ ] Non-admin RPC call is rejected with 'Admin access required'.
- [ ] No remaining caller of `reverseTeamStats` inside the mass-entry submit path.
- [ ] Full suite, typecheck, lint, build, size all green.

## Non-goals and guardrails

- Do not modify `approve_match_result`, `mark_match_as_tie`, `finalize_live_match`, or live-scoring.
- Do not move badge processing into SQL.
- Do not delete legacy service functions here (PR-04).
- Do not "fix" unrelated hooks/formatting; smallest coherent diff.
- Backward compatible: old clients (cached bundles) still work during rollout because the legacy functions remain until PR-04.

## Rollback and failure considerations

- **What could go wrong:** counter math in the new function disagrees with legacy math → standings shift. Mitigation: the SQL tests assert exact counter values, and the integration test compares against recomputation.
- **Revert:** git revert of client changes; the function can stay (harmless) or be dropped by a follow-up migration (`DROP FUNCTION`), which is safe because nothing else references it.
- **Post-deploy check:** after the first real league night, run the PR-14 reconciliation query (counters vs. recomputed-from-matches) — expect zero diff rows.

## Deliverables from the implementing agent

Implementation summary; migration file name; files changed; tests added (names); full command outputs (replay, smoke, suite, build); manual checks performed; any deviation from the `applyStatChanges` decision matrix discovered in step 1 and how it was resolved.
