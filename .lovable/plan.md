# Dependabot bump — production-dependencies group (12 updates)

## Updates

| Package | From | To | Risk |
|---|---|---|---|
| @capacitor/core | 8.3.1 | 8.3.3 | patch — none |
| @sentry/react | 10.51.0 | 10.52.0 | minor — none |
| @supabase/supabase-js | 2.105.1 | 2.105.4 | patch — none |
| @vitest/eslint-plugin | 1.6.16 | 1.6.17 | patch — none |
| **react-day-picker** | **9.14.0** | **10.0.0** | **major — small breaking changes** |
| react-is | 19.2.5 | 19.2.6 | patch — none |
| react-router | 7.14.2 | 7.15.0 | minor — none expected |
| react-router-dom | 7.14.2 | 7.15.0 | minor — none expected |
| tailwind-merge | 3.5.0 | 3.6.0 | minor — none |
| postcss | 8.5.13 | 8.5.14 | patch — none |

## react-day-picker v10 — breaking changes that affect us

v10 only removes APIs that were already deprecated in v9. From the release notes the relevant rename is:

- `initialFocus` → `autoFocus`

Our `src/components/ui/calendar.tsx` already uses the v9 API (`button_previous`, `button_next`, `month_caption`, `day_button`, `Chevron` component) so the wrapper itself needs no changes. Six call sites still pass `initialFocus` and must be updated:

- `src/components/ui/date-picker.tsx:47`
- `src/components/schedule/ScheduleHeader.tsx:65`
- `src/components/admin/timeslots/TimeslotsTab.tsx:153`
- `src/components/admin/mass-score-entry/FilterBar.tsx:55`
- `src/components/admin/auto-schedule/DateSettingsPanel.tsx:80`
- `src/components/admin/batch-matches/ThursdayDatePicker.tsx:73`

No usages of the other removed props (`fromMonth`, `toMonth`, `fromDate`, `toDate`, `formatMonthCaption`, `labelDay`, etc.) anywhere in `src/`.

## Plan

1. **Accept the bump** — install all 12 versions via the Dependabot lockfile (or `npm install` with the new versions). Single commit.
2. **Adapt for react-day-picker v10** — rename `initialFocus` → `autoFocus` in the six call sites listed above. No other code changes needed; the `Calendar` wrapper already uses v9/v10-compatible names.
3. **Verify**
   - `npx tsc --noEmit` (catches any other prop/typing surprise)
   - `npm test` (covers Timeslots and FilterBar tests that use the calendar)
   - Smoke-check date pickers in preview: Schedule header, Admin → Timeslots, Admin → Mass Score Entry, Admin → Auto-Schedule, Admin → Batch Matches.

## Out of scope

- No code changes for the other 9 patch/minor updates — they're drop-in.
- Not migrating to the new `@daypicker/react` scoped package; v10 still publishes under `react-day-picker` and the upgrade path can wait.
