/**
 * Barrel file for match read operations.
 * Re-exports from focused sub-services for backwards compatibility.
 *
 * Sub-services:
 * - MatchQueryService: core match fetching queries
 * - MatchTeamLookupService: team data lookups
 * - MatchHistoryService: scheduling history & opponent analysis
 * - MatchScheduleAdminService: schedule & admin views
 */

export type { SeasonOpponentData } from './MatchHistoryService';
export {
  checkTeamsEverPlayed,
  countTeamMatchesInSeason,
  fetchActiveSeasonIdStrict,
  fetchMatchPairsInSeason,
  fetchSeasonOpponentHistory,
  haveTeamsPlayedBefore,
} from './MatchHistoryService';
export type { MatchFilters } from './MatchQueryService';
export {
  fetchMatchesWithTeams,
  fetchMatchForTie,
  fetchMatchTeamIds,
  fetchMatchTimeslots,
  fetchPendingMatches,
  fetchPendingScoresMatches,
  fetchScoreSubmissions,
  fetchUncompletedMatches,
} from './MatchQueryService';
export { fetchMatchesForAdmin, fetchScheduleMatches } from './MatchScheduleAdminService';
export { fetchTeamMatchesData, fetchTeamsByIds, fetchTeamsMap } from './MatchTeamLookupService';
