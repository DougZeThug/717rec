# Tighten the desktop Career Statistics table

**Goal:** show every career stat on one screen, with Power Score up front and styled like the mobile cards.

## What changes

**1. Power Score moves left**
- New column order: `#` | Team | **Power** | Record | Win % | Game Record | Game Win % | Playoff | Titles | SOS.
- Power Score is the visual anchor: larger, bold, tabular numbers, colored by tier (same colors already used on mobile).

**2. Fewer, tighter columns**
- Merge Championships and Runner-ups into one **Titles** column: `🏆 x4  🥈 x1`, dash when none.
- Shorten headers: "Career Record" to "Record", "Game Win %" to "GW %", "Playoff Record" to "Playoff", "Career Power Score" to "Power", "Career SOS" to "SOS".
- Team column min width drops from 200px to about 150px, with the name truncating on very long names.
- Numeric columns get fixed compact widths and tighter cell padding so the table fits a 1280px screen with no sideways scrolling.

**3. Mobile-style polish on desktop**
- Team logo uses the shared `TeamLogo` component (same as mobile), so missing logos fall back correctly.
- Win %, Game Win %, and SOS keep their existing color helpers; all numbers use tabular figures for clean column alignment.
- Top 3 rows get a subtle rank emphasis, matching the standout treatment mobile gives the leaders.
- Sorting behavior stays exactly as it is today; the merged Titles column sorts by championships.

**4. Safety**
- The wrapper keeps `overflow-x-auto` as a fallback for very narrow windows, but at normal desktop widths nothing is cut off.

## Technical notes

- Single file: `src/components/stats/career/CareerRankingsDesktopView.tsx`.
- No data, hook, or service changes; `CareerRanking` type untouched.
- Reuses `getPowerScoreColor`, `getWinPercentageColor`, `getSosColor`, `formatPowerScore`, and `TeamLogo`.
- Existing tests under `src/components/stats/career/__tests__` will be run; any header-text assertions get updated to the new labels.
