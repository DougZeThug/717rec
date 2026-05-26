## Problem
The `handleApplySchedule` function in `usePairingOperations.ts` rejects valid schedules when the generation date and selected date are the same calendar day but have different time components (e.g., generated at 10:30 AM, reselected via Calendar at midnight). The stale check uses millisecond-precision `getTime()` comparison instead of day-level comparison.

## Root Cause
- `selectedDate` is initialized with `new Date()` (includes current time)
- `react-day-picker` Calendar returns dates normalized to midnight (00:00:00.000)
- `generationDate` keeps the original time from when pairings were generated
- `getTime()` comparison treats same-day, different-time as "different"

## Fix (1 line change + 1 import)
1. Import `normalizeScheduleDate` from `@/utils/autoSchedule/dateUtils` (already exists in codebase)
2. Replace `generationDate.getTime() !== selectedDate.getTime()` with `normalizeScheduleDate(generationDate) !== normalizeScheduleDate(selectedDate)`

This compares dates at the calendar-day level (YYYY-MM-DD strings), matching the existing normalization pattern used elsewhere in the auto-scheduler.

## Tests to Add
In `src/hooks/useAutoSchedule/__tests__/usePairingOperations.test.ts`:
- Update the `dateUtils` mock to include `normalizeScheduleDate`
- Add test: same calendar day, different times → should apply successfully (proves fix)
- Add test: different calendar days → should reject as stale
- Add test: identical timestamps → should apply successfully (regression guard)

## Verification
- Run unit tests for `usePairingOperations.test.ts`
- All existing tests should continue passing
- New tests should pass, confirming the bug is fixed