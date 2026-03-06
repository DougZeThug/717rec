/**
 * MatchReadService — orchestration barrel
 *
 * Re-exports from the two focused sub-services so all existing imports
 * continue to work without modification:
 *
 *   MatchQueryService  — core match fetches (with teams, filters, scheduling helpers)
 *   MatchScoreService  — score submissions, pending/uncompleted match lookups
 */

export type { MatchFilters, SeasonOpponentData } from './MatchQueryService';
export {
  checkTeamsEverPlayed,
  countTeamMatchesInSeason,
  fetchActiveSeasonIdStrict,
  fetchMatchesForAdmin,
  fetchMatchesWithTeams,
  fetchMatchPairsInSeason,
  fetchMatchTeamIds,
  fetchSeasonOpponentHistory,
  fetchTeamMatchesData,
  fetchTeamsByIds,
  fetchTeamsMap,
} from './MatchQueryService';

export {
  fetchMatchForTie,
  fetchMatchTimeslots,
  fetchPendingMatches,
  fetchPendingScoresMatches,
  fetchScoreSubmissions,
  fetchUncompletedMatches,
} from './MatchScoreService';
