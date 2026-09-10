# Schedule filter pills: drop "Hidden", shorten labels

## What changes

- The **Hidden** pill disappears from the schedule filter row. Hidden teams are meant to stay out of the season view, so offering a filter for them is wrong.
- Division pills get short labels: **Comp**, **Int**, **Rec**. Full names stay available to screen readers.
- With shorter labels, All + Comp + Int + Rec + My team fit on one row on a phone.

## Note on the second request

The collector signup / guest-pull merge flow does **not** exist in this project. There is no collector, guest pull, or pack code here (checked earlier too — it belongs to another project). Nothing to walk through. Confirm if you want it built here instead.

## Technical detail

`src/utils/schedule/matchFilters.ts`
- `buildDivisionOptions` skips any division whose display label is `Hidden` (case-insensitive, also covers `Hidden2`), same rule `teamGrouping.ts` and the playoff view model already use.
- `DivisionOption` gains a `shortLabel` field: Competitive -> Comp, Intermediate -> Int, Recreational -> Rec; unknown labels fall back to the full label.

`src/components/schedule/ScheduleFilters.tsx`
- Chip renders `shortLabel`, with `aria-label` set to the full label so the accessible name stays clear.
- Colour lookup keeps using the full label.

Tests
- `src/components/schedule/__tests__/ScheduleFilters.test.tsx` updated to query by accessible name (full division names still work) and to assert the short visible text.
- Add a case to the matchFilters tests: a `Hidden` division produces no option.
