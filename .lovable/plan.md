## Mobile Card Layout for Head-to-Head Records

### Problem

The H2H records table requires horizontal scrolling on mobile, hiding all the important stats (W-L, Win%, Game W-L, Last Played) off-screen. Only the opponent name and badge are visible without scrolling.

### Solution

On mobile (below `md` breakpoint), replace the table with a vertical card list styled similarly to the Rivalry Highlights cards. On desktop, keep the existing table unchanged.

### Mobile Card Design

Each opponent card will show:

- **Left**: Team logo (same as current table)
- **Right content**:
  - Row 1: Opponent name + rivalry badge (if any)
  - Row 2: W-L record and Win% badge inline (e.g., "3W - 1L | 75.0%")
  - Row 3: Game W-L and last played date in muted text (e.g., "Games: 8-4 | Last: Feb 3, 2026")
- Tapping the card opens the OpponentHistoryModal (replaces the "View Details" button)
- Long-pressing or a small chevron could navigate to the team page (or just keep the card tap = View Details)

### Technical Changes

**File: `src/components/stats/HeadToHeadRecords.tsx**`

1. Add a `useWindowSize` or Tailwind `md:` approach to conditionally render:
  - Below `md`: card list layout
  - At `md` and above: existing table (unchanged)
2. Create an inline `H2HCard` component (within the same file) for each record:
  - Clickable card that opens `OpponentHistoryModal`
  - Shows logo, name, rivalry badge, W-L, Win%, Game W-L, and last played
  - Styled with `rounded-lg border p-3` similar to `RivalryCard`
  - Rivalry-type records get a subtle colored left border accent
3. Search bar and Export CSV button remain above both layouts
4. Sort controls: simplify to a single dropdown/select on mobile (sort by: Wins, Win%, Matches, Name) instead of column header sort buttons

No other files need changes -- this is entirely contained within `HeadToHeadRecords.tsx`.