

## Fix: "Find My Team" button overlapping Career Statistics chevron

### What's wrong

The "Find My Team" floating button (the person icon) in the current standings section uses `position: fixed` with `z-50`, so it stays on screen even when you scroll down to the Career Statistics section. It lands right on top of the expand chevron, and clicking it scrolls you back up to your team in the current standings instead of expanding career stats.

### Fix

**File:** `src/components/stats/RankingsMobileView.tsx` (line ~302)

Change the FAB from `fixed` to `sticky` positioning, so it only floats within the current standings section and disappears when you scroll past it. This keeps the "Find My Team" button accessible within current standings but prevents it from covering the career section below.

Alternatively, if sticky doesn't work well within the card layout, we can scope it by:
- Adding a portal or conditional render that only shows the FAB when the current standings section is in viewport (using an IntersectionObserver)

The simplest reliable fix: wrap the FAB render in an IntersectionObserver check — only show it when the current standings container is visible on screen.

### Scope

One file changed (`RankingsMobileView.tsx`). No data or logic changes — purely a positioning fix.

