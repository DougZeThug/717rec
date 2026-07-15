# PR-06 — Playoff results integrity: server-side final standings, tie rejection, seed-latch resync

**Phase:** 2 (Data integrity) · **Tier:** 1/2 · **Agent:** Claude Code or Codex (needs DB + service work) · **Parallelizable:** after PR-04/05 land (touches adjacent code) · **Depends on:** none strictly · **Expected score impact:** +0.9 overall (Reliability +4, Core functionality +2)

## 1. Background

Three verified defects cluster in the playoff pipeline:

1. **Final standings are written client-side by whoever is watching.** `useBracketCompletion` (src/hooks/useBracketCompletion.ts:38-66) reacts to a realtime "bracket completed" event by calling `bracketManagerService.calculateFinalStandings(bracketId)` *from the browser*, then writes `playoff_team_records`. If the completion event is seen only by public viewers, the write fails against RLS (admin-gated) and standings are silently never recorded; if no browser is open, the same. Champions' records depend on which tab happened to be open.
2. **The match editor accepts tied scores.** `useMatchEditorState.ts:128-142`: a tie maps to loss/loss, which brackets-manager rejects — but only *after* a pre-update "unlock" write already mutated match status, with no rollback (src/components/playoffs/match-score-editor/).
3. **Seed-management latch never resyncs.** `useSeedManagement.ts:36` initializes `processedTeams` behind a one-shot `isInitializedRef`; after "Reset to Auto" (or any server-side seed change) the UI keeps stale seed overrides which can flow into bracket creation. *(Flagged high by the investigation; the adversarial re-check could not run — treat step 3 as "verify then fix".)*

Note: the suspected "public users can open the admin score editor" issue was **refuted** during verification — `BracketDetail.tsx:192` passes `onEditMatch` only when `isAdminAccessGranted`. No work needed there.

## 2. Objective

Playoff outcomes (final standings, match results, seeds) are decided and persisted server-side or validated before any write; no state depends on which browser observes an event.

## 3. Exact scope

One migration (finalization RPC or trigger), hook rewiring, two focused UI-logic fixes, tests.

## 4. Files to modify / create

- `supabase/migrations/<ts>_finalize_bracket_standings.sql` (new)
- `src/hooks/useBracketCompletion.ts`
- `src/services/brackets/manager/services/` (standings calculation → SQL or admin-triggered RPC call)
- `src/components/playoffs/match-score-editor/useMatchEditorState.ts`
- `src/components/playoffs/form/bracket-teams/hooks/useSeedManagement.ts`
- Tests alongside each.

## 5. Implementation steps

1. **Server-side finalization.** Create `public.finalize_bracket_standings(p_bracket_id uuid)` (SECURITY DEFINER, pinned search_path, idempotent — safe to call repeatedly). Preferred trigger: an AFTER UPDATE trigger on the bracket-completion state transition calls it, so standings are written the moment the last match result lands, regardless of who is watching. The existing client TypeScript standings logic becomes the reference for the SQL implementation; port its ordering rules 1:1 and add a SQL smoke test comparing a seeded 4-team bracket's output to hand-computed placements.
2. Reduce `useBracketCompletion` to display-only (toast when the server has written standings; retry/read, never write).
3. **Tie rejection.** In `useMatchEditorState`, validate scores *before* the unlock write; block equal scores with an inline error ("Playoff matches cannot end tied") — and reorder so no write happens until validation passes.
4. **Seed latch.** Replace the `isInitializedRef` latch with state that resyncs when `initialTeams` identity changes (e.g. key the memo on team ids+seeds, or `useEffect` sync gated on a `dirty` flag so in-progress drags aren't clobbered). First write a failing test reproducing: load → Reset to Auto → assert UI shows auto seeds.
5. SQL smoke test for the finalization function in `supabase/tests/`.

## 6. Database requirements

- New RPC + trigger must replay cleanly in the CI migration job (single-transaction psql).
- `playoff_team_records` write policy can then be tightened to service/definer-only if the client no longer writes it.

## 7. UI/UX requirements

- Tie attempt shows a clear inline message, not a toast-after-failure; no status flicker from the unlock write.
- Completion toast appears for admins and public viewers alike once standings exist.

## 8. Testing requirements

- SQL: finalization idempotency (run twice → identical rows), permission (non-admin caller can still *trigger* via match completion but not call directly unless admin — decide and test).
- Unit: editor rejects ties pre-write; seed resync test from step 4.

## 9. Validation commands

```bash
npm run test:file -- src/components/playoffs/match-score-editor/__tests__ src/components/playoffs/form/bracket-teams/hooks/__tests__
npm run typecheck && npm run lint && npm run test:coverage && npm run build
```

## 10. Manual verification checklist (Doug)

- [ ] Complete a test bracket with only a public (logged-out) window open → final standings still appear.
- [ ] Try entering a tied playoff score → blocked with message, match state unchanged.
- [ ] Set manual seeds, Reset to Auto → displayed seeds actually reset.

## 11. Acceptance criteria

- `playoff_team_records` rows exist for a completed bracket with zero authenticated browsers open.
- No client code writes `playoff_team_records`.
- All gates green; migration replay green.

## 12. Non-goals / rollback

- Non-goals: refactoring the bracket repair layer (PR-13), realtime toast-storm fix (PR-13), name→id identity (PR-13).
- Rollback: drop the trigger + RPC in a down migration; revert the hook to client-side calculation (previous behavior restored).
