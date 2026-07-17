## Fix

The `TrafficMiniChart` I added to `LeagueNightStatusTab` uses `useQuery`, but the tab's test doesn't wrap render in a `QueryClientProvider`. Mock the child component in the test file — matches the existing pattern (the test already mocks `useOpsHealth`) and keeps the test scoped to the tab's own logic.

## Change

**`src/components/admin/league-night-status/__tests__/LeagueNightStatusTab.test.tsx`** — add alongside the existing `vi.mock` block:

```ts
vi.mock('../TrafficMiniChart', () => ({
  default: () => <div data-testid="traffic-mini-chart" />,
}));
```

## Verify

`npm run test:file -- src/components/admin/league-night-status/__tests__/LeagueNightStatusTab.test.tsx` — all 6 tests pass.
