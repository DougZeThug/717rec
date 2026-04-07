

## Fix: "Find My Team" FAB overlapping Career Statistics header

### Problem

The FAB uses `useInView` on the entire `RankingsMobileView` container to control visibility. Since that container is large and remains partially in viewport when scrolling down to Career Statistics, the FAB stays visible and overlaps the Career Statistics header (as shown in the screenshot).

### Fix

In `src/components/stats/RankingsMobileView.tsx`, add a second `useInView` check for the Career Statistics section. The simplest approach: hide the FAB when the user has scrolled past the current standings list.

**Change:** Wrap only the rankings list portion (not the full component) with the `sectionRef`, so `isSectionVisible` becomes false once the actual standings cards scroll out of view. Move `ref={sectionRef}` from the outer `<div>` (line 166) to the inner rankings list `<div>` (around line 230 — the div that maps over `groupedRankings`).

This way, when the user scrolls down to Career Statistics, the rankings cards are no longer in viewport, `isSectionVisible` becomes `false`, and the FAB hides.

### Scope

1 file changed: `src/components/stats/RankingsMobileView.tsx` — move `ref={sectionRef}` from the outer wrapper to the rankings list container.

