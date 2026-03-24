

## Improve Standings Mobile: Leaderboard, Toggles, and Sort Pills

### Changes

**1. Redesign `LeagueLeaderboardCarousel.tsx`**
- Side-by-side layout: "League Leaderboard" title + count on the left, 3 team cards scrolling horizontally on the right
- Rank-based colored borders (gold/silver/bronze)

**2. Move ViewToggle below carousel, hide header toggle on mobile (`RankingsMobileView.tsx` + `FullRankings.tsx`)**
- `FullRankings`: conditionally hide ViewToggle on mobile, pass `view`/`onViewChange` through props to `RankingsTable` → `RankingsMobileView`
- `RankingsMobileView`: render a compact ViewToggle between carousel and sort pills

**3. Replace compact/detailed Switch with a highlighted ToggleGroup (`RankingsMobileView.tsx`)**
- Two-button segmented control ("Compact" / "Detailed") with active state clearly colored (e.g. `bg-cornhole-navy text-white`)

**4. Hide sort pills in compact view (`RankingsMobileView.tsx`)**
- Wrap the sort pills container in a conditional: only render when `detailedView` is true
- In compact view, power score is always shown so sorting by it is the implicit default

**5. Prop threading**
- `FullRankings` → `RankingsTable` → `RankingsMobileView`: add `view` and `onViewChange` props
- `RankingsTable` passes them through

### Files
- **Edit**: `src/components/stats/LeagueLeaderboardCarousel.tsx`
- **Edit**: `src/components/stats/RankingsMobileView.tsx`
- **Edit**: `src/components/stats/RankingsTable.tsx` (pass through view props)
- **Edit**: `src/components/stats/FullRankings.tsx` (hide mobile ViewToggle, pass props)

