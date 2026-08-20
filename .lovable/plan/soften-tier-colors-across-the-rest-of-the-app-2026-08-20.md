# Soften tier colors across the rest of the app

The playoff cards already use the muted `--competitive-soft` / `--intermediate-soft` / `--recreational-soft` tokens. Several other screens still use the full-strength red / amber / green. This plan extends the softer look to those places, without changing which tier is which color.

## Where the harsh tones still show

1. **Team cards - division badge** (`SeasonRow`, and everything else that calls `getDivisionBadgeColor`)
   - Today: `bg-red-500/20 text-red-400`, hard Tailwind colors. These ignore the theme and stay bright in light mode.
2. **Schedule timeslot chips** (`TimeslotGrouping`, `TimeslotGroupBits`)
   - Today: solid `bg-[hsl(var(--competitive))]` fills. These are the loudest surfaces left - full saturation blocks of red / amber / green in the schedule grid.
3. **Admin division rows** (`DivisionRow`) - full-strength tier text color.
4. **Division card gradients and headers** (`getDivisionGradientClass`, `getDivisionHeaderClass` in `divisionColors.ts`, plus `design-system/cards.ts`) - hard-coded `red-50` / `amber-100` / `emerald-900` values that do not follow the theme.

## What changes

- Add soft variants to the shared design-system helper so any component can ask for a muted tier style:
  - extend `getDivisionSoftClasses` with `badge`, `chip` (tinted fill + readable text, not a solid block), and `softBg` entries.
  - add a `soft: true` option to `getDivisionStyles` so the schedule chips can switch with a one-line change.
- Rewrite `getDivisionBadgeColor` to use the soft tokens instead of raw Tailwind colors, so every badge in the app softens at once.
- Switch the schedule timeslot chips from a solid tier fill to a tinted background with tier-colored text and a thin tier border - same instant recognition, far less glare.
- Convert the gradient and header helpers from raw Tailwind colors to the soft tokens, so light and dark mode both stay in the theme.
- Keep the bright `--competitive` / `--intermediate` / `--recreational` tokens as they are. Small, sparse accents (icons, single dots) can still use them.

## Verification

- Playwright screenshots of Teams, Schedule, Standings, Playoffs and the admin Divisions tab, in dark and light mode, before and after.
- Run the affected test files plus a typecheck.

## Technical notes

- Files touched: `src/utils/colors/divisionColors.ts`, `src/styles/design-system/divisions.ts`, `src/styles/design-system/cards.ts`, `src/components/schedule/TimeslotGrouping.tsx`, `src/components/schedule/timeslot-grouping/TimeslotGroupBits.tsx`, `src/components/admin/divisions/DivisionRow.tsx`.
- No component needs a new import beyond the existing helpers; the change is centralised in the two color utility modules.
- No database, service, or hook changes.
