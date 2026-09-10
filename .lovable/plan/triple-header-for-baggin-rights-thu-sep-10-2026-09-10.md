# Triple header for Baggin Rights (Thu Sep 10)

Baggin Rights are booked twice that night: 7:30 + 8:00, and 8:30 + 9:00. They also need the 6:30 block (6:30 + 7:00). The admin tool only allows two blocks per team, so I add the third booking directly and make the schedule show all three.

## What I will do

1. **Add the missing 6:30 block** for Baggin Rights on 2026-09-10, marked the same way as their other bookings (6:30 PM and 7:00 PM, flagged as part of a multi-game night). It does not clash with 7:30 or 8:30.
2. **Fix the schedule label** so a team with more than two bookings still shows a badge listing every start time (today the badge only appears when a team has exactly two). The team keeps showing once in the earliest group, as it does now.

No new admin controls, no change to how other teams are scheduled.

## Technical notes

- Data change: insert two `team_timeslots` rows for the Early pair (`6:30 PM` primary / `7:00 PM` secondary), `is_back_to_back = true`, `is_double_header = true`, `match_sequence` 1 and 2, matching the existing four rows for that date.
- `src/components/schedule/timeslot-grouping/useTimeslotGrouping.ts`: `doubleHeaderInfo` currently only records a team when `teamSlots.length === 2`. Generalise it to collect the distinct primary (sequence 1) start times when a team has two or more bookings, keyed by team id.
- `TimeslotGroupBits.tsx`: render the badge from that list of start times (e.g. `DH 6:30 PM/7:30 PM/8:30 PM`) instead of the fixed `slot1/slot2` pair.
- Existing double-header teams keep the same two-time badge.
