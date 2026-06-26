## Scope
Two unrelated regressions on this branch, both small. Ship them as one PR.

## 1. Fix the 27 lint errors (formatting only)

All 27 are `prettier/prettier` — auto-fixable, zero behavior change.

- Run `npm run lint:fix`.
- Re-run `npm run lint` to confirm 0 errors.

## 2. Fix the 8 failing `useTeamRankings.test.ts` tests

**Root cause:** the recent RLS fix added `useAdminAccess()` inside `useTeamRankings`, and `useAdminAccess` calls `useAuth()` — which throws outside an `AuthProvider`. The existing test file mocks `useTeams`, `useRankingsData`, `usePreviousRankings`, and `rankingUtils`, but does not mock `useAdminAccess`, so the real hook runs and blows up.

**Fix:** add a mock for `useAdminAccess` at the top of `src/hooks/__tests__/useTeamRankings.test.ts`, matching the existing mock style:

```ts
vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: vi.fn(() => ({
    isAdminAccessGranted: false,
    isLoading: false,
    checkAdminAccess: vi.fn(),
    requestAdminAccess: vi.fn(),
    revokeAdminAccess: vi.fn(),
  })),
}));
```

Default returns `isAdminAccessGranted: false` — matches the anonymous/non-admin path the existing tests already assert against (they only check that `saveRankingsToStorage` is called, which still happens; the `persistToDatabase: false` flag is passed through to the mocked util).

No production code changes needed — the RLS fix itself is correct.

## Verify

```bash
npm run lint
npm run test:file -- src/hooks/__tests__/useTeamRankings.test.ts
```

Both should pass. Then a final `npm test` before opening the PR.

## Deliverable

One commit (or two if you prefer): "chore: prettier autofix + mock useAdminAccess in useTeamRankings tests".
