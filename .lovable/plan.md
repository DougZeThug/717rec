## Problem

Three tests fail with errors like:
- `supabase.from(...).select(...).eq is not a function`
- `supabase.from(...).select is not a function`

The new `BracketStandingsService` pre-check added a `supabase.from('match').select(...).eq('stage_id', ...)` query. Two older test files have Supabase mocks that don't support that chain:

1. `tests/bracketManagerPhase0.test.ts` — `select` is `mockResolvedValue(...)`, so `.eq()` doesn't exist on its return value.
2. `tests/repro_bracket_standings.test.ts` — mocked `from()` only returns an `upsert`, no `select` at all.

The newer, well-structured `src/services/brackets/manager/services/__tests__/BracketStandingsService.test.ts` already handles this correctly (it branches by table name) and passes.

## Fix

Only test-file changes — no production code touched.

### 1. `tests/bracketManagerPhase0.test.ts`
Replace the `select: vi.fn().mockResolvedValue(...)` line with a chainable that supports `.eq(...)` resolving to `{ data: [], error: null }`:

```ts
select: vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ data: [], error: null }),
}),
```

This keeps existing await-on-select behavior working for callers that don't chain (they get the chain object back, but the only failing tests are the standings ones).

### 2. `tests/repro_bracket_standings.test.ts`
Update the `supabase.from` mock to branch by table name, mirroring the pattern in the newer service test:

```ts
supabase: {
  from: vi.fn((table: string) => {
    if (table === 'match') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }
    if (table === 'playoff_team_records') {
      return { upsert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return {};
  }),
},
```

## Verify

Run:
```
npx vitest run tests/bracketManagerPhase0.test.ts tests/repro_bracket_standings.test.ts
```
All three previously failing tests should pass, and no other tests should regress.