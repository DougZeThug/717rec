

## Tighten Timeslot Assignment Layout for Mobile

### What Changes

Redesign the timeslot assignment form to match the screenshot: a compact mobile layout with a 2-column scrollable team card grid showing team logos, tighter spacing, and all content flowing vertically without separate card wrappers.

### Changes

**1. `src/pages/Timeslots.tsx`** (layout restructure for mobile)
- On mobile: stack everything vertically, remove the separate "Select Date" and "Assign Timeslot" Card wrappers — show date picker inline at top, then assignment form, then existing timeslots
- Tighten padding: `py-4 px-3` on mobile
- Remove `CardHeader`/`CardContent` wrapping on mobile — use simple section headers instead

**2. `src/components/timeslots/TimeslotAssignment.tsx`** (main redesign)
- **Team Selection Grid**: Replace the current `ScrollArea` with checkbox list → a 2-column grid of team cards inside a `ScrollArea`
  - Each card shows: team logo (`imageUrl`), team name, and a checkbox indicator
  - Cards highlight with a colored border when selected (like the screenshot)
  - Grid uses `grid grid-cols-2 gap-2` layout
  - ScrollArea height stays at `h-[200px]` for compactness
- **Section headers**: Change labels to match screenshot style — "Team Selection Grid", "Select Timeslot"
- **Double Header toggle**: Keep the existing bordered row with Switch — already matches screenshot
- **Timeslot chips**: Already using `ToggleGroup` with flex-wrap — keep as-is, already matches
- **Submit button**: Already full-width — rename to "Confirm Assignment" to match screenshot
- **Import `TeamLogo`** from `@/components/ui/team/TeamLogo` to render team logos in cards
- **Select All / Deselect All** button stays at top-right of team section

### Key Snippet (Team Card Grid)

```typescript
<div className="grid grid-cols-2 gap-2">
  {availableTeams.map((team) => {
    const isSelected = selectedTeamIds.includes(team.id);
    return (
      <button
        key={team.id}
        type="button"
        onClick={() => handleToggleTeam(team.id)}
        className={`flex items-center gap-2 p-2 rounded-lg border transition-colors text-left
          ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}
      >
        <TeamLogo imageUrl={team.imageUrl} teamName={team.name} className="h-8 w-8" />
        <span className="text-sm font-medium truncate flex-1">{team.name}</span>
        <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
      </button>
    );
  })}
</div>
```

### Files Changed

| File | Change |
|------|--------|
| `src/components/timeslots/TimeslotAssignment.tsx` | 2-column team card grid with logos, tighter spacing, "Confirm Assignment" button text |
| `src/pages/Timeslots.tsx` | Tighter mobile padding, streamlined section layout |

Two files. No style/color/font changes. All existing functionality preserved.

