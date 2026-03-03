

## Problem

The `ScrollArea` wrapping the grouped navigation has `max-h-[60vh]` (line 198 in `AdminMobileNav.tsx`). On a small mobile viewport (360x420 from session replay), that's only ~252px — not enough to display all 4 groups. The Radix `ScrollArea` component may not be properly scrolling within this constrained height, causing the bottom groups ("Teams & Players" and "Settings & Content" which contains Blind Draw) to be cut off entirely.

Additionally, the group container has `overflow-hidden` (line 205) for border-radius clipping, which could compound the issue.

## Fix

| File | Change |
|---|---|
| `AdminMobileNav.tsx` line 198 | Remove the `ScrollArea` wrapper entirely. Let the groups render in normal document flow so the page itself scrolls. The admin nav is already inside a scrollable page — adding a nested scroll container causes these visibility issues. |
| `AdminMobileNav.tsx` line 205 | Change `overflow-hidden` to `overflow-visible` on the group container divs so nothing gets clipped. Use `rounded-lg` border clipping via a different approach or just keep `overflow-visible`. |

The result: all 4 groups are always visible, the page scrolls naturally, no nested scroll containers or overflow clipping.

