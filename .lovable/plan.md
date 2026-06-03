## Goal

When two teams have the same power score, rank the team in the higher division first: Competitive > Intermediate > Recreational.

## Why this is happening

Power-score ties are currently broken by win% then team name. Division is ignored, so Smooth Sliders (Intermediate) sorts above Pepperoni Cheesers (Competitive) on alphabetical fallback even though Cheesers play in a stronger division.

## Changes

Reuse the existing `getTierFromDivision` helper in `src/utils/autoSchedule/blossom/tierUtils.ts` (Competitive = 1, Intermediate = 2, Recreational = 3, Unassigned defaults to 2).

**1. `src/utils/rankingUtils.ts` — `sortRankings`**
When `sortField === 'powerScore'` and two teams' power scores are equal, insert a new tiebreaker BEFORE the existing numeric fallback:
- Compare `getTierFromDivision(a.divisionName)` vs `getTierFromDivision(b.divisionName)` ascending (lower tier number wins, regardless of asc/desc direction — higher division always ranks better).
- If still tied, fall through to existing logic (win% then name in the consumer).

**2. `src/hooks/useTeamRankings.ts` — inline sort comparator**
Same tiebreaker logic added after the power-score comparison and before the win-percentage fallback, applied in all three branches (both-NULL, both-non-NULL).

## Out of scope

- No DB / view changes — `v_team_details` ordering doesn't drive the displayed ranking; sorting happens client-side.
- No change to power-score formula or division weights.
- No change to non-power-score sort modes (wins, win%, SOS, name) — division tiebreaker only applies when the user is sorting by power score.

## Verification

- Add a unit test in `src/utils/rankingUtils/__tests__/` (or extend existing) with two teams at identical power score in Competitive vs Intermediate → Competitive ranks first.
- Visually confirm Pepperoni Cheesers now ranks above Smooth Sliders on the standings page.
