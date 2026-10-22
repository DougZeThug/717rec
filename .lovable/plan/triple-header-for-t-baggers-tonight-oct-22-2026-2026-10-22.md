# Triple header for "T" Baggers tonight (Oct 22, 2026)

## Now
- "T" Baggers play the 6:30/7:00 block and the 7:30/8:00 block. Both are marked as a double header.
- The 8:30/9:00 block has 9 teams, so one team has no opponent.

## Change (one time, data only)
1. Add two time slots for "T" Baggers tonight: 8:30 PM (first game) and 9:00 PM (second game). They are back-to-back and marked as a multi-block night, the same as their other two blocks.
2. The late block then has 10 teams, so every team gets an opponent.
3. Check tonight's slot list again to confirm that "T" Baggers have 6 slots and that the late block has 10 teams.

## Not changed
- No other team, no other date and no app code.
- No scores or standings.
- Opponents: if tonight's matches are already made, you make the "T" Baggers late-block matches in the admin schedule, as usual.

## Technical details
- Insert 2 rows into `team_timeslots`: `match_date` 2026-10-22, the "T" Baggers team_id, timeslot `8:30 PM` / `9:00 PM`, pair_slot `9:00 PM` / `8:30 PM`, match_sequence 1 / 2, is_back_to_back true, is_double_header true.
- Rollback: delete those two rows by id.
