## Goal

Fix all 40 TypeScript build errors across 10 files, organized into 7 surgical groups. No feature/runtime changes — type alignment only.

## Group 1 — `src/hooks/matches/utils/matchDatabaseUtils.ts` (1 error)

`BadgeOperationType` is no longer re-exported from `@/types/badges` (only `BadgeOperationKind` is). Change the import to alias:

```ts
import { BadgeOperationParams, BadgeOperationKind as BadgeOperationType } from '@/types/badges';
```

## Group 2 — `BadgeProcessingService.ts` + its test (12 + 7 = 19 errors)

The Supabase v2 `.rpc()` overload no longer accepts `BadgeRpcResult['x']` as a generic argument — it expects an RPC function name from generated types.

**Service file (12 errors):** Drop the explicit generic on all 11 `supabase.rpc<…>(…)` call sites. Cast at the return site instead, e.g.:

```ts
const { data, error } = await supabase.rpc('process_match_badges', { ... });
if (error) handleDatabaseError(error, '...');
return data as BadgeRpcResult['process_match_badges'];
```

**Special case at line 113 (`calculateTeamStreak`)** — after dropping the generic, `data` is typed as `Json` and `data[0]` becomes `string`, breaking the `{ streak_type, streak_count }` return. Cast explicitly:

```ts
const rows = (data as TeamStreakRpcResult[] | null) ?? [];
return rows.length > 0 ? rows[0] : null;
```

**Test file (7 errors):** the service methods now return `unknown`. Cast at each assertion site to a small inline shape:

```ts
const result = (await BadgeProcessingService.processMatchBadges(...)) as { badges_awarded: number };
expect(result.badges_awarded).toBe(...);
```

Apply analogously to the 6 `.awarded` accesses.

## Group 3 — `src/hooks/playoffs/usePlayoffViewModel.ts` (6 errors)

The local helper claims `match is BracketMatch` but operates on `PlayoffMatchWithTeams[]`, which has different optional fields. Drop the type predicate and align the helper's return type with the input:

```ts
const groupBracketMatchesByType = (matches: PlayoffMatchWithTeams[]) => {
  const winners = matches.filter((m) => m.matchType === 'winners');
  const losers  = matches.filter((m) => m.matchType === 'losers');
  const finals  = matches.filter((m) => m.matchType === 'finals');
  return { winners, losers, finals };
};
```

The existing `as unknown as PlayoffViewModel['bracketMatchesByType']` cast at the call site already absorbs the boundary mismatch — leave it in place.

## Group 4 — `AdminView.tsx` and `PlayoffView.tsx` (2 errors)

`SimpleBracketData` lacks `bestOf`/`bracket_id` on its matches but is being passed where `PlayoffBracket` is expected. Add a one-line cast at the prop boundary in both files:

```tsx
<SomeComponent bracket={data as unknown as PlayoffBracket} ... />
```

This mirrors the existing playoff cast pattern noted in the codebase audit.

## Group 5 — `useMatchSubmission.ts` + its test (1 + 8 = 9 errors)

**Real cause of line 63 error:** `updateMatch` returns a single match row object (single-row, not array). It is then passed into `updateTeamStats(..., data, ...)` as the third argument, but `updateTeamStats` declares `teams: any[]` (`src/hooks/matches/useTeamRecordUpdate.ts`). A single object isn't assignable to `any[]`.

Inspecting `updateTeamRecords` (`src/hooks/useTeamRecords.ts`) shows the `teams` parameter is typed `Team[]` and used only for debug logging — the actual stat write goes through `updateTeamStatsRecord(winnerId, loserId, …)` and doesn't read from `teams`. So this argument is effectively unused.

**Fix:** in `useMatchSubmission.ts:63`, wrap as `[data]` so the type aligns and we still pass useful debug context. No cast needed:

```ts
await updateTeamStats(
  team1Win ? team1_id : team2_id,
  team1Win ? team2_id : team1_id,
  [data],
  ...
);
```

This avoids retyping `UpdateMatchScoreResult` (which lives in `matchDatabaseUtils.ts`, not `useMatchSubmission.ts` — the previous draft pointed at the wrong file).

**Test file (8 errors):** the test's `mockResult.data: { id: 'm1', ... }` doesn't satisfy the full `Tables<'matches'>` shape that `Awaited<ReturnType<typeof updateMatch>>` resolves to. Add a small fixture helper at the top of the test file:

```ts
import type { Tables } from '@/integrations/supabase/types';

const mockMatchRow = (overrides: Partial<Tables<'matches'>> = {}): Tables<'matches'> =>
  ({
    id: 'm1', best_of: 3, bracket_id: null, created_at: '', date: '',
    iscompleted: true, location: '', loser_id: null, match_type: 'winners',
    metadata: null, /* …all required fields with safe defaults… */
    winner_id: null, team1_score: 0, team2_score: 0,
    ...overrides,
  } as Tables<'matches'>);
```

Then replace each `data: { id: ... }` with `data: mockMatchRow({ id: ..., team1_score: ... })`. Touches the 7 `mockResolvedValue`/`mockResolvedValueOnce` sites + the `resolveFirst!({...})` call at line 271.

## Group 6 — `useBracketFormData.test.ts` (1 error)

The test fixture at line 159 intentionally includes `{ name: 'Team without ID' }` to verify the missing-required-field path — making `id` required would defeat the test. Use the cast option at line 163 instead:

```ts
const { result } = renderHook(
  () => useBracketFormData(mockDivisions, invalidTeams as unknown as BracketFormTeam[]),
  { wrapper }
);
```

(Add the `BracketFormTeam` type import if missing.)

## Group 7 — `usePersistedState.ts` (2 errors)

The file already uses early-return after `parsedResult.ok`, but TS is not narrowing the discriminated union for the subsequent `parsedResult.error` access. Combine into a single guard so narrowing is explicit:

```ts
if (parsedResult.ok) {
  return parsedResult.value;
}
if (parsedResult.error !== 'missing') {
  errorLog(...);
}
return defaultValue;
```

If TS still complains, add an `else` branch instead so the discriminant is unambiguous within scope.

## Verification

- Run `npx tsc -b` after each group; expect totals to drop: 1 → 19 → 6 → 2 → 9 → 1 → 2.
- After all 7 groups, expect 0 errors.
- No runtime behavior change — pure type alignment. The only semantic-adjacent change is `[data]` instead of `data` in Group 5, which still passes correct data and matches the parameter's intended shape.

## Files touched (10)

1. `src/hooks/matches/utils/matchDatabaseUtils.ts`
2. `src/services/BadgeProcessingService.ts`
3. `src/services/__tests__/BadgeProcessingService.test.ts`
4. `src/hooks/playoffs/usePlayoffViewModel.ts`
5. `src/components/playoffs/views/AdminView.tsx`
6. `src/components/playoffs/views/PlayoffView.tsx`
7. `src/hooks/matches/useMatchSubmission.ts`
8. `src/hooks/matches/__tests__/useMatchSubmission.test.ts`
9. `src/components/playoffs/form/bracket-teams/hooks/__tests__/useBracketFormData.test.ts`
10. `src/hooks/usePersistedState.ts`
