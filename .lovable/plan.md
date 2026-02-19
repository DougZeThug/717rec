
## Add Playoffs to Bottom Navigation Bar

### Change

Add a 4th "Playoffs" button (Trophy icon) to the bottom nav, and slightly reduce horizontal padding so all 4 items fit comfortably within mobile tap-target guidelines.

### File: `src/components/navigation/BottomNav.tsx`

1. Import `Trophy` from lucide-react
2. Add a 4th nav item to the array:
   ```
   { path: '/playoffs', label: 'Playoffs', icon: <Trophy size={ICON_SIZES.xl} /> }
   ```
3. Reduce per-item horizontal padding from `px-3` to `px-2` so 4 items fit without crowding, while keeping `min-h-[44px]` and `min-w-[44px]` tap targets from NavItem (already enforced there)

That's it -- one file, three small edits. The NavItem component already handles active states, prefetching, accessibility (`aria-current`), and winter theming automatically.
