

## Redesign Team Details Page — Mobile Readability

### Overview
Restructure the team details page for mobile: compact hero, two prominent performance cards, then a clean stack of collapsible sections with summary values. Keep sticky nav and bottom navbar. Combine Team Stats + Advanced Stats into one section just below Roster.

### Changes

**1. Create `src/components/teams/TeamPerformanceCards.tsx`**
- Two side-by-side cards: Power Score (with gauge) and Ranking (with rank change indicator)
- Power Score card shows record below gauge; Ranking card shows `rank/totalTeams` + trend
- Gradient backgrounds matching existing theme

**2. Edit `src/components/ui/CollapsibleSection.tsx`**
- Add optional `summaryValue?: ReactNode` prop
- Render it to the left of the chevron in the trigger row (right-aligned, muted text or colored)
- Enables showing "A-" for Report Card, "7-2" for H2H, etc.

**3. Edit `src/components/teams/TeamHeader.tsx`**
- Reduce mobile logo: `w-28 h-28` (from `w-44 h-44`)
- Tighter margins: `mb-1` gaps between elements
- Keep all existing content (name, division, last match, badges)

**4. Edit `src/components/teams/PlayerList.tsx`**
- Change title from "Players" to "Roster"

**5. Edit `src/pages/TeamDetails.tsx` — Restructure layout**
- Keep `TeamDetailsStickyNav` (sticky nav stays)
- Keep breadcrumbs and back buttons as-is
- Replace `StatBreakdown` with `TeamPerformanceCards` (Power Score + Ranking cards)
- New section order after hero:
  1. `TeamPerformanceCards` (always visible, not collapsible)
  2. `PlayerList` ("Roster") — default open
  3. `StatBreakdown` (renamed "Team Stats & Advanced") — default closed, combines current stats + advanced
  4. `TeamReportCard` — default closed
  5. `RivalryHighlights` — default closed
  6. `HeadToHeadRecords` — default closed
  7. `MatchList` — default closed
  8. `TeamTotals` (Career Stats) — default closed
  9. `TeamAdvancedStatsSection` (Season Breakdown) — default closed
  10. `TeamCareerPowerScoreChart` — default closed
  11. Achievements — default closed
- Keep all existing section IDs for sticky nav compatibility

**6. Edit `src/components/teams/TeamDetailsStickyNav.tsx`**
- Update section IDs to match new layout (remove "analysis" which is already hidden)

### Technical Details

- `TeamPerformanceCards` receives: `powerScore`, `rank`, `totalTeams`, `rankChange`, `wins`, `losses`
- `CollapsibleSection` `summaryValue` rendered as: `<span className="text-sm text-muted-foreground mr-2">{summaryValue}</span>` before the chevron
- `StatBreakdown` stays as-is internally (tabs: Core/Game/Advanced) but defaults to closed
- No data fetching changes — all existing hooks remain

### Files
- **Create**: `src/components/teams/TeamPerformanceCards.tsx`
- **Edit**: `src/components/ui/CollapsibleSection.tsx` (add `summaryValue` prop)
- **Edit**: `src/components/teams/TeamHeader.tsx` (smaller mobile logo)
- **Edit**: `src/components/teams/PlayerList.tsx` (rename to "Roster")
- **Edit**: `src/pages/TeamDetails.tsx` (restructure sections)
- **Edit**: `src/components/teams/TeamDetailsStickyNav.tsx` (update section list)

