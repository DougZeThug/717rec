

## Redesign Career Statistics Table to Match Current Standings Design

### What's changing

The career statistics section currently uses a plain card/table design that looks inconsistent with the polished standings cards above it. We'll rebuild it to mirror the standings design — using `EntityCard`, `TeamLogo`, `PowerScoreGauge`, and the same compact/detailed layout patterns.

We'll also:
- Remove the "show hidden teams" toggle — career stats will always include all teams (per your request that all teams across all seasons should be visible)
- Show championship trophies (🏆) inline in compact view instead of badges
- Only show sort pills when in detailed view (matching standings behavior)

### Technical details

**File 1: `src/components/stats/career/CareerRankingsSection.tsx`**
- Remove the `useCareerRankingsWithHidden` hook — replace with `useCareerRankings` (which already fetches all teams)
- Remove the hidden teams toggle (Switch, Eye/EyeOff icons, tooltip)
- Remove `showHidden` prop from `CareerRankingsTable`
- Keep the collapsible card wrapper, export button, and loading/error states

**File 2: `src/components/stats/career/CareerRankingsTable.tsx`**
- Remove `showHidden` prop
- Pass it through to views without the prop

**File 3: `src/components/stats/career/CareerRankingsMobileView.tsx`** (major rewrite)
- Replace the current card-based layout with the standings pattern:
  - Use `ToggleGroup` for Compact/Detailed toggle (matching standings style)
  - Sort pills only visible in detailed view
  - **Compact view**: Use `EntityCard` with the same layout as `RankingCard` compact:
    - Left: rank number
    - Logo + team name + record (W-L) + win% inline
    - Championship trophies (🏆×N) instead of badge collection
    - Right-aligned: Power Score with label
  - **Detailed view**: Use `EntityCard` with the standings detailed pattern:
    - Top row: rank + championship trophies
    - Team row: logo + name + record
    - Bottom: `PowerScoreGauge` on left, 2x2 stat grid on right (Win %, SOS, Game Record, Game %)
- Remove `showHidden` prop and hidden team badge
- Remove `PercentileBadge` usage (keep it clean like standings)

**File 4: `src/components/stats/career/CareerRankingsDesktopView.tsx`**
- Remove `showHidden` prop and hidden team badge/styling
- Keep the sortable table (desktop has enough room for it)
- Minor cleanup: remove hidden-team-specific conditional classes

**File 5: `src/hooks/useCareerRankingsWithHidden.ts`**
- Simplify: always fetch with `includeHidden: true`
- Remove `showHidden` state, `toggleShowHidden`, localStorage persistence, and `hiddenTeamCount`
- Or alternatively, just update `CareerRankingsSection` to use `useCareerRankings` directly with hidden teams included

### What stays the same
- Career data calculation logic (no changes)
- Desktop table structure (just removing hidden toggle)
- CSV export functionality
- Collapsible section behavior

### Scope
5 files changed. Mobile view is the biggest change (full visual redesign). No data/logic changes — purely presentational.

