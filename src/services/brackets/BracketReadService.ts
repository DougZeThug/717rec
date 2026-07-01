/**
 * Barrel file for bracket read operations.
 * Re-exports from focused sub-services for backwards compatibility.
 *
 * Sub-services:
 * - BracketSelectorService: bracket selector dropdown queries
 * - BracketInfoService: bracket info, overview, division joins
 * - BracketParticipantService: participants, teams, seed validation
 * - BracketMatchReadService: playoff & brackets-manager match queries
 * - BracketStageService: stage, group, participant association queries
 * - BracketStandingsService: final standings
 */

export type { BracketsOverviewRow } from './read/BracketInfoService';
export {
  fetchBracketInfo,
  fetchBracketsOverview,
  fetchBracketWithDivision,
  fetchPlayoffBracketData,
} from './read/BracketInfoService';
export {
  fetchBmMatchData,
  fetchBmMatchWithStage,
  fetchBracketsManagerMatchData,
  fetchPlayoffMatches,
  fetchPlayoffMatchTeams,
  fetchPlayoffMatchWithBracket,
} from './read/BracketMatchReadService';
export {
  fetchBracketParticipants,
  fetchParticipantsByIds,
  fetchPlayoffTeams,
  fetchTeamsByNames,
  validateSeeds,
} from './read/BracketParticipantService';
export type { BracketOption } from './read/BracketSelectorService';
export { fetchBracketsForSelector } from './read/BracketSelectorService';
export {
  fetchGroupsAndMatches,
  fetchStageAndParticipants,
  fetchStageIdByTournament,
} from './read/BracketStageService';
export { fetchFinalStandings } from './read/BracketStandingsService';
