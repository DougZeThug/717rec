# Schedule opens on upcoming matches on league night

## What is happening now

The Schedule page guesses "today, if Thursday, else next Thursday" as the opening date. When that guess lands on an empty night, a one-time fallback picks the **last played night first**, and only uses the next scheduled night if nothing was ever played. So on a Thursday before tonight's matches are entered, the page opens on last week's results instead of the upcoming schedule.

## The change

**One targeted edit in `src/pages/Schedule.tsx`** (the auto-pick effect, ~lines 153-174):

- When **today is Thursday** (league night) and tonight has no matches entered yet, prefer the **next scheduled night** (upcoming matches) over the last played night.
- On every other day of the week, keep the current behavior (last played first, so Friday-morning visitors still land on results).
- All existing safeguards stay: runs only once, never overrides a date the user picked or a date in a shared link, never moves off a night that already has matches.

## Files

- `src/pages/Schedule.tsx` — change `const fallback = lastPlayed ?? nextNight;` so that on Thursdays the order is `nextNight ?? lastPlayed`.
- `src/pages/__tests__/Schedule.test.tsx` — add/adjust tests: (1) Thursday with no matches tonight and an upcoming scheduled night → opens on the upcoming night; (2) non-Thursday still prefers last played.

## Verification

- `npm run test:file -- src/pages/__tests__/Schedule.test.tsx`
- `npm run typecheck`
- `npm run lint`
