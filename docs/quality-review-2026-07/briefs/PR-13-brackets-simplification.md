# PR-13 — Brackets subsystem: trust the library, adopt stable team identity, calm the realtime storm

**Phase:** 5 (Maintainability) · **Tier:** 2/3 · **Agent:** Claude Code or Codex (highest-skill brief in this plan — do NOT give to Lovable) · **Parallelizable:** keep isolated; large blast radius · **Depends on:** PR-06 (finalization must be server-side first) · **Expected score impact:** +0.8 overall (Code quality +4, Reliability +2)

## 1. Background

The bracket stack correctly uses `brackets-manager` at its core (BracketManagerService facade + a custom `SupabaseSqlStorage` adapter). Around it, however, has grown a large hand-rolled "repair" layer that duplicates — and sometimes fights — the library: BYE handling that bypasses the library entirely, a 3×-retry losers-round normalization, grand-final repopulation, and a full winner-propagation walker (`src/services/brackets/manager/services/BracketUpdate/byeUpdate.ts:31-232` and siblings). Specific verified issues:

- Silent propagation failure can mark a bracket **completed prematurely** and hide it from the current-season list (`BracketUpdate/completion.ts:36-47`).
- Team identity is resolved **by name** throughout the pipeline despite `participant.team_id` existing (`BracketCreationService.ts:64-66`) — a team rename mid-playoffs breaks resolution.
- Every bracket creation writes a dead row to the legacy `participants` table, and `brackets.participants` JSONB is repurposed to smuggle `grandFinalType` (`bracket-creator.ts:123-150`).
- One admin save fires many match-table writes, each toasting **every** viewer via realtime (`useBracketsManagerRealtime.ts:92-105`).
- The match→playoff_matches sync trigger maps brackets-manager statuses 3 (Running) and 5 (Archived) to 'pending' (migration `20260410145358`:132-).
- Misc dead artifacts: `sqlChecks.ts` references a nonexistent `execute_sql` RPC; brackets-viewer is loaded from a CDN at runtime (offline/supply-chain concern).

## 2. Objective

Bracket behavior is driven by brackets-manager's own state machine wherever the library supports it; teams are identified by id; a bracket can never show "completed" while matches remain; one admin action produces at most one viewer notification.

## 3. Exact scope

Bracket services + realtime hook + one trigger migration + creation service. Playoff UI components unchanged except where identity plumbing requires props.

## 4. Files to modify

- `src/services/brackets/manager/services/BracketUpdate/` (repair layer reduction)
- `src/services/brackets/manager/services/BracketCreationService.ts`, `src/services/bracket-creator.ts`
- `src/hooks/brackets/useBracketsManagerRealtime.ts`
- `supabase/migrations/<ts>_fix_playoff_status_mapping.sql`
- `src/services/brackets/sqlChecks.ts` (delete), vendor `brackets-viewer` locally
- Tests throughout (`tests/` bracket integration suites are the safety net — extend before refactoring)

## 5. Implementation steps

1. **Characterize first** (this is the safety net): extend the existing bracket integration tests with golden-path scenarios — 4/6/8-team single & double elimination with BYEs, resets, grand finals — asserting final bracket states. Run against the current code to lock in behavior.
2. Replace the BYE bypass with brackets-manager's native BYE support (`seeding` with nulls) if the pinned version supports it; where the repair layer exists to fix legacy data, gate it behind an explicit "repair" admin action instead of running on every update.
3. Fix completion: `completion.ts` must not mark completed unless the library's own stage state says so; propagate errors loudly (PR-11's error surface).
4. Identity: thread `team_id` through creation → participants → results (participant.team_id already exists); keep name only for display. Migration not needed (column exists).
5. Stop the dead `participants`-table write; move `grandFinalType` into a proper column on `brackets` (additive migration) instead of JSONB smuggling.
6. Realtime: debounce/batch bracket-update notifications (one toast per logical save; queue-flush after 1–2s), and only for viewers of that bracket.
7. Trigger migration: map statuses 3→'live'/'in_progress' and 5→'archived' (align names with the UI's vocabulary).
8. Vendor brackets-viewer (npm dependency or local copy) — removes the runtime CDN fetch; delete `sqlChecks.ts`.

## 6. Database requirements

Two additive migrations (status mapping fix; grandFinalType column). Replay-clean; SQL smoke test for the trigger mapping.

## 7. UI/UX requirements

No visual changes; toast frequency drops.

## 8. Testing requirements

Step-1 characterization suite green before AND after each step — commit stepwise so any regression bisects to one change.

## 9. Validation commands

```bash
npm run test:file -- tests/ src/services/brackets
npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run e2e
```

## 10. Manual verification checklist (Doug)

- [ ] Create a test bracket with an odd team count (BYE) → advances correctly.
- [ ] Rename a team mid-bracket → bracket still resolves it.
- [ ] Save a score as admin with a public window open → the public window gets ONE update notification.

## 11. Acceptance criteria

- Characterization suite green; repair layer reduced to an explicit admin repair action; no name-based **identity** lookups in bracket services. Verifiable check (BYE null-checks like `name === null` are legitimate and excluded): `grep -rnE '\.name === (?!null)' --include='*.ts' src/services/brackets` via `grep -P`, or equivalently `grep -rn "\.name ===" src/services/brackets | grep -v "=== null"` — must return nothing; plus a reviewer pass confirming participant resolution uses `team_id`.
- No runtime CDN fetches.

## 12. Non-goals / rollback

- Non-goals: Challonge fallback changes (it's a safe display-only iframe — leave it), bracket visual redesign.
- Rollback: stepwise commits; each step independently revertable. Keep the characterization tests regardless.
