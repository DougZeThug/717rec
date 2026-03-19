

## Redesign Mass Score Entry to Match Reference Layout

### What changes
The score entry card layout will be restructured so team names are stacked vertically with logos (Team 1 top-left, "vs" center, Team 2 bottom-right), matching the reference image. The score buttons remain in a horizontal row below. The generic hint text is removed since the visual layout itself makes the association clear.

### Changes

**File 1: `src/components/admin/mass-score-entry/MatchRow.tsx`**
- Restructure the team display section to use a stacked vertical layout:
  - Team 1: logo + name aligned left
  - "vs" text centered below
  - Team 2: logo + name aligned right
- This replaces the current side-by-side / inline layout with the stacked pattern from the reference image

**File 2: `src/components/admin/mass-score-entry/components/ScoreButtonGroup.tsx`**
- Remove the `(First number represents Team 1's game wins)` hint text — the stacked team layout above makes it self-evident
- Accept `team1Name` and `team2Name` props
- Add small abbreviated team name labels flanking the button row (left label for team 1, right label for team 2) as a subtle reinforcement

**File 3: `src/components/admin/mass-score-entry/components/ScoreSection.tsx`**
- Pass `team1Name` and `team2Name` from `match.team1?.name` and `match.team2?.name` to `ScoreButtonGroup`

### Visual result on mobile
```text
┌──────────────────────────────┐
│  🟢 Hole Violators           │
│           vs                 │
│        Happy Valley 🟢      │
│        Hole Hunters          │
│                              │
│  [ 2–0 ] [ 2–1 ] [ 1–2 ] [ 0–2 ] │
│  HV ←                  → HVHH│
└──────────────────────────────┘
```

The stacked team names with logos create a clear top-to-bottom = left-to-right mapping for the score buttons, eliminating confusion about which number belongs to which team.

