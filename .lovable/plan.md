

## Plan: Make Sentry URL scrubbing case-insensitive

### The bug

`scrubUrl` and `scrubQueryString` in `src/utils/sentry.ts` loop over the lowercase `SENSITIVE_QUERY_PARAMS` list and call `URLSearchParams.has(param)`. That check is case-sensitive, so `?TOKEN=...`, `?Password=...`, or `?API_KEY=...` slip through unredacted into Sentry events.

### The fix

Iterate the URL's actual params and compare each key's lowercased form against a lowercase set. Scrub the original key (preserving casing in the URL while replacing the value).

In `src/utils/sentry.ts`:

1. Build a single lowercase lookup once:
   ```ts
   const SENSITIVE_QUERY_PARAMS_LOWER = new Set(
     SENSITIVE_QUERY_PARAMS.map((p) => p.toLowerCase())
   );
   ```
2. Replace both loops with:
   ```ts
   for (const key of Array.from(u.searchParams.keys())) {
     if (SENSITIVE_QUERY_PARAMS_LOWER.has(key.toLowerCase())) {
       u.searchParams.set(key, '[Filtered]');
       mutated = true;
     }
   }
   ```
   (Snapshotting the keys with `Array.from` avoids mutating-while-iterating on `URLSearchParams`.)
3. Same change in `scrubQueryString` against the local `params` object.

No other behavior changes — the scrub list, return shape, and try/catch fallbacks stay identical.

### Test coverage

Create `src/utils/__tests__/sentry.test.ts` (new file). Since `scrubUrl` / `scrubQueryString` aren't exported, expose them for testing by either:
- Exporting them from `sentry.ts` (preferred — small surface, internal helpers), or
- Testing through `scrubSensitiveQueryParams` by exporting it.

Recommended: add `export` to `scrubUrl` and `scrubQueryString` so tests are direct.

Tests:
1. Lowercase param `?token=abc` → filtered (regression — current behavior).
2. Uppercase `?TOKEN=abc` → filtered (new — fails today).
3. Mixed case `?Password=abc&Api_Key=xyz` → both filtered.
4. Non-sensitive param `?page=2` → untouched.
5. Mixed sensitive + non-sensitive preserves order/casing of non-sensitive keys.
6. `scrubQueryString` variant covering the same cases, including with and without leading `?`.

### Files touched

- Edit: `src/utils/sentry.ts` — add lowercase set, swap both loops, export the two helpers.
- Create: `src/utils/__tests__/sentry.test.ts` — the cases above.

### Verification

1. `npm test src/utils/__tests__/sentry.test.ts` — all new cases pass.
2. Existing Sentry behavior unchanged in production (only the matching logic widened).

### Rollback

Revert the two files. One step.

