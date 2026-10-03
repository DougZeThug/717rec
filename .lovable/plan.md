# Let admins edit hidden divisions

## Problem

In Admin → Divisions, the **Edit** button is turned off for any division whose display group is "Hidden". The button shows the hint "Hidden divisions cannot be edited". So an admin cannot change the weight of a hidden division.

## Fix

One small change in `src/components/admin/divisions/DivisionRow.tsx`:

- **Turn the Edit button on for hidden divisions.** Remove the `disabled={isHidden}` and the "cannot be edited" hint from the Edit button.
- **Keep Delete turned off for hidden divisions.** That guard stays as it is.

## What the admin can then do

- Open Admin → Divisions.
- Tap Edit on a hidden division.
- Change the weight (or the name, or the display group) and save.
- Saving with a normal display group (Competitive / Intermediate / Recreational) also un-hides the division, which is the natural way to bring one back.

## Technical details

- File: `src/components/admin/divisions/DivisionRow.tsx`, lines ~211-220 (the Edit button in `actions`).
- No change to `DivisionService.updateDivision` — it already accepts a weight-only patch.
- No database change. No change to how weights are used in rankings.
- Update the existing DivisionsTab / DivisionRow tests if any assert the disabled state; add a test that a hidden division's Edit button is enabled and saves a new weight.

## Checks

- Run the division admin tests, type check, and style check.
