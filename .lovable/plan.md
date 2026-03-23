

## Clean up Weekly Recap mobile layout to match reference

### What changes

**File: `src/components/home/WeeklyRecapCard.tsx`**

**1. Add visible borders around each column (mobile)**
- Wrap each column in a `rounded-lg border border-border/40` container with padding

**2. Redesign `UpsetRow` for mobile clarity**
- Stack winner and loser on separate lines (logo + full name each)
- Move the score + upset badge to the right side, vertically centered against both rows
- Score displayed in a purple rounded badge (e.g. `2-1` large, `+18.4 Upset` smaller below)
- Remove `truncate` on team names so full names show

**3. Redesign `StreakRow` for mobile**
- Remove division subtitle to save space
- Streak badge styled as a solid orange/amber rounded square with bold text (e.g. `W4`)
- Full team name without truncation

**4. Section headers**
- "Top Upsets" with lightning icon, "Winning Streaks" with flame icon (matching screenshot text)

### Layout structure (mobile)
```text
┌─ Top Upsets ──────────┐  ┌─ Winning Streaks ─────┐
│ 🏆 Came from Dicks    │  │ 🐝 Bumbleweed    [W4] │
│ 🐕 Offdogs      [2-1] │  │ 🎯 Smooth Sliders[W4] │
│              [+18 Ups] │  │ 🍕 Cuzzo's Clinic[W4] │
│                        │  │                       │
│ 🏆 The Undi...         │  │                       │
│ 🐕 Happy Valley  [2-1]│  │                       │
│              [+7 Ups]  │  │                       │
└────────────────────────┘  └───────────────────────┘
```

### Files
- `src/components/home/WeeklyRecapCard.tsx` — restyle mobile columns + UpsetRow + StreakRow

