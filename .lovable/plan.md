

## Problem: Teams Won't Be Grouped By Their Actual Playoff Bracket

The `archive_season` RPC currently sets `division_name` for all teams using the `display_division` from the `divisions` table. This collapses all intermediate sub-divisions into just **"Intermediate"**, regardless of how many brackets existed.

The frontend then tries to re-split "Intermediate" into "Intermediate 1" / "Intermediate 2" using a **rank cutoff of 8** — a fragile hack that breaks when:
- A single Intermediate bracket has more than 8 teams (Winter 2026 has 1 bracket — it would incorrectly split)
- Two brackets have unequal team counts

### What the data actually looks like

For **Fall 2025** (2 intermediate brackets): All intermediate teams have `division_name = 'Intermediate'` and the frontend splits by rank. This works by coincidence but is semantically wrong.

For **Winter 2026** (1 intermediate bracket): The rank-cutoff split would incorrectly create "Intermediate 1" and "Intermediate 2" panels when there should be just one "Intermediate" panel.

### The Fix: Use Bracket Data to Set Division Names

In Step 3 of the RPC (ranking), the function already loops through each bracket. After assigning ranks, it should **update `division_name`** on `team_season_stats` for teams in that bracket based on the bracket context:

1. Count how many brackets share the same `display_division` in this season
2. If there's **1 bracket** for that display_division → set `division_name` to just the display_division (e.g., "Intermediate")
3. If there are **2+ brackets** → set `division_name` to "Intermediate 1", "Intermediate 2", etc., based on bracket title or ordering

This replaces the current Step 2 (which blindly uses `display_division`) with bracket-aware logic in Step 3.

### Frontend Cleanup

Remove `getHistoryDivisionDisplayNameWithRank()` from `SeasonAccordion.tsx` — the rank-based splitting hack is no longer needed. Use `getHistoryDivisionDisplayName()` directly since the RPC now stores the correct division name.

Update `historyDivisionUtils.ts` to handle "Intermediate 1" / "Intermediate 2" ordering (already mostly works).

### Changes

| What | Change |
|---|---|
| `archive_season` RPC | Replace Step 2 with bracket-aware division naming in Step 3. For each bracket, determine if its display_division has sibling brackets; if so, number them. Set `division_name` on `team_season_stats` per-bracket. |
| `SeasonAccordion.tsx` | Replace `getHistoryDivisionDisplayNameWithRank()` with `getHistoryDivisionDisplayName()` — no more rank-based splitting |
| `historyDivisionUtils.ts` | Remove `getHistoryDivisionDisplayNameWithRank()` (dead code after change) |

