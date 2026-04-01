

## Redesign: Mobile-Friendly Playoff Page + New Division Colors

### What Changes

**In plain language:** The playoff page on mobile will look like the screenshot — dark division cards with colored borders, status info, and prominent action buttons. Division colors change globally: Competitive = red, Intermediate = yellow/amber, Recreational = green.

### 1. Update Division CSS Variables (`src/styles/theme.css`)

Change the `--competitive` color from amber/gold to red across both light and dark themes:

```
Light:
  --competitive: 0 84% 50%;      /* was 35 92% 43% (amber) → now red */
  --intermediate: 45 93% 47%;    /* was 214 82% 60% (blue) → now amber/yellow */
  --recreational: 142 71% 45%;   /* was 160 84% 39% (teal) → now green */

Dark:
  --competitive: 0 84% 60%;      /* red */
  --intermediate: 45 93% 55%;    /* amber/yellow */
  --recreational: 142 71% 50%;   /* green */
```

This automatically updates every component that uses `hsl(var(--competitive))` etc. — standings, badges, gradients, all of it.

### 2. Update Hex Color Fallbacks (`src/utils/colors/divisionHexColors.ts`)

Update `getDivisionHexColor` to match the new colors:
- Competitive: red hex values (`#ef4444` / `#dc2626`)
- Intermediate: amber/yellow hex values (`#f59e0b` / `#d97706`)
- Recreational: green hex values (`#22c55e` / `#16a34a`)

### 3. Update Legacy Division Color Utils (`src/utils/colors/divisionColors.ts`)

Update all four functions (`getDivisionGradientClass`, `getDivisionHeaderClass`, `getDivisionTextClass`, `getDivisionBadgeColor`) to use:
- Competitive → red classes (was amber)
- Intermediate → amber/yellow classes (was blue)
- Recreational → emerald/green classes (unchanged)

### 4. Redesign `DivisionBracketsCard.tsx` for Mobile

Replace the current plain Card with a dark-themed, mobile-optimized card inspired by the screenshot:

- **Division-colored left border** (4px) + subtle gradient background
- **Division icon + name** as header with colored text
- **Status line** showing bracket state (e.g., "In Progress - Round 2", "Quarterfinals", "Bracket not started")
- **Action buttons row**: "View Live Bracket" (filled, division-colored) + "Manage" (outline) for admin, or "Create Bracket" for empty divisions
- **Rounded corners**, compact padding for mobile
- Keep all existing text and functionality — just restyle

### 5. Update `BracketList.tsx` Layout for Mobile

- Change from `grid md:grid-cols-2` to a single-column stacked layout on mobile (`space-y-4`)
- Remove the "Playoff Brackets" heading on mobile (the page header already says "Playoffs")
- Move "Create Bracket" button into a bottom bar alongside season selector on mobile

### 6. Update `PlayoffPageLayout.tsx` Mobile Layout

- On mobile: move season selector and "+ New Bracket" button into a sticky bottom bar (like the screenshot shows)
- Tighten padding: `py-4 px-3` on mobile instead of `py-8 px-4`

### Files Changed

| File | Change |
|------|--------|
| `src/styles/theme.css` | Update 6 CSS variables (competitive→red, intermediate→yellow, recreational→green) |
| `src/utils/colors/divisionHexColors.ts` | Update hex values to match new colors |
| `src/utils/colors/divisionColors.ts` | Update Tailwind classes (amber→red for competitive, blue→amber for intermediate) |
| `src/components/playoffs/DivisionBracketsCard.tsx` | Redesign with dark gradient cards, colored borders, status text, styled buttons |
| `src/components/playoffs/BracketList.tsx` | Single-column mobile layout, remove duplicate heading on mobile |
| `src/components/playoffs/layout/PlayoffPageLayout.tsx` | Bottom bar with season selector + new bracket button on mobile, tighter padding |

Six files. No new files. All existing text and functionality preserved.

