# Fix `getLeagueMidnightUtc` timezone parsing bug

## Problem
`getLeagueMidnightUtc` in `src/utils/timezone/ranges.ts` converts a league calendar date (America/New_York) to a UTC timestamp. It uses `toLocaleString(..., { timeZone: LEAGUE_TIME_ZONE })` followed by `new Date(string)`. That re-parses the formatted string in the **runtime's local timezone**, not in UTC or America/New_York. In a non-UTC browser this produces wrong UTC instants, so weekly recap windowing excludes the correct matches and includes adjacent days.

## Scope
- Fix the single function.
- Add regression tests that fail under the old implementation outside UTC and pass after the fix.
- Verify the weekly recap service and any dependent tests still pass.

## Implementation

### 1. Replace the parsing algorithm in `src/utils/timezone/ranges.ts`
Use `Intl.DateTimeFormat.formatToParts` to extract year/month/day/hour/minute/second in `America/New_York` without parsing ambiguity, then compute `Date.UTC` from those parts.

```text
naive = Date.UTC(year, month - 1, day, 0, 0, 0)
formatter = Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', ..., hour12: false })
parts = formatter.formatToParts(new Date(naive))
localMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
return new Date(naive + (naive - localMs))
```

### 2. Add regression tests in `src/utils/timezone/__tests__/timezoneUtils.test.ts`
- Assert `getLeagueMidnightUtc(2026, 1, 15)` returns `2026-01-15T05:00:00.000Z` (EST offset +5).
- Assert `getLeagueMidnightUtc(2026, 7, 15)` returns `2026-07-15T04:00:00.000Z` (EDT offset +4).
- Optionally test with a mocked non-UTC runtime timezone to prove the fix is independent of host TZ.

### 3. Verification
- Run `npx eslint . --fix` on the modified files.
- Run the timezone utility test file: `npm run test:file -- src/utils/timezone/__tests__/timezoneUtils.test.ts`.
- Run the weekly recap service tests if they exist: `npm run test:file -- src/services/weeklyRecap/__tests__` or equivalent.
- Run a fast typecheck: `npm run typecheck`.

## Out of scope
- No changes to the weekly recap business logic itself; only the underlying timezone conversion helper.
- No database changes.
