# Fix: hidden teams showing in Recreational

## Cause (confirmed in the database)
The "Hidden" division now has display group **Recreational**. Before, it was **Hidden**.
This happened when the division was edited in Admin -> Divisions. The edit box has no "Hidden" choice, so it started on "Recreational" and saving un-hid the division. (I warned about this in the last change.) Weight 0.6 is kept.

## Steps
1. **Put the data back:** set the "Hidden" division's display group back to Hidden. Keep its weight (0.6). Teams disappear from the Recreational standings again.
2. **Stop it from happening again:** when you edit a hidden division, the edit box keeps it Hidden. Add "Hidden" as a choice in the display group box in the division edit row.
3. **Test:** add a test that editing a hidden division's weight saves with display group "Hidden".

## Technical details
- Data fix: `update divisions set display_division='Hidden' where id='efba0f7f-fb6e-4694-a738-093f79da6842'`.
- `src/components/admin/divisions/DivisionRow.tsx`: add 'Hidden' to DISPLAY_OPTIONS; `normalizeDisplay` keeps 'Hidden' instead of falling back to 'Recreational'. Update the existing hidden-edit test in `DivisionRow.test.tsx` to expect 'Hidden'.
- Create dialog unchanged.
