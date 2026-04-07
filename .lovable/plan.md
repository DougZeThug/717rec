

## Redesign History Page Tables to Match Current Standings Style

### Problem

The history page tables use a plain, dated card design (flat `bg-gray-50` backgrounds, basic grid layouts) that looks noticeably different from the polished current standings cards which use `EntityCard` with proper borders, shadows, and compact layouts.

### Approach

Rebuild `HistoricalStandingsTable`'s mobile rows to use the same `EntityCard` component and compact layout pattern as `RankingCard`, while preserving all historical data (rank, record, games, power score, SOS, champion/runner-up badges).

### Changes

**`src/components/history/HistoricalStandingsTable.tsx`** — Redesign `MobileTeamRow`

Current layout:
```text
┌──────────────────────────────┐
│ #1 👑 [logo] Team Name       │  ← bg-gray-50, flat
│ Record: 8-2 (80.0%)          │
│ Games: 24-6 (80.0%)          │  ← 2x2 grid, "label: value"
│ Power Score: 85.2  SOS: 0.512│
└──────────────────────────────┘
```

New layout (matching RankingCard compact style):
```text
┌──────────────────────────────┐
│ #1 👑 [logo] Team Name  8-2  │  ← EntityCard, single row header
│  ↕  │         Games: 24-6    │
│─────┼────────────────────────│  ← expandable or inline stats
│ Win% 80.0  GW% 80.0         │
│ Power 85.2  SOS 0.512        │  ← compact 2x2 stat grid
└──────────────────────────────┘
```

Key styling changes:
- Wrap each row in `EntityCard` instead of plain div with `bg-gray-50`
- Single-line header: rank + champion/runner-up icon + logo + name + record (right-aligned)
- Compact stat row beneath with small labels and colored values
- Champion/runner-up get a subtle gold/silver left border accent instead of full ring
- Remove verbose "Record:" / "Games:" labels, use abbreviated format

**`src/components/history/HistoricalStandingsTable.tsx`** — Redesign `DesktopTeamRow`

- Add subtle hover transition and rounded row styling consistent with standings desktop view
- Tighten padding and typography to match the polished look

**`src/components/history/DivisionPanel.tsx`** — Minor cleanup

- Remove the `ChampionCard` rendering on desktop (the champion is already highlighted in the table with a gold accent) to reduce visual clutter and match the streamlined standings approach

### Scope

2 files modified. No data or logic changes — purely visual redesign of existing components.

