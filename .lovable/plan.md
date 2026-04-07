

## Redesign History Mobile Cards to Match Standings Cards

### Problem

The history page mobile cards use a flat 4-column stat grid with bare centered text, while the standings cards use `bg-muted/50` rounded stat cells, a `PowerScoreGauge` ring, and a richer layout. The two look completely different.

### What changes

**`src/components/history/HistoricalStandingsTable.tsx`** — Rebuild `MobileTeamRow` to mirror the `RankingCard` detailed view layout:

**Current layout:**
```text
┌────────────────────────────────┐
│ -  [logo] Team Name       9-1  │
│  Win%   GW%   Power   SOS     │  ← bare centered text, no backgrounds
│  90.0%  79.2%  81.9  0.885    │
└────────────────────────────────┘
```

**New layout (matching RankingCard):**
```text
┌────────────────────────────────┐
│ 👑 [logo] Team Name       9-1  │  ← header row (same)
│                                │
│ ┌──────┐  ┌─────────┬────────┐│
│ │ 81.9 │  │Win% │Game%     ││  ← PowerScoreGauge + 2x2 grid
│ │ PWR  │  │90.0%│79.2%     ││     with bg-muted/50 rounded cells
│ └──────┘  ├─────────┼────────┤│
│           │SOS  │GW        ││
│           │0.885│24-6      ││
│           └─────────┴────────┘│
└────────────────────────────────┘
```

Key changes:
1. Add `PowerScoreGauge` component (same as RankingCard) on the left
2. Replace flat 4-column grid with 2x2 grid using `rounded-md bg-muted/50 px-2 py-1.5` cells
3. Use `text-[10px]` labels + `text-sm font-bold` values (matching RankingCard exactly)
4. Add game record (W-L) as a stat cell, replace GW% with it
5. Keep champion/runner-up left border accents

### Scope

1 file changed: `src/components/history/HistoricalStandingsTable.tsx` — `MobileTeamRow` component only. Desktop view unchanged.

