## Plan: Fix DeepSource JS-0757 (autoFocus prop)

DeepSource flagged that we are using the `autoFocus` prop on several form and calendar elements. Their guidance says this can create usability problems, especially for keyboard users and screen readers, because it unexpectedly jumps the cursor/focus when the page or popover opens.

### What I found
I scanned the entire `src/` folder and found **8** uses of `autoFocus`:

1. `src/components/admin/batch-matches/ThursdayDatePicker.tsx` – Calendar inside a popover
2. `src/components/admin/auto-schedule/DateSettingsPanel.tsx` – Calendar inside a popover
3. `src/components/admin/mass-score-entry/FilterBar.tsx` – Calendar inside a popover
4. `src/components/admin/timeslots/TimeslotsTab.tsx` – Calendar inside a popover
5. `src/components/schedule/ScheduleHeader.tsx` – Calendar inside a popover
6. `src/components/ui/date-picker.tsx` – Calendar inside a popover
7. `src/components/admin/divisions/CreateDivisionDialog.tsx` – Name input inside a dialog
8. `src/components/stats/TeamSearchDrawer.tsx` – Search input inside a drawer

The message you pasted lists 5 of them; the other 3 are in the same code patterns, so I will fix all 8 to keep the rule consistent across the app.

### What I will do
For each file, I will remove the `autoFocus` prop from the element. For the calendars, Radix already traps focus inside the popover when it opens, so the user can still navigate with the keyboard. For the dialog and drawer inputs, the dialog/drawer itself already manages focus, so removing `autoFocus` does not break keyboard behavior.

### Changes per file

- `src/components/admin/batch-matches/ThursdayDatePicker.tsx` – remove `autoFocus` from the `<Calendar />`.
- `src/components/admin/auto-schedule/DateSettingsPanel.tsx` – remove `autoFocus` from the `<Calendar />`.
- `src/components/admin/mass-score-entry/FilterBar.tsx` – remove `autoFocus` from the `<Calendar />`.
- `src/components/admin/timeslots/TimeslotsTab.tsx` – remove `autoFocus` from the `<CalendarComponent />`.
- `src/components/schedule/ScheduleHeader.tsx` – remove `autoFocus` from the `<CalendarComponent />`.
- `src/components/ui/date-picker.tsx` – remove `autoFocus` from the `<Calendar />`.
- `src/components/admin/divisions/CreateDivisionDialog.tsx` – remove `autoFocus` from the `<Input id="division-name" />`.
- `src/components/stats/TeamSearchDrawer.tsx` – remove `autoFocus` from the search `<Input />`.

### Verification
After editing, I will run:

- `npx eslint .` to confirm the JS-0757 issue is gone and nothing else breaks.
- `npm run typecheck` to make sure TypeScript still compiles.
- `npm run test:file -- <relevant-test-files>` to run any tests tied to the changed components.

This is a small, safe set of changes that only removes the flagged prop; no other behavior will be altered.