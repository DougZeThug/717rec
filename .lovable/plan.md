## Goal
Turn the existing dense "Player Stats" table on Team Details into scannable **per-player stat cards** that fit the page's mobile-first, mostly-collapsed layout. Data source, hook, and section placement stay the same — only the presentation inside `TeamPlayerStatsSection` changes.

## Why cards (given current structure)
- `TeamDetails.tsx` is a stack of `CollapsibleSection` blocks (Roster, Stats, Report Card, etc.) — a scrollable card list matches that rhythm better than a horizontally-scrolling table.
- The section already sits directly under the Roster (`PlayerList`), so cards make it read as "roster + roster stats" instead of a spreadsheet.
- Existing performance-cards + entity-card patterns give us a consistent look with the rest of the page. No new primitives needed.

## Card design (per player)

```text
┌──────────────────────────────────────────┐
│ Doug Weidensaul               42 rounds  │  ← name + sample size (right-aligned, muted)
│                                          │
│   PPR  7.2         DPR  +1.4             │  ← headline row: two big numbers
│                                          │
│   Hole 31% ▓▓▓░░░░  Board 46% ▓▓▓▓░░░   │  ← thin proportional bar (Hole/Board/Off)
│   Off  23% ▓▓░░░░░░                      │
│                                          │
│   4B 6      Games 5–2                    │  ← footer meta row (muted)
└──────────────────────────────────────────┘
```

- **Header row**: player name (semibold) + `Rounds N` chip on the right.
- **Headline row**: `PPR` (large, tabular-nums) with `DPR` (medium, signed, colored green ≥0 / red <0).
- **Bag mix**: single stacked bar segmented Hole / Board / Off using existing division-neutral tokens (emerald / amber / muted). Percentages labeled inline. Only rendered when `totalBags > 0`; otherwise a muted "Bag placement not tracked" line replaces it.
- **Footer row**: `4B N` and `Games W–L`.

Uses `Card`/`CardContent` from `@/components/ui/card` plus existing typography tokens — no new UI primitive.

## Layout

- Cards stack 1-col on mobile, `md:grid-cols-2`, `lg:grid-cols-3` — matches `TeamPerformanceCards` grid conventions.
- Section stays as `CollapsibleSection` titled "Player Stats", still `defaultOpen={false}`, still self-hidden when there's no data. Footer explainer sentence about PPR/DPR/bag % is preserved.

## Changes

### 1. `src/components/teams/TeamPlayerStatsSection.tsx`
- Replace the `<table>` block with a responsive grid of cards.
- Extract the per-player card into a local `PlayerStatCard` sub-component (same file) that takes the existing `stats` row from `useTeamPlayerSeasonStats` — no changes to hook or service.
- Reuse `pointsPerRound`, `differentialPerRound`, `percentage`, `formatPercent`, `formatRatio` — already imported.
- Add small DPR color logic: `text-emerald-600` when ≥0, `text-destructive` when <0.

### 2. Tests (`src/components/teams/__tests__/TeamPlayerStatsSection.test.tsx`)
- Update assertions to match card DOM instead of table rows.
- Cover:
  - Renders one card per player with name and headline PPR.
  - DPR positive vs negative gets correct color class.
  - Bag mix bar renders when `totalBags > 0`; falls back to "not tracked" copy when all bag columns are null/zero.
  - Section stays hidden when `stats` is empty (existing behavior — keep the assertion).

## Out of scope
- No new stats (no Big rounds — user answered "skip").
- No changes to data fetching, hooks, services, or the underlying section title/collapse behavior.
- No changes to other Team Details sections (Roster, Report Card, Advanced Stats, etc.).
- No table-view toggle — cards replace the table outright.
