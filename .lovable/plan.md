

## Simplify Standings Page Header on Mobile

### What changes

Remove the redundant "STANDINGS" title, description, and Insights button from the page header area on mobile. Move the Insights button next to the SeasonBadge row. Rename the card title from "Standings" to "Current Standings" on mobile.

### Changes

**1. `src/components/stats/containers/StatsPageHeader.tsx`**
- On mobile: remove the `PageHeader` (title + description) entirely
- Move the Insights button to sit inline with the SeasonBadge row (flex row: SeasonBadge on left/center, Insights button on right)
- On desktop: keep existing layout unchanged

**2. `src/components/stats/FullRankings.tsx`**
- Change mobile card title from "Standings" to "Current Standings" (line 70)

### Layout (mobile)
```text
   [SeasonBadge: Winter 2 2026 • Week 3]  [💡 Insights]
┌─ CURRENT STANDINGS ──────────────── ▲ ─┐
│  League Leaderboard ...                 │
```

### Files
- **Edit**: `src/components/stats/containers/StatsPageHeader.tsx`
- **Edit**: `src/components/stats/FullRankings.tsx` (line 70: change `'Standings'` → `'Current Standings'`)

