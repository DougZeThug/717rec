
## Fix plan: Career percentile cohort mismatch on Report Card

### What’s happening
The report card career percentile is currently being calculated against the **non-hidden cohort** returned by `useCareerRankings()` (currently 23 teams), while you’re comparing it to all-time rank against **all 46 teams**.  
That’s why a team ranked 6th can show ~77th percentile (`17/22 ≈ 77%`) instead of high-80s.

### Implementation plan

1. **Make `useCareerRankings` configurable for hidden-team inclusion**
   - File: `src/hooks/useCareerRankings.ts`
   - Add optional param: `{ includeHidden?: boolean }` (default `false` to avoid breaking existing consumers).
   - Pass through to `useTeamsQuery({ includeHidden })`.
   - Include `includeHidden` in the React Query key to keep caches isolated.

2. **Use all-time cohort for career report card percentiles**
   - File: `src/hooks/useTeamReportCard.ts`
   - In career mode, switch to `useCareerRankings({ includeHidden: true })` for percentile arrays (`allPowerScores`, etc.).
   - Keep season mode unchanged.

3. **Harden percentile inputs**
   - File: `src/hooks/useTeamReportCard.ts`
   - Before percentile calculations, filter out non-finite values to prevent denominator distortion if any computed metric is invalid.

4. **Regression check**
   - Verify Pepperoni Cheesers career report card “Overall” percentile aligns with all-time ranking (6/46 should land in the high-80s, ~89 with current percentile formula).
   - Verify season-mode report cards are unchanged.
   - Verify no query-cache cross-contamination between hidden/non-hidden career datasets.

### Technical details
- Root issue is **cohort mismatch**, not percentile math.
- Current percentile utility is fine after the earlier fix.
- This change keeps behavior explicit:
  - `includeHidden: false` for standard visible-only contexts.
  - `includeHidden: true` where “all-time league” percentiles are expected (report card career mode).
