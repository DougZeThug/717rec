

## Tighten Batch Match Creation Mobile Layout

Comparing the screenshot to the current code, the key layout differences are:

1. **Match card uses stacked vertical layout** — Team 1, VS, Team 2, Timeslot all stack vertically (full width) instead of the current `flex-row` on desktop
2. **"Match Card" label** at the top of each card
3. **Delete button** sits bottom-right inside the card
4. **Bottom actions** — "Add Another Match" and "Create Matches" side by side (no separate auto-assign row)
5. **Less vertical spacing** between sections (`space-y-4` instead of `space-y-6`)
6. **Remove "Team 1" / "Team 2" labels** — the selectors already show placeholder text

### Files to Change

**1. `src/components/admin/batch-matches/MatchPairsList.tsx`**
- On mobile: stack all selects vertically (remove `md:flex-row`, use `flex-col` always on mobile)
- Remove "Team 1" / "Team 2" / "Timeslot" labels — use placeholder text in selects instead
- Add "Match Card" header text at top of each card
- Move delete button to bottom-right corner of card
- Reduce padding from `p-3` to `p-3` (keep) but tighten inner gaps from `gap-3` to `gap-2`

**2. `src/components/admin/batch-matches/BatchMatchFormActions.tsx`**
- Remove the standalone "Auto Assign Timeslots" button row
- Put "Add Another Match" and "Create Matches" side by side in a single row always (not stacked)

**3. `src/components/admin/batch-matches/BatchMatchFormContainer.tsx`**
- Reduce outer spacing from `space-y-6` to `space-y-4`

**4. `src/components/admin/batch-matches/MatchPairsSection.tsx`**
- Reduce bottom margin on description text

No color, font, or style changes — purely layout/spacing adjustments. All existing text and functionality preserved.

