# PR-11 — Migrate hand-rolled data hooks to TanStack Query

| | |
|---|---|
| **Phase** | 5 — Performance and maintainability |
| **Tier** | 3 — Polish (consistency; no user-reported defect) |
| **Priority** | Low-medium |
| **Recommended agent** | Claude Code |
| **Difficulty** | Medium |
| **Risk** | Medium (touches interactive features; do one hook family per commit) |
| **Expected score improvement** | +0.5 overall (Code quality +4, Performance +2) |
| **Parallel-safe?** | Yes (avoid only files PR-02/04 touch — no overlap expected) |
| **Depends on** | PR-01; ideally after PR-02 has settled the matches hooks |

## Background and problem statement

- The documented architecture is Components → Hooks (TanStack Query) → Services, and the app-level `QueryClient` adds retry, 5-min staleness, cache invalidation, and Sentry-reporting for free.
- A cluster of hooks bypasses this and hand-rolls `useState` + `useEffect` + manual fetch (confirmed by reading): `src/hooks/useScoreSubmissions.ts` (admin inbox), plus parts of the message-board and match-interaction families (`useMessageBoard`, `useMatchComments`, `useMatchReactions` — these also mix in realtime `.channel()` subscriptions, which stay).
- Consequences (inferred from the pattern, consistent with the eslint waivers on these files): no shared cache (admin inbox refetches on every mount), no automatic retry, manual loading/error bookkeeping, and the recurring `set-state-in-effect` lint waivers that this pattern forces.
- Status: pattern **confirmed**; impact is maintainability, not a broken feature. Preserve: realtime behavior (message board updates live), optimistic reaction toggles, all UX.

## Objective

Every data-fetching hook in the cluster uses `useQuery`/`useMutation` with the feature's query-key factory, realtime subscriptions patch/invalidate that cache, and the related `set-state-in-effect` waivers disappear.

## Exact scope

1. `useScoreSubmissions` → `useQuery(['score-submissions'], fetchScoreSubmissions)` + `useMutation` for approve/reject with optimistic removal and invalidation. Simplest one — do it first as the template.
2. `useMatchComments`, `useMatchReactions` → queries keyed per match; realtime events call `queryClient.setQueryData`/`invalidateQueries` instead of `setState` (follow the existing pattern in `src/hooks/live-scoring/useLiveMatchRealtime.ts`, which already does realtime + query cache correctly).
3. `useMessageBoard` family (`src/hooks/message-board/`) → same treatment; keep `useMessageRealtime` channel code, change only where it writes results.
4. Add/extend query-key factories following `src/hooks/live-scoring/liveScoringKeys.ts`.
5. Remove the now-unneeded `eslint-disable react-hooks/set-state-in-effect` comments in the migrated files (only those).
6. **Out of scope:** any hook already on TanStack Query; matches submission hooks (PR-02 territory); UI components (except trivial prop renames if a hook's return shape must change — prefer keeping return shapes identical).

## Likely files affected

- `src/hooks/useScoreSubmissions.ts` (+ tests)
- `src/hooks/matches/useMatchComments.ts`, `useMatchReactions.ts` (+ tests)
- `src/hooks/message-board/*` (+ tests)
- Key factories: new or extended `*Keys.ts` files per feature
- Consumers only if return shapes change (aim: they don't)

## Implementation instructions

1. Read `useLiveMatchRealtime.ts` + `liveScoringKeys.ts` — that is the house pattern for realtime+query. Read each target hook and its consumers fully.
2. Migrate ONE hook per commit, keeping the hook's public return shape (`{submissions, isLoading, handleApprove...}`) stable so components don't change.
3. Realtime handlers must be additive cache patches (append message, toggle reaction) with a fallback `invalidateQueries` — never a full refetch per event.
4. Update each hook's tests: mock the service, assert loading/success/error states through the hook's public API; add one test proving a realtime event updates the returned data without a service call.

## Database requirements

None.

## UI and UX requirements

Zero visible change: message board still live-updates; reactions still toggle instantly (add optimistic update via `onMutate` where the old code did local-state optimism); admin inbox loads/approves/rejects identically, including error toasts. All viewports.

## Testing requirements

Per migrated hook: initial load, error state (service throws → hook exposes error, toast fired), mutation success + cache effect, realtime event → data update. Existing consumer component tests keep passing untouched (the contract-stability proof).

## Required validation commands

```bash
npm run test:file -- src/hooks/__tests__/useScoreSubmissions.test.ts src/hooks/matches src/hooks/message-board
npm run test:coverage
npm run typecheck && npm run lint   # the removed waivers must not resurface as errors
npm run build
```

## Manual verification checklist (for Doug)

1. Message board: open in two browser tabs, post in one. **Expect:** appears in the other within a second or two, as today.
2. React (emoji) to a match/message; **expect** instant toggle, survives refresh.
3. Admin → score submissions: approve one. **Expect:** disappears from list, success toast; refresh shows it stays gone.

## Acceptance criteria

- [ ] None of the migrated files contain `useEffect`-driven fetch + `setState` for server data.
- [ ] `set-state-in-effect` waiver count in `src/` drops by the migrated files' share (report before/after counts).
- [ ] Realtime update test passes for each migrated family.
- [ ] Consumer components unchanged (or diffs justified); full suite green.

## Non-goals and guardrails

- Do not migrate hooks outside the listed cluster.
- Do not change the QueryClient global config.
- Do not remove realtime channels or debounce them differently.
- One hook family per commit for reviewability/revertability.

## Rollback

Per-commit git revert (hence the one-family-per-commit rule). No data risk.

## Deliverables from the implementing agent

Per-hook migration notes; waiver count before/after; test outputs; any return-shape changes and the consumers touched.
