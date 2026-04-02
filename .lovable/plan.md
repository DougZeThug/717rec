

## iPhone/Safari Audit: Pain Points Found

I audited the codebase for patterns known to cause problems on iPhone Safari. Here's what I found:

### Issue 1: `useTransition` in RankingsTable (same bug as CollapsibleSection)

**File:** `src/components/stats/RankingsTable.tsx` (line 89)

The same `startTransition` pattern we just fixed in `CollapsibleSection` is used here for sort option changes. On iOS Safari, tapping a sort header could silently fail to update the sort order.

**Fix:** Remove `useTransition`, call `setSortOptions` directly. Sorting a memoized array is fast -- no benefit from deferred rendering.

---

### Issue 2: `100vh` usage causes content hidden behind Safari's bottom bar

**Files:** `MessageFeed.tsx`, `MessageFeedSkeleton.tsx`, `AuthContainer.tsx`, `ProfileSetup.tsx`

These use `calc(100vh - Xpx)` for height calculations. On iOS Safari, `100vh` includes the area behind the URL bar, so content gets cut off at the bottom. The fix is to use `100dvh` (dynamic viewport height) which accounts for Safari's collapsing address bar.

**Fix:** Replace `100vh` with `100dvh` in these height calculations.

---

### Issue 3: Radix ScrollArea in sticky nav may swallow touch events on iOS

**File:** `src/components/teams/TeamDetailsStickyNav.tsx`

The sticky nav uses Radix `ScrollArea` for horizontal scrolling. Radix ScrollArea uses custom scrollbar rendering that can interfere with iOS touch scrolling on narrow containers. Since this is a simple horizontal scroll with a few items, native `overflow-x-auto` with `-webkit-overflow-scrolling: touch` is more reliable on iOS.

**Fix:** Replace `<ScrollArea>` with a native `<div className="overflow-x-auto">` wrapper.

---

### Issue 4: `contain: layout style` on home page cards may suppress touch on iOS

**Files:** `WeeklyRecapCard.tsx`, `TeamOfTheWeekCard.tsx`, `LeagueHistoryBar.tsx`, `Footer.tsx`, `TopTeams.tsx`, skeletons

Multiple components use `style={{ contain: 'layout style' }}`. Per the existing memory note about Safari containment bugs, `contain: layout` can suppress pointer events on dynamic content in some WebKit versions. These are interactive cards (clickable links).

**Fix:** Remove `contain: layout style` from interactive/clickable elements. Keep it only on static layout containers like Footer and skeletons where there are no touch targets inside.

---

### Summary of Changes

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| 1 | `useTransition` sort | `RankingsTable.tsx` | Low |
| 2 | `100vh` → `100dvh` | `MessageFeed.tsx`, `MessageFeedSkeleton.tsx`, `AuthContainer.tsx`, `ProfileSetup.tsx` | Low |
| 3 | ScrollArea in sticky nav | `TeamDetailsStickyNav.tsx` | Low |
| 4 | `contain: layout style` on interactive cards | `WeeklyRecapCard.tsx`, `TeamOfTheWeekCard.tsx`, `LeagueHistoryBar.tsx`, `TopTeams.tsx` | Low |

All low-effort, targeted fixes. No visual or behavioral changes on desktop. No new files needed.

