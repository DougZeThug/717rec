# Refactor Supabase Calls — Execution Plan

> **Goal**: Move all direct Supabase calls out of hooks, components, and utils into the `src/services/` layer.
> **Pattern**: Components → Hooks (TanStack Query) → **Services** → Supabase
> **Error Pattern**: Services throw typed errors (`handleDatabaseError`, `ensureFound`) — hooks rely on TanStack Query to catch them automatically.

---

## How to Use This Plan

- Each batch is one PR (or one commit).
- Batches are ordered by dependency — earlier batches don't depend on later ones.
- Each batch lists **exactly** which files to change and what to do.
- After each batch: run `npm run lint` and `npm run build` to verify nothing broke.

---

## Batch 1: Season Service

**New file to create**: `src/services/SeasonService.ts`

**What it provides**: All season-related Supabase queries and mutations, using `handleDatabaseError` and `ensureFound` from `@/utils/errorHandler`.

### Functions to extract into `SeasonService`:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchSeasons()` | `src/hooks/useSeasons.ts` | `.from('seasons').select('*')` |
| `fetchCurrentSeason()` | `src/hooks/useSeasons.ts` | `.from('seasons').select('*').eq('is_current', true).single()` |
| `fetchSeasonParticipation(seasonId, userId)` | `src/hooks/useSeasonParticipation.ts` | Queries team_players + teams for a user's participation in a season |
| `fetchSeasonStats(seasonId)` | `src/hooks/useSeasonStats.ts` | `.from('team_season_stats').select(...)` |
| `activateSeason(seasonId)` | `src/hooks/useSeasonMutations.ts` | `.rpc('activate_season', ...)` |
| `archiveSeason(seasonId)` | `src/hooks/useSeasonMutations.ts` | `.rpc('archive_season', ...)` |
| `createSeason(data)` | `src/hooks/useSeasonMutations.ts` | `.from('seasons').insert(...)` |
| `updateSeason(seasonId, data)` | `src/hooks/useSeasonMutations.ts` | `.from('seasons').update(...)` |
| `deleteSeason(seasonId)` | `src/hooks/useSeasonMutations.ts` | `.from('seasons').delete()` |
| `fetchSeasonById(seasonId)` | `src/components/history/HistoryPageContent.tsx` | `.from('seasons').select('*').eq('id', seasonId).single()` |
| `fetchSeasonStatsForAccordion(seasonId)` | `src/components/history/SeasonAccordion.tsx` | `.from('team_season_stats').select(...)` with team join |

### Hooks to refactor (remove direct Supabase, call SeasonService instead):

- `src/hooks/useSeasons.ts` — replace `.from('seasons')` calls with `SeasonService.fetchSeasons()` / `SeasonService.fetchCurrentSeason()`
- `src/hooks/useSeasonMutations.ts` — replace `.from('seasons')` + `.rpc()` calls with `SeasonService.*` methods
- `src/hooks/useSeasonParticipation.ts` — replace direct query with `SeasonService.fetchSeasonParticipation()`
- `src/hooks/useSeasonStats.ts` — replace direct query with `SeasonService.fetchSeasonStats()`

### Components to refactor:

- `src/components/history/HistoryPageContent.tsx` — replace `useEffect` + direct `.from('seasons')` with a hook that calls `SeasonService`
- `src/components/history/SeasonAccordion.tsx` — replace `useQuery` + direct `.from('team_season_stats')` with `SeasonService.fetchSeasonStatsForAccordion()`

---

## Batch 2: Division Service

**New file to create**: `src/services/DivisionService.ts`

### Functions to extract:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchDivisions(seasonId)` | `src/hooks/useDivisions.ts` | `.from('divisions').select('*').eq('season_id', seasonId)` |

### Hooks to refactor:

- `src/hooks/useDivisions.ts` — replace direct Supabase call with `DivisionService.fetchDivisions()`

---

## Batch 3: Hero Card Service

**New file to create**: `src/services/HeroCardService.ts`

### Functions to extract:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchHeroCards(seasonId?)` | `src/hooks/useHeroCards.ts` | `.from('hero_cards').select(...)` — multiple query patterns in this hook |
| `createHeroCard(data)` | `src/hooks/useHeroCards.ts` | `.from('hero_cards').insert(...)` |
| `updateHeroCard(id, data)` | `src/hooks/useHeroCards.ts` | `.from('hero_cards').update(...)` |
| `deleteHeroCard(id)` | `src/hooks/useHeroCards.ts` | `.from('hero_cards').delete()` |
| `fetchChampionsHeroCard()` | `src/components/hero/ChampionsHeroCard.tsx` | `.from('hero_cards').select('*').eq('card_type', 'champions')` |
| `fetchChampionsForEditor()` | `src/components/admin/hero-cards/form-sections/ChampionsEditor.tsx` | Direct hero card queries for admin |

### Files to refactor:

- `src/hooks/useHeroCards.ts` — all CRUD operations → `HeroCardService.*`
- `src/components/hero/ChampionsHeroCard.tsx` — direct query → `HeroCardService.fetchChampionsHeroCard()`
- `src/components/admin/hero-cards/form-sections/ChampionsEditor.tsx` — direct query → `HeroCardService.*`

---

## Batch 4: Blind Draw Service

**New file to create**: `src/services/BlindDrawService.ts`

### Functions to extract:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchBlindDrawSettings(seasonId)` | `src/hooks/useBlindDrawSettings.ts` | `.from('blind_draw_settings').select(...)` |
| `updateBlindDrawSettings(seasonId, data)` | `src/hooks/useBlindDrawSettings.ts` | `.from('blind_draw_settings').update(...)` |
| `fetchBlindDrawSignups(seasonId)` | `src/hooks/useBlindDrawSignups.ts` | `.from('blind_draw_signups').select(...)` |
| `createSignup(data)` / `deleteSignup(id)` | `src/hooks/useBlindDrawSignups.ts` | Insert/delete signups |

### Hooks to refactor:

- `src/hooks/useBlindDrawSettings.ts` — `BlindDrawService.fetchBlindDrawSettings()` / `.updateBlindDrawSettings()`
- `src/hooks/useBlindDrawSignups.ts` — `BlindDrawService.fetchBlindDrawSignups()` / `.createSignup()` / `.deleteSignup()`

---

## Batch 5: Match Comments & Reactions Services

**New files to create**:
- `src/services/matches/MatchCommentsService.ts`
- `src/services/matches/MatchReactionsService.ts`

### MatchCommentsService functions:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchComments(matchId)` | `src/hooks/matches/useMatchComments.ts` | `.from('match_comments').select(...)` |
| `addComment(matchId, data)` | `src/hooks/matches/useMatchComments.ts` | `.from('match_comments').insert(...)` |
| `updateComment(commentId, content)` | `src/hooks/matches/useMatchComments.ts` | `.from('match_comments').update(...)` |
| `deleteComment(commentId)` | `src/hooks/matches/useMatchComments.ts` | `.from('match_comments').delete()` |

### MatchReactionsService functions:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchReactions(matchId)` | `src/hooks/matches/useMatchReactions.ts` | `.from('match_reactions').select(...)` |
| `toggleReaction(matchId, userId, emoji)` | `src/hooks/matches/useMatchReactions.ts` | Insert or delete reaction |

### Hooks to refactor:

- `src/hooks/matches/useMatchComments.ts` — all CRUD → `MatchCommentsService.*` (keep realtime `.channel()` subscription in the hook — realtime stays in hooks)
- `src/hooks/matches/useMatchReactions.ts` — queries/mutations → `MatchReactionsService.*` (keep realtime in hook)

### Note on Realtime Subscriptions
Realtime `.channel()` subscriptions **stay in hooks** — they are UI-lifecycle concerns (subscribe on mount, unsubscribe on unmount). Only the **data fetching and mutation logic** moves to services.

---

## Batch 6: Message Board Service

**New files to create**:
- `src/services/messages/MessageService.ts`
- `src/services/messages/MessageReactionsService.ts`

### MessageService functions:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchMessages(filters, pagination)` | `src/hooks/message-board/useMessageApi.ts` | `.from('messages').select(...)` with filters |
| `createMessage(data)` | `src/hooks/message-board/useMessageApi.ts` | `.from('messages').insert(...)` |
| `updateMessage(id, content)` | `src/hooks/message-board/useMessageApi.ts` | `.from('messages').update(...)` |
| `deleteMessage(id)` | `src/hooks/message-board/useMessageApi.ts` | `.from('messages').delete()` |

### MessageReactionsService functions:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchReactions(messageIds)` | `src/hooks/message-board/useMessageReactions.ts` | `.from('message_reactions').select(...)` |
| `addReaction(messageId, userId, emoji)` | `src/hooks/message-board/useMessageReactions.ts` | `.from('message_reactions').insert(...)` |
| `removeReaction(messageId, userId, emoji)` | `src/hooks/message-board/useMessageReactions.ts` | `.from('message_reactions').delete()` |

### Hooks to refactor:

- `src/hooks/message-board/useMessageApi.ts` — CRUD → `MessageService.*`
- `src/hooks/message-board/useMessageReactions.ts` — queries/mutations → `MessageReactionsService.*` (keep realtime in hook)
- `src/hooks/message-board/useMessageRealtime.ts` — **no change** (realtime stays in hooks)

---

## Batch 7: Match Operations (Enhance Existing Services)

**Files to enhance**:
- `src/services/matches/MatchWriteService.ts` — add missing mutation functions
- `src/services/matches/MatchReadService.ts` — add missing query functions

### Functions to add to MatchReadService:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchPendingMatches(seasonId)` | `src/hooks/usePendingMatches.ts` | `.from('matches').select(...)` pending matches |
| `fetchUncompletedMatches(seasonId)` | `src/hooks/useUncompletedMatches.ts` | `.from('matches').select(...)` uncompleted |
| `fetchPendingScoresMatches(...)` | `src/hooks/usePendingScoresMatches.ts` | Pending score queries |
| `fetchMatchTimeslots(matchId)` | `src/hooks/useMatchTimeslots.ts` | `.from('team_timeslots').select(...)` |
| `fetchScoreSubmissions(matchId)` | `src/hooks/useScoreSubmissions.ts` | `.from('score_submissions').select(...)` |
| `fetchTeamMatches(teamId, seasonId)` | `src/hooks/useTeamMatches.ts` | `.from('matches').select(...)` for a team |

### Functions to add to MatchWriteService:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `createMatch(data)` | `src/hooks/useMatchCreation.ts` | `.from('matches').insert(...)` |
| `deleteMatch(matchId)` | `src/hooks/matches/updates/useMatchDelete.ts` | `.from('matches').delete()` |
| `updateMatch(matchId, data)` | `src/hooks/matches/updates/useMatchUpdate.ts` | `.from('matches').update(...)` |
| `reverseTeamStats(matchId)` | `src/hooks/matches/updates/useMatchDelete.ts` | `.rpc('reverse_team_stats', ...)` |
| `upsertTeamSeasonStats(teamId, seasonId)` | `src/hooks/matches/updates/useMatchDelete.ts` | `.rpc('upsert_team_season_stats', ...)` |

### Hooks to refactor:

- `src/hooks/usePendingMatches.ts` — `MatchReadService.*` + `MatchWriteService.*`
- `src/hooks/useUncompletedMatches.ts` — `MatchReadService.fetchUncompletedMatches()`
- `src/hooks/usePendingScoresMatches.ts` — `MatchReadService.fetchPendingScoresMatches()`
- `src/hooks/useMatchTimeslots.ts` — `MatchReadService.fetchMatchTimeslots()`
- `src/hooks/useScoreSubmissions.ts` — `MatchReadService.fetchScoreSubmissions()`
- `src/hooks/useTeamMatches.ts` — `MatchReadService.fetchTeamMatches()`
- `src/hooks/useMatchCreation.ts` — `MatchWriteService.createMatch()`
- `src/hooks/matches/updates/useMatchDelete.ts` — `MatchWriteService.deleteMatch()` / `.reverseTeamStats()` / `.upsertTeamSeasonStats()`
- `src/hooks/matches/updates/useMatchUpdate.ts` — `MatchWriteService.updateMatch()`
- `src/hooks/matches/utils/matchDatabaseUtils.ts` — refactor to call `MatchReadService` / `MatchWriteService`
- `src/hooks/matches/utils/matchUpdateUtils.ts` — refactor to call services
- `src/hooks/matches/utils/teamDataUtils.ts` — refactor to call services

### Admin components to refactor:

- `src/components/admin/mass-score-entry/hooks/useMatchesFetching.ts` — `MatchReadService.*`
- `src/components/admin/mass-score-entry/hooks/useMatchUpdates.ts` — `MatchWriteService.*`
- `src/components/admin/mass-score-entry/services/matchQueryService.ts` — `MatchReadService.*`
- `src/components/admin/mass-score-entry/services/matchUpdateCore.ts` — `MatchWriteService.*`

---

## Batch 8: Team Data & Stats (Enhance Existing Services)

**Files to enhance**:
- `src/services/TeamService.ts` or `src/services/teams/TeamFetchService.ts`
- `src/services/TeamStatsService.ts`

### Functions to add to TeamFetchService:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchTeamDetails(teamId)` | `src/hooks/useTeamDetails.ts` | `.from('teams').select(...)` with joins |
| `fetchTeamAnalysis(teamId)` | `src/hooks/useTeamAnalysis.ts` | Team analysis queries |
| `fetchTeamRequests(teamId)` | `src/hooks/useTeamRequests.ts` | `.from('team_requests').select(...)` |
| `fetchTeamMembership(userId)` | `src/hooks/useTeamMembership.ts` | `.from('team_players').select(...)` |
| `fetchTeamBadges(teamId)` | `src/hooks/useTeamBadges.ts` | `.from('team_badge_events').select(...)` |

### Functions to add to TeamStatsService:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchTeamRecord(teamId, seasonId)` | `src/hooks/team-stats/utils/teamRecordUtils.ts` | `.rpc()` for team records |
| `fetchSeasonBreakdown(teamId)` | `src/hooks/teams/seasonBreakdown/fetchTeamSeasonBreakdown.ts` | Season breakdown queries |
| `updateSeasonStats(seasonId)` | `src/hooks/history/useUpdateSeasonStats.ts` | Season stats update logic |
| `fetchBatchHeadToHead(...)` | `src/hooks/useBatchHeadToHead.ts` | `.rpc()` for head-to-head |

### Hooks to refactor:

- `src/hooks/useTeamDetails.ts` — `TeamFetchService.fetchTeamDetails()`
- `src/hooks/useTeamAnalysis.ts` — `TeamFetchService.fetchTeamAnalysis()`
- `src/hooks/useTeamRequests.ts` — `TeamFetchService.fetchTeamRequests()`
- `src/hooks/useTeamMembership.ts` — `TeamFetchService.fetchTeamMembership()`
- `src/hooks/useTeamBadges.ts` — `TeamFetchService.fetchTeamBadges()`
- `src/hooks/team-stats/utils/teamRecordUtils.ts` — `TeamStatsService.fetchTeamRecord()`
- `src/hooks/teams/seasonBreakdown/fetchTeamSeasonBreakdown.ts` — `TeamStatsService.fetchSeasonBreakdown()`
- `src/hooks/teams/useTeamsQuery.ts` — check if already using service, refactor if not
- `src/hooks/history/useUpdateSeasonStats.ts` — `TeamStatsService.updateSeasonStats()`
- `src/hooks/useBatchHeadToHead.ts` — `TeamStatsService.fetchBatchHeadToHead()` or `HeadToHeadService`

### Components to refactor:

- `src/components/teams/TeamEditSection.tsx` — use `TeamUpdateService.updateTeam()` instead of direct `.update()`
- `src/components/admin/teams/TeamManagementTab.tsx` — use team services
- `src/components/admin/teams/TeamMembershipApprovalTab.tsx` — use team services

---

## Batch 9: Rankings & Power Scores

**Files to enhance**:
- `src/services/RankingsCalculationService.ts`
- `src/services/RankingSnapshotService.ts`

### Functions to extract/add:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchRankingsData(seasonId, divisionId?)` | `src/hooks/rankings/useRankingsData.ts` | Rankings queries |
| `fetchPowerScoreTrends(teamId)` | `src/hooks/usePowerScoreTrends.ts` | `.from('power_score_history').select(...)` |
| `fetchWeeklyPowerScoreTrends(seasonId)` | `src/hooks/useWeeklyPowerScoreTrends.ts` | Weekly trend queries |
| `fetchAllTeamsCareerPowerScores()` | `src/hooks/useAllTeamsCareerPowerScores.ts` | Career power score queries |
| `fetchHistoricalPowerScores(seasonId)` | `src/hooks/useHistoricalPowerScores.ts` | Historical queries |
| `fetchTeamPowerScores(teamId)` | `src/hooks/useTeamPowerScores.ts` | Per-team power scores |
| `fetchTeamCareerPowerScore(teamId)` | `src/hooks/useTeamCareerPowerScore.ts` | Career aggregate |

### Hooks to refactor:

- `src/hooks/rankings/useRankingsData.ts`
- `src/hooks/usePowerScoreTrends.ts`
- `src/hooks/useWeeklyPowerScoreTrends.ts`
- `src/hooks/useAllTeamsCareerPowerScores.ts`
- `src/hooks/useHistoricalPowerScores.ts`
- `src/hooks/useTeamPowerScores.ts`
- `src/hooks/useTeamCareerPowerScore.ts`

---

## Batch 10: Playoff & Bracket Hooks

**Files to enhance**: Existing bracket services in `src/services/brackets/`

### Functions to add/move:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchPlayoffBracketData(bracketId)` | `src/hooks/playoffs/usePlayoffBracketData.ts` | Bracket data queries |
| `fetchPlayoffMatches(bracketId)` | `src/hooks/playoffs/usePlayoffMatches.ts` | `.from('matches').select(...)` playoff matches |
| `updatePlayoffMatch(matchId, data)` | `src/hooks/playoffs/usePlayoffMatchUpdate.ts` | Playoff match updates |
| `validateSeeds(bracketId)` | `src/hooks/playoffs/useSeedValidation.ts` | `.rpc()` seed validation |
| `fetchPlayoffActions(bracketId)` | `src/hooks/playoffs/usePlayoffActions.ts` | Playoff action queries |
| `fetchBracketParticipants(bracketId)` | `src/components/playoffs/BracketDetail.tsx` | `.from('participant').select(...)` |

### Hooks to refactor:

- `src/hooks/playoffs/usePlayoffBracketData.ts`
- `src/hooks/playoffs/usePlayoffMatches.ts`
- `src/hooks/playoffs/usePlayoffMatchUpdate.ts`
- `src/hooks/playoffs/useSeedValidation.ts`
- `src/hooks/playoffs/usePlayoffActions.ts`
- `src/hooks/playoffs/usePlayoffEditMatch.ts`
- `src/hooks/playoffs/usePlayoffTeams.ts`
- `src/hooks/usePlayoffRealtime.ts` — keep realtime in hook, move data queries to service
- `src/hooks/useBracketCompletion.ts` — keep realtime in hook, move data queries to service
- `src/hooks/brackets/useBracketData.ts`
- `src/hooks/usePlayoffViewModel.compat.ts`

### Components to refactor:

- `src/components/playoffs/BracketDetail.tsx` — use bracket service for participant fetch
- `src/components/playoffs/BracketView.tsx` — use bracket service
- `src/components/playoffs/FinalStandings.tsx` — use bracket service
- `src/components/playoffs/form/bracket-teams/hooks/useOptimisticTeamMutations.ts` — use team/bracket services

### Also fix: Standardize bracket service error handling
Per CLAUDE.md "Known Inconsistency" — bracket services should use `handleDatabaseError()` and typed `ServiceError` classes instead of raw errors.

---

## Batch 11: Timeslot & Schedule

**Files to enhance**: `src/services/timeslots/TimeslotService.ts`

### Functions to add:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchTimeslotsByDate(date, seasonId)` | `src/hooks/useTimeslotsByDate.ts` | `.from('team_timeslots').select(...)` |
| `timeslotOperations(...)` | `src/hooks/useTimeslotOperations.ts` | Timeslot CRUD operations |
| `saveAutoSchedule(matches)` | `src/hooks/useAutoSchedule/useAutoScheduleSave.ts` | Batch match save |

### Hooks to refactor:

- `src/hooks/useTimeslotsByDate.ts` — `TimeslotService.fetchTimeslotsByDate()`
- `src/hooks/useTimeslotOperations.ts` — `TimeslotService.*` operations
- `src/hooks/useAutoSchedule/useAutoScheduleSave.ts` — move Supabase calls to service

### Components to refactor:

- `src/components/timeslots/WeekTimeslotDisplay.tsx` — use `TimeslotService` instead of direct `.from('team_timeslots')`

### Utils to refactor:

- `src/utils/autoSchedule/matchHistoryService.ts` — move Supabase calls to `MatchReadService` or `SeasonService`
- `src/utils/autoSchedule/compatibilityUtils.ts` — call services instead of Supabase directly
- `src/utils/autoSchedule/teamLoaderUtils.ts` — call `TeamFetchService` instead of direct queries

---

## Batch 12: Auth, Profile & Remaining Cleanup

**Files to enhance**: `src/services/profile/ProfileService.ts`

### Functions to add to ProfileService:

| Function | Source File | What it does |
|----------|-------------|--------------|
| `fetchAuthProfile(userId)` | `src/hooks/auth/useAuthProfile.ts` | `.from('profiles').select(...)` |
| Various auth queries | `src/hooks/auth/useAuthMethods.ts` | Auth-related profile queries |
| Auth index queries | `src/hooks/auth/index.ts` | Auth query functions |

### Hooks to refactor:

- `src/hooks/auth/useAuthProfile.ts` — `ProfileService.fetchAuthProfile()`
- `src/hooks/auth/useAuthMethods.ts` — `ProfileService.*`
- `src/hooks/auth/index.ts` — `ProfileService.*`

### Remaining hooks:

- `src/hooks/career/useCareerData.ts` — create `CareerService` or add to `TeamStatsService`
- `src/hooks/useSeasonOpponentHistory.ts` — add to `MatchReadService` or `HeadToHeadService`

### Remaining utils:

- `src/utils/teamStatsUtils/fetchTeamData.ts` — use `TeamFetchService`
- `src/utils/imageUpload.ts` — **keep as-is** (Supabase Storage is a different concern from database queries — acceptable to call directly)

---

## Service Template

Every new service function should follow this pattern:

```typescript
import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';

export const SeasonService = {
  fetchSeasons: async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) handleDatabaseError(error, 'Failed to fetch seasons');
    return data ?? [];
  },

  fetchSeasonById: async (seasonId: string) => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', seasonId)
      .single();

    if (error) handleDatabaseError(error, 'Failed to fetch season');
    return ensureFound(data, 'Season', seasonId);
  },
};
```

---

## Verification Checklist (per batch)

- [ ] No direct `supabase.from()` calls remain in refactored hooks/components
- [ ] New service functions use `handleDatabaseError()` and `ensureFound()` where appropriate
- [ ] Hooks use `useQuery` / `useMutation` calling service functions
- [ ] Realtime `.channel()` subscriptions remain in hooks (not moved to services)
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Existing functionality is preserved (no behavioral changes)

---

## Summary

| Batch | Scope | New Services | Files Changed (est.) |
|-------|-------|-------------|---------------------|
| 1 | Seasons | `SeasonService` | ~6 |
| 2 | Divisions | `DivisionService` | ~2 |
| 3 | Hero Cards | `HeroCardService` | ~4 |
| 4 | Blind Draw | `BlindDrawService` | ~3 |
| 5 | Match Comments/Reactions | `MatchCommentsService`, `MatchReactionsService` | ~3 |
| 6 | Message Board | `MessageService`, `MessageReactionsService` | ~4 |
| 7 | Match Operations | Enhance `MatchReadService`, `MatchWriteService` | ~14 |
| 8 | Team Data & Stats | Enhance `TeamFetchService`, `TeamStatsService` | ~13 |
| 9 | Rankings & Power Scores | Enhance `RankingsCalculationService` | ~8 |
| 10 | Playoffs & Brackets | Enhance bracket services | ~14 |
| 11 | Timeslots & Schedule | Enhance `TimeslotService` | ~7 |
| 12 | Auth, Profile & Cleanup | Enhance `ProfileService` | ~7 |
| **Total** | | **~10 new services** | **~85 files** |
