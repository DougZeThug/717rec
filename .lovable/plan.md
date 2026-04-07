

## Add Edge Case Tests for calculateSOS and calculateWinPercentage

### What we're adding

Two new test cases in existing test files — no production code changes.

### Changes

**1. `src/utils/rankingUtils/__tests__/calculateSOS.test.ts`** — Opponent with missing `division_id`

The source code (line 44) has `if (opponent && opponent.division_id)` — when an opponent has no `division_id`, it's skipped entirely (not counted, no weight added). This is a distinct branch from "division weight missing from map" (which uses the default 0.85). Currently untested.

New test: Create an opponent with `undefined` division_id. When it's the only opponent, `countedOpponents` stays 0, so the function returns the fallback `0.5`.

```ts
it('returns 0.5 when opponent has no division_id', () => {
  const t1 = team('t1', 'div-1');
  const t2 = team('t2'); // no division_id
  const sos = calculateSOS(t1, [t1, t2], [match('t1', 't2')], new Map());
  expect(sos).toBe(0.5);
});
```

**2. `src/utils/rankingUtils/__tests__/calculateWinPercentage.test.ts`** — Large numbers precision

Verify that with very large win/loss counts, the result doesn't suffer floating-point drift that could affect ranking sort order.

```ts
it('handles very large numbers without precision issues', () => {
  const wins = 999999;
  const losses = 1;
  const result = calculateWinPercentage(wins, losses);
  expect(result).toBeCloseTo(999999 / 1000000, 10);
  expect(result).toBeLessThan(1);
  expect(result).toBeGreaterThan(0.999);
});
```

### Scope

2 test files, 1 test case each. No production code changes.

