## Problem

On the mobile Standings page, divisions display in the order of whichever division contains the #1-overall team. Right now Bag Assassins (Intermediate) is ranked #1 league-wide, so the **Intermediate** section shows above **Competitive**.

You want divisions to always render in this fixed order:

1. Competitive
2. Intermediate
3. Recreational

## Root Cause

In `src/components/stats/RankingsMobileView.tsx`, the `rankingsByDivision` map is built by iterating teams in power-score order. JavaScript objects preserve insertion order, so the first division seen wins the top slot. There's no explicit sort applied to the division sections.

## Fix

Apply the existing `getHistoryDivisionOrder` helper (already used on the History page for the same purpose) when rendering the division sections.

### Change

**File:** `src/components/stats/RankingsMobileView.tsx`

In the JSX block that maps `Object.entries(rankingsByDivision)` (around line 240), sort the entries using `getHistoryDivisionOrder` before mapping. This is a one-line addition plus an import.

Pseudocode:
```ts
Object.entries(rankingsByDivision)
  .sort(([a], [b]) => getHistoryDivisionOrder(a) - getHistoryDivisionOrder(b))
  .map(([displayDivision, divisionRankings]) => ( ... ))
```

### Desktop check

I'll also verify `RankingsDesktopView.tsx` handles division grouping the same way, and apply the same sort there if needed, so desktop and mobile stay consistent.

## Verification

After the fix, on the Standings page (Division view):
- Competitive section appears first
- Intermediate second
- Recreational third
- Order remains fixed regardless of which team is ranked #1 overall

## Scope

Small, safe diff. No data changes, no schema changes — purely a display sort fix.
