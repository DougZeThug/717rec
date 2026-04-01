

## Tighten Timeslot Assignment Spacing

Comparing the reference screenshot to the current implementation, the timeslot chips and overall vertical spacing are too generous. The reference shows compact, tightly packed time chips in a 4-column grid-like layout with minimal gaps.

### Changes

**File: `src/components/timeslots/TimeslotAssignment.tsx`**

1. **Timeslot chips** (lines 310-336 and 285-307): Reduce padding from `px-4 py-2` to `px-3 py-1.5` and gap from `gap-2` to `gap-1.5` for both single and double-header modes
2. **Form spacing** (line 147): Reduce `space-y-4` to `space-y-3`
3. **Double Header section** (line 256): Reduce padding from `p-3` to `p-2.5`
4. **"Select Timeslot" label spacing** (line 272): Reduce `space-y-2` to `space-y-1.5`
5. **Team grid section** (line 201): Reduce `space-y-2` to `space-y-1.5`

One file, padding/gap tweaks only. No style or color changes.

