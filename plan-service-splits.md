# Plan: Split Monolithic Services (>400 lines)

## Files Exceeding the ~400 Line Threshold

| File | Lines | Verdict |
|------|-------|---------|
| `RankingSnapshotService.ts` | 625 | **Split** |
| `matches/MatchReadService.ts` | 569 | **Split** |
| `career/CareerService.ts` | 506 | **Split** |
| `brackets/BracketReadService.ts` | 471 | **Split** |
| `brackets/manager/SupabaseSqlStorage.ts` | 434 | **Skip** (cohesive class) |

---

## 1. RankingSnapshotService.ts (625 lines) → `rankings/` subfolder

**Why split:** This file mixes 4 distinct responsibilities — snapshot CRUD, seasonal trend calculations, weekly trend calculations, and career/historical power score queries. Functions range from simple DB reads to complex multi-query trend computations.

**Proposed split:**

| New File | Functions Moved | ~Lines |
|----------|----------------|--------|
| `rankings/RankingSnapshotCrudService.ts` | `saveRankingsToDatabase`, `loadRankingsFromDatabase`, `migrateLocalStorageToDatabase`, `getCurrentSeasonId` (private helper) | ~145 |
| `rankings/PowerScoreTrendService.ts` | `fetchPowerScoreTrends`, `fetchWeeklyPowerScoreTrends` | ~230 |
| `rankings/PowerScoreHistoryService.ts` | `fetchAllTeamsCareerPowerScores`, `fetchHistoricalPowerScores`, `fetchTeamPowerScores`, `fetchTeamCareerPowerScore` | ~250 |

**Re-export:** Create `rankings/index.ts` (or update existing `RankingSnapshotService.ts` to re-export) so existing imports don't break.

---

## 2. matches/MatchReadService.ts (569 lines) → split within `matches/`

**Why split:** This file has grown to include basic match queries, admin-specific queries, scheduling utility queries (match history/pairing checks), and a large opponent history function (~150 lines with its own types). These serve very different consumers.

**Proposed split:**

| New File | Functions Moved | ~Lines |
|----------|----------------|--------|
| `matches/MatchReadService.ts` (trimmed) | `fetchMatchesWithTeams`, `fetchPendingMatches`, `fetchUncompletedMatches`, `fetchPendingScoresMatches`, `fetchScoreSubmissions`, `fetchMatchTimeslots`, `fetchTeamMatchesData`, `fetchMatchForTie`, `fetchMatchTeamIds`, `fetchTeamsByIds`, `fetchTeamsMap` | ~270 |
| `matches/MatchSchedulingService.ts` | `fetchActiveSeasonIdStrict`, `countTeamMatchesInSeason`, `fetchMatchPairsInSeason`, `checkTeamsEverPlayed` (the "Batch 11" scheduling helpers) | ~75 |
| `matches/MatchOpponentHistoryService.ts` | `fetchSeasonOpponentHistory` + its 3 local interfaces (`OpponentRecord`, `TeamOpponentHistory`, `SeasonOpponentData`) | ~155 |
| `matches/MatchAdminReadService.ts` | `fetchMatchesForAdmin` | ~30 |

**Note:** `MatchAdminReadService` is small on its own — could alternatively stay in the trimmed `MatchReadService`. The main wins are extracting the opponent history (self-contained, large, different consumer) and the scheduling helpers (different domain).

---

## 3. career/CareerService.ts (506 lines) → split within `career/`

**Why split:** Contains two very different patterns — a single-team fetcher (`fetchCareerData`, ~190 lines) and a bulk all-teams fetcher (`fetchAllTeamsCareerData`, ~220 lines) with its own types and helper function. The bulk version was added later to fix N+1 queries and has a different interface (`BulkTeamCareerData`).

**Proposed split:**

| New File | Functions Moved | ~Lines |
|----------|----------------|--------|
| `career/CareerService.ts` (trimmed) | `fetchCareerData` + its types (`TeamData`, `TeamDetailsArchive`, `CareerData`) | ~225 |
| `career/CareerBulkService.ts` | `fetchAllTeamsCareerData`, `groupMatchesByTeam` helper, `RawSeasonStatsRow` interface, `BulkTeamCareerData` interface | ~280 |

---

## 4. brackets/BracketReadService.ts (471 lines) → split within `brackets/`

**Why split:** This file has 17 exported functions serving different consumers — general bracket lookups, playoff match queries, brackets-manager (BM) specific queries, and a multi-step bracket data loading pipeline. Splitting by consumer/domain makes each file focused and easier to navigate.

**Proposed split:**

| New File | Functions Moved | ~Lines |
|----------|----------------|--------|
| `brackets/BracketReadService.ts` (trimmed) | `fetchBracketsForSelector`, `fetchPlayoffBracketData`, `fetchBracketsOverview`, `fetchBracketInfo`, `fetchFinalStandings`, `fetchPlayoffTeams`, `BracketOption` type, `computeBracketState`/`mapRowToBracket` helpers | ~200 |
| `brackets/BracketMatchReadService.ts` | `fetchPlayoffMatches`, `fetchPlayoffMatchWithBracket`, `fetchPlayoffMatchTeams`, `fetchBmMatchWithStage`, `fetchBmMatchData`, `fetchParticipantsByIds`, `fetchBracketParticipants` | ~130 |
| `brackets/BracketDataLoadService.ts` | `fetchBracketWithDivision`, `fetchStageAndParticipants`, `fetchGroupsAndMatches`, `fetchTeamsByNames` (the useBracketData step functions) | ~100 |

---

## 5. SupabaseSqlStorage.ts (434 lines) — NO SPLIT

**Why:** This is a single class implementing the `CrudInterface` from `brackets-manager`. All methods (select, insert, update, delete) plus the match transformation helpers are tightly coupled and must live together to satisfy the interface contract. Splitting would create artificial boundaries within a cohesive adapter. It's only 34 lines over the threshold.

---

## Implementation Steps

For each service split (1–4):
1. Create the new sub-service files with the moved functions
2. Update imports in the new files (supabase client, error handlers, types)
3. Add re-exports from the original file (or an index.ts) so existing consumers don't break
4. Search for all import sites and update them to point to the new files
5. Run `npm run lint` and `npm run build` to verify nothing is broken
6. Delete this plan file when done
