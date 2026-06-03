## Problem

`formatWithPattern` and `toLocalDateString` use `new Date(value)` on date-only strings like `'2026-05-14'`, which JavaScript parses as UTC midnight. In US timezones (negative UTC offset), formatting that instant in local time shifts the displayed day back by one (e.g., "Thu, May 14" → "Wed, May 13").

## Fix

In `src/utils/formatDateSafe.ts`, detect date-only `YYYY-MM-DD` strings and parse them as local-time dates instead of UTC.

- Add a small helper `parseSafe(value)` that:
  - For strings matching `/^\d{4}-\d{2}-\d{2}$/`, constructs `new Date(year, month - 1, day)` (local midnight).
  - For other strings, uses `parseISO(value)` from `date-fns` (preserves correct behavior for full ISO timestamps with offsets).
  - For numbers/Dates, uses `new Date(value)`.
- Use this helper in `formatWithPattern`, `toLocalDateString`, and `formatDistanceFrom` so all three behave consistently.

Existing callers are unaffected because correctly-offset ISO timestamps still parse the same way.

## Verification

Run the failing tests in `src/utils/__tests__/formatDateSafe.test.ts` and confirm they pass in both `America/New_York` and `America/Los_Angeles`.