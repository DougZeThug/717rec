

## Add Insights Button to Standings Page Header

### What
Move the Insights link from the hamburger menu to a visible button in the top-right area of the Standings page header, next to the title/description.

### Changes

**File: `src/components/stats/containers/StatsPageHeader.tsx`**
- Import `Lightbulb` icon from lucide-react, `Button` from UI, and `useNavigate` from react-router
- Add a button with the Lightbulb icon and "Insights" label, positioned top-right of the header area
- Use `flex justify-between items-start` to place the SeasonBadge + title on the left and the Insights button on the right
- Style the button to match existing design (compact, pill-shaped, subtle styling)

**File: `src/components/layout/navbar/NavLinks.tsx`**
- Remove the Insights entry from the hamburger menu nav items to declutter it

### Layout
```text
┌─────────────────────────────────────┐
│      ❄ Winter 2 2026 • Week 3      │
│                                     │
│  STANDINGS           [💡 Insights]  │
│  Current season rankings...         │
└─────────────────────────────────────┘
```

The button navigates to `/insights` on tap. Keeps the hamburger menu cleaner while making Insights more discoverable.

