
Goal: fix the “Failed to fetch” cascade so transient Supabase/network interruptions don’t flood errors or break Schedule/Stats UX.

What I found in your logs/code:
- `team_timeslots` is polled every 30s for long sessions.
- When connectivity drops, multiple queries fail together (`timeslots`, H2H, career bulk stats), causing noisy cascading errors.
- H2H calls are still over-fetched in match cards (batch + per-card prediction path), which increases request pressure.

Implementation plan

1) Harden timeslot queries against transient network failures
- Update `src/hooks/useMatchTimeslots.ts` and `src/hooks/useTimeslotQuery.ts` to:
  - pause polling when offline/hidden (refetch interval callback),
  - keep last good data during retry/failure,
  - avoid aggressive refetch churn during temporary outages.
- Update `src/services/matches/MatchReadService.ts` (`fetchMatchTimeslots`) to preserve original error context instead of throwing only `Failed to load timeslots`.

2) Remove redundant H2H request fan-out
- Extend `src/hooks/useBatchHeadToHead.ts` with an `enabled` option.
- In `src/components/schedule/TimeSlotMatchGroup.tsx`, only run batch H2H when that timeslot group is expanded.
- Update `src/hooks/useMatchPrediction.ts` to accept optional prefetched H2H input.
- Pass prefetched H2H from `src/components/schedule/MatchCard.tsx` so prediction doesn’t trigger separate per-card H2H fetches.

3) Improve graceful degradation behavior
- In Schedule hooks/components, if network fails:
  - continue rendering last successful data,
  - show a non-blocking “connection issue, retrying” state instead of hard-failing section content.
- Keep existing UX for true data/permission errors (do not mask real backend issues).

4) Reduce error noise without hiding real problems
- In H2H/career fetch paths (`HeadToHeadService`, career bulk fetch path), classify transport/network failures separately from database logic errors.
- Keep logs actionable, but avoid repeated identical “database error” cascades for pure fetch disconnects.

5) Verify end-to-end scenarios
- Confirm behavior on Schedule tabs with:
  - normal online flow,
  - brief offline period then reconnect,
  - expanded/collapsed timeslot groups.
- Confirm request volume drops (fewer duplicate H2H calls) and no regression to matchup/prediction rendering.

Technical details (files to touch)
- `src/services/matches/MatchReadService.ts`
- `src/hooks/useMatchTimeslots.ts`
- `src/hooks/useTimeslotQuery.ts`
- `src/hooks/useBatchHeadToHead.ts`
- `src/components/schedule/TimeSlotMatchGroup.tsx`
- `src/hooks/useMatchPrediction.ts`
- `src/components/schedule/MatchCard.tsx`
- (small error-classification updates in `HeadToHeadService` / career service as needed)

No database migration required for this fix.
