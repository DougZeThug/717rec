

## Move Hero Cards Higher on Homepage

### What Changes

Currently the homepage order is:
1. HeroSection (717REC header)
2. LeagueHistoryBar
3. My Next Match
4. Season Participation Card
5. **Hero Cards (from database)** -- your "Playoffs start tonight" card lives here
6. Team of the Week
7. ...

You want the "Playoffs start tonight" card to appear right below the 717REC header. The simplest fix is to move the dynamic hero cards block up in the page layout.

### New Order
1. HeroSection (717REC header)
2. **Hero Cards (from database)** -- moved up here
3. LeagueHistoryBar
4. My Next Match
5. Season Participation Card
6. Team of the Week
7. ...

### Technical Change

**File: `src/pages/Index.tsx`**
- Move the hero cards rendering block (lines 93-104) to right after the LeagueHistoryBar, or even before it, so it renders immediately below HeroSection
- No other files need changes -- the card content and visibility are already managed via the admin panel/database

This is a one-line block move within the JSX, no logic changes needed.

