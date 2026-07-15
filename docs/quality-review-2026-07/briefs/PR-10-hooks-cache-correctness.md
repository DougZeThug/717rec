# PR-10 — Hook correctness: fix stale-cache and write-on-read defects, migrate the last hand-rolled hooks to TanStack Query

**Phase:** 4 (Consistency & correctness) · **Tier:** 2 · **Agent:** Claude Code or Codex · **Parallelizable:** yes · **Depends on:** nothing · **Expected score impact:** +0.9 overall (Reliability +3, Code quality +4)

## 1. Background

86 hook files follow the house pattern (TanStack Query → services). Six live paths don't, and two of those cause user-visible defects (verified by code trace; the cache one is directly observable):

1. **`useTeamMutations` never touches the query cache** (src/hooks/useTeamMutations.ts — 72 lines, zero `queryClient`/`invalidate` references). Admin deletes or edits a team → the Teams page (cached under `['teams']`) keeps showing the old data until a hard refresh. Consumed via `useTeamManagement.ts:22`.
2. **`useTeamRankings` performs a database write as a side effect of a read** (src/hooks/useTeamRankings.ts:145-173): mounting a rankings view upserts `ranking_snapshots`. It is mounted in 5 places — rendering a page should never write; concurrent mounts race each other.
3. `useScoreEntryData` (mass entry) fetches via an unguarded async `useEffect` — rapid filter changes race, last-resolved-wins, and errors masquerade as empty lists (src/components/admin/mass-score-entry/hooks/useScoreEntryData.ts:56-80).
4. `useMessageApi` hand-rolls an AbortController inside a TanStack `queryFn` and resolves aborts as `[]` — an aborted fetch gets **cached** as a legitimate empty page (src/hooks/message-board/useMessageApi.ts:17-37).
5. `useBracketsQuery` swallows errors → admin bracket filter silently empty on failure (src/hooks/brackets/useBracketsQuery.ts:10-31).
6. `usePreviousRankings` duplicates a mount-only fetch per consumer with a dead code branch (src/hooks/rankings/usePreviousRankings.ts:36-111).

(`useAuth`/`useAuthProfile` also hand-roll server state but are the idiomatic exception — leave them.)

## 2. Objective

Every server-state hook is a TanStack Query/Mutation with correct invalidation; no read path writes; no aborted request pollutes the cache.

## 3. Exact scope

The six hooks above + their consumers' props if signatures change slightly. No visual changes.

## 4. Files to modify

Listed in §1; plus `src/hooks/useTeamManagement.ts`, tests for each hook (most already have test files to update).

## 5. Implementation steps

1. `useTeamMutations` → `useMutation` with `onSuccess: invalidateQueries(['teams'])` (match the invalidation-key convention used by `useMatchSubmission`/`queryCacheUtils`). Write the failing test first: delete team → `['teams']` invalidated.
2. `useTeamRankings`: extract the snapshot upsert out of the read path. The upsert belongs to an explicit action — move it server-side into the existing snapshot flow (`capture-power-snapshots` edge cron already exists) or behind an admin-only explicit mutation; the read hook becomes pure `useQuery`.
3. `useScoreEntryData`: convert to `useQuery` keyed on the filters (`['mass-score-matches', date, bracketId]`) — TanStack handles race/cancel/stale for free; surface `error` to the tool (PR-08 renders it).
4. `useMessageApi`: delete the hand-rolled AbortController; use the `signal` TanStack passes to `queryFn`, and **throw** on abort (never return `[]`).
5. `useBracketsQuery` + `usePreviousRankings`: straight `useQuery` conversions; errors propagate to `error` state; delete the dead promotion branch.
6. Update/extend each hook's tests; assert invalidation keys and error propagation.

## 6. Database requirements

None (step 2 reuses the existing snapshot cron; if the explicit-mutation route is chosen, it calls existing RPCs).

## 7. UI/UX requirements

Teams page reflects admin edits immediately; bracket filter shows an error state instead of silence (copy: "Couldn't load brackets — retry").

## 8. Testing requirements

Per-hook unit tests (mock services); one integration test: team delete → teams list refetches.

## 9. Validation commands

```bash
npm run test:file -- src/hooks/__tests__/useTeamMutations.test.ts src/hooks/message-board src/hooks/brackets
npm run typecheck && npm run lint && npm run test:coverage && npm run build
```

## 10. Manual verification checklist (Doug)

- [ ] Admin → Teams: rename a team → the public Teams page shows the new name without a refresh.
- [ ] Open Standings in two tabs — confirm nothing writes to `ranking_snapshots` on page view (check table's updated_at in SQL editor).

## 11. Acceptance criteria

- `grep -n "queryClient" src/hooks/useTeamMutations.ts` shows invalidation; no `useEffect`-fetch remains in the six hooks.
- Full suite green; no behavior regressions in message board pagination.

## 12. Non-goals / rollback

- Non-goals: auth hooks, realtime channels, redesigning ranking snapshots (only de-coupling them from reads).
- Rollback: hooks are individually revertable; each step is its own commit.
