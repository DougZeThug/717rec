# Schedule page should open on the newest posted night

## The problem

The schedule page only knows about nights that already have matches in the system. Posted timeslots for a night with no matches yet are invisible to it.

So today (Thursday 9/10) the page opens on 9/3 — last week's results — even though tonight's timeslots are posted.

## What will change

- The schedule will also count nights that have posted timeslots, not just nights with matches.
- On a Thursday with no matches entered yet, the page opens on tonight (or the most recent posted timeslot night).
- Those nights will also appear as selectable dots on the date strip.
- A date in the link still wins — shared links never get moved.

## Landing-night rule after the change

1. Night named in the link.
2. Otherwise on Thursday: next scheduled match night, else the newest posted timeslot night that is today or earlier.
3. Otherwise any other day: last played night, else next scheduled night, else newest posted timeslot night.

## Technical notes

- Add `TimeslotQueryService.fetchTimeslotDates()`: `select('match_date')` from `team_timeslots`, ordered descending, deduped into `yyyy-MM-dd` strings.
- Add `useTimeslotDates()` (TanStack Query, same cache conventions as the other timeslot hooks) returning a sorted `string[]`.
- In `src/pages/Schedule.tsx`:
  - Merge timeslot dates into the set passed to `ScheduleHeader`/`DateStrip` so those nights are pickable.
  - Extend the one-shot auto-pick effect: wait for timeslot dates as well as matches, and use the fallback order above.
  - Keep the `hasAutoPickedDate` guard and the `hadDateInUrl` behavior unchanged.
- Tests in `src/pages/__tests__/Schedule.test.tsx`: Thursday with posted timeslots and no matches lands on that night; existing Thursday/other-day cases still pass.
