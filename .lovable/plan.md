

## Redesign Standings Page Mobile Compact View

### What changes

Redesign the mobile compact view on the standings page to match the reference image layout, while keeping existing colors, logos, categories, and the division/all toggle.

### Changes

**1. Redesign compact `RankingCard` layout (`src/components/stats/RankingCard.tsx`)**

Current compact card is a vertical stack (rank+badges row, then logo+name row, then record+score row). Redesign to a single horizontal row matching the reference:

```text
┌──────────────────────────────────────────────────┐
│ 1   🔥  [logo] Hole Burners    Power Score       │
│ ▲6       3-1                      83.1       🔥  │
└──────────────────────────────────────────────────┘
```

- **Left column** (fixed width): Rank number (bold), rank change indicator below it
- **Center**: Team logo + name (no truncate) + record below name
- **Right column**: "Power Score" label (small muted text) + large colored power score value
- **Far right**: Badges/streak icon (keep `TeamBadgeCollection`)
- Remove the separate rows; make it one `flex items-center` row
- Keep expanded state (tap to expand) with the same details

**2. Add League Leaderboard carousel (`src/components/stats/LeagueLeaderboardCarousel.tsx`)**

New component shown above the sort pills on mobile:
- Card with "League Leaderboard" title + team count
- Horizontally scrollable row of the top 3 teams (by power score)
- Each item: rank badge (top-left corner), team logo, "Power Score" label, large score value
- Left/right chevron arrows for scroll indication
- Dot indicators below

**3. Update `RankingsMobileView` (`src/components/stats/RankingsMobileView.tsx`)**
- Import and render `LeagueLeaderboardCarousel` above the sort pills
- Pass top 3 rankings to it

**4. Update `FullRankings` header (`src/components/stats/FullRankings.tsx`)**
- On mobile, simplify the card header: show season + week info alongside the title
- Keep the division/all ViewToggle and collapsible behavior

### Files to create/edit
- **Create**: `src/components/stats/LeagueLeaderboardCarousel.tsx`
- **Edit**: `src/components/stats/RankingCard.tsx` — redesign compact view layout
- **Edit**: `src/components/stats/RankingsMobileView.tsx` — add leaderboard carousel
- **Edit**: `src/components/stats/FullRankings.tsx` — minor header adjustment for mobile

