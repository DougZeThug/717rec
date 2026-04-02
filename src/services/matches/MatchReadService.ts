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

export {
  fetchMatchesWithTeams,
  fetchPendingMatches,
  fetchUncompletedMatches,
  fetchPendingScoresMatches,
  fetchMatchTimeslots,
  fetchScoreSubmissions,
  fetchMatchForTie,
  fetchMatchTeamIds,
} from './MatchQueryService';
export type { MatchFilters } from './MatchQueryService';

export { fetchTeamMatchesData, fetchTeamsByIds, fetchTeamsMap } from './MatchTeamLookupService';

export {
  fetchActiveSeasonIdStrict,
  countTeamMatchesInSeason,
  fetchMatchPairsInSeason,
  checkTeamsEverPlayed,
  haveTeamsPlayedBefore,
  fetchSeasonOpponentHistory,
} from './MatchHistoryService';
export type { SeasonOpponentData } from './MatchHistoryService';

export { fetchMatchesForAdmin, fetchScheduleMatches } from './MatchScheduleAdminService';
