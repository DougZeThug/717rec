

## Fix Admin Team Management for Mobile

The current "Manage Teams" table has 5 columns (Name, Record, Division, Players, Actions) with fixed-width selects, causing horizontal overflow on 360px screens. The fix replaces the table with a stacked card layout on mobile.

### Changes — `src/components/admin/teams/TeamManagementTab.tsx`

**1. Filters row (lines 206-230)** — Stack search and division filter vertically on mobile:
- Change `flex gap-4 items-center` to `flex flex-col sm:flex-row gap-2 sm:gap-4`
- Remove fixed `w-48` on division SelectTrigger, use `w-full sm:w-48`

**2. Teams list (lines 232-301)** — Replace the table with a responsive approach:
- **Mobile (below `sm`)**: Render a stacked card list instead of the table. Each card shows:
  - Row 1: **Team name** (bold) + Edit button (right-aligned)
  - Row 2: Record badge + Player count
  - Row 3: Division select (full width)
- **Desktop (`sm`+)**: Keep the existing table as-is, wrapped in `hidden sm:block`
- Use `sm:hidden` on the card list and `hidden sm:block` on the table container

**3. Stats cards (line 147)** — Already responsive with `grid-cols-1 md:grid-cols-3`, no change needed.

### Files
- **Edit**: `src/components/admin/teams/TeamManagementTab.tsx`

