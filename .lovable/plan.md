

## Refactor: Move Direct Supabase Imports to Service Layer

### What & Why
Your project rule says all Supabase calls go through `src/services/`. Eight files currently import the Supabase client directly for queries/mutations (not realtime). This refactor extracts each DB call into the appropriate service file, then updates the caller to use the service instead.

### Changes by File

#### 1. `src/utils/rankingUtils/divisionWeightsCache.ts`
- Move the `supabase.from('divisions').select(...)` query into `DivisionService.ts` as `fetchDivisionWeightsMap()`
- Update `divisionWeightsCache.ts` to import and call `DivisionService.fetchDivisionWeightsMap()` instead of using supabase directly
- Remove the supabase import

#### 2. `src/utils/career/calculateCareerPowerScore.ts`
- Create `src/services/career/CareerQueryService.ts` with three functions:
  - `fetchTeamSeasonPowerScores(teamId)` — queries `team_season_stats`
  - `fetchCurrentTeamPower(teamId)` — queries `v_team_details`
  - `fetchActiveSeasonId()` — queries `seasons`
- Update `calculateCareerPowerScore.ts` to call these services in the non-prefetched path
- Remove the supabase import

#### 3. `src/utils/nativeAuth.ts`
- Add `signInWithIdToken(provider, token)` to `src/services/auth/AuthService.ts`
- Update `nativeAuth.ts` to call `signInWithIdToken('google', idToken)` instead of `supabase.auth.signInWithIdToken()`
- Remove the supabase import

#### 4. `src/utils/teamStatsUtils/updateTeamRecord.ts`
- Move the `supabase.from('teams').update(...)` call into `src/services/teams/TeamUpdateService.ts` as `updateTeamWinLossRecord()`
- Update `updateTeamRecord.ts` to call the service function
- Remove the supabase import

#### 5. `src/utils/autoScheduleUtils.ts`
- Add `fetchTeamsByTimeslot(date, timeslot)` to `src/services/timeslots/TimeslotQueryService.ts`
- Update `getTeamsByTimeBlock()` to call the service
- Remove the supabase import

#### 6. `src/hooks/useScheduleData.ts`
- Add `fetchScheduleMatches()` to `MatchReadService.ts` — fetches active season + matches with v_team_details join
- Update hook to call the service function
- Remove the supabase import

#### 7. `src/hooks/playoffs/useBracketsManagerMatch.ts`
- Add `fetchBracketsManagerMatch(matchId)` to `src/services/brackets/BracketReadService.ts` — fetches match, match_game, and participant data
- Update hook to call the service function
- Remove the supabase import

#### 8. `src/hooks/matches/utils/queryCacheUtils.ts`
- Replace the dynamic `import('@/integrations/supabase/client')` with `import { getAuthSession } from '@/services/auth/AuthService'`
- This is an auth session check, which AuthService already exposes

### Summary

| File | Action |
|------|--------|
| `DivisionService.ts` | Add `fetchDivisionWeightsMap()` |
| `CareerQueryService.ts` (new) | 3 query functions for career power score |
| `AuthService.ts` | Add `signInWithIdToken()` |
| `TeamUpdateService.ts` | Add `updateTeamWinLossRecord()` |
| `TimeslotQueryService.ts` | Add `fetchTeamsByTimeslot()` |
| `MatchReadService.ts` | Add `fetchScheduleMatches()` |
| `BracketReadService.ts` | Add `fetchBracketsManagerMatch()` |
| 8 caller files | Replace supabase import with service import |

One new file, seven existing service files updated, eight caller files updated. No behavior changes — pure refactor.

