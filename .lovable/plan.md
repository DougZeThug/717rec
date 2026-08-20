# Admin panel visual audit + Auto Scheduler bleed fix

## What I found

The Auto Scheduler top row has two real overflow causes on desktop:

1. **Step tab strip bleeds past the card edge.** The `1. Teams / 2. Matches / 3. Export`
   strip is a full-width grey block placed flush inside a rounded `Card` that has no
   `overflow-hidden`. Its corners stick out past the card's rounded border, which reads as
   "bleed" at the top row.
2. **Header buttons crowd the numbers.** Inside the Teams tab the title/description and the
   `Reset to Auto-Loaded` + `Edit Teams` buttons sit in one non-wrapping
   `flex justify-between` row. On desktop this card is only 2 of 3 grid columns wide, so at
   1280-1440px the buttons squeeze or push out of the row.

Other admin areas share the same two patterns, so the fix is the same shape everywhere.

## Fix plan (presentation only, no logic changes)

### A. Auto Scheduler (the reported bug)
- Clip the tab strip to the card: add `overflow-hidden` to the workflow card and remove the
  square corners from the flush `TabsList`.
- Let the step labels shrink gracefully: allow truncation and reduce label size on smaller
  desktop widths so `1. Teams` etc. never push the strip wider than the card.
- Make the Teams tab header row wrap: `flex-wrap` with the button group allowed to drop to a
  second line, buttons `shrink-0`, text block `min-w-0`.
- Same wrap treatment for the Matches tab header (edit-mode toggle + save buttons) and the
  Export tab header.
- Diagnostic panel: let the trigger row shrink (`min-w-0` + truncate on the title) so the
  chevron stays inside the card.

### B. Audit sweep — same defects elsewhere
Check and apply the identical wrap/clip pattern where present:
- Batch Match Creation (auto-schedule section header + action row)
- Mass Score Entry header controls
- Team Management, Divisions, Requests table headers
- Season Management and League Night Status stat rows
- Any admin `TabsList` with a fixed `grid-cols-N` that must hold long labels

### C. Mobile check
- Confirm no admin panel forces horizontal page scroll at 390px.
- Wide tab strips become horizontally scrollable instead of squashed.
- Stat/number rows stack instead of clipping.

## Verification
- Screenshot the Auto Scheduler at 1280, 1440 and 390px wide, before and after.
- Run `npm run typecheck`, `npx eslint .`, and the admin component tests.

## Notes
- Only Tailwind class changes in admin components — no data, hooks, or service changes.
- I could not sign into the admin preview from here (external Supabase), so the audit list is
  built from the code patterns; I will screenshot-verify each fixed area during the build.
