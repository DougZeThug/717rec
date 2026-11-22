/**
 * Barrel file for bracket read operations.
 * Re-exports from focused sub-services for backwards compatibility.
 *
 * Sub-services:
 * - BracketSelectorService: bracket selector dropdown queries
 * - BracketInfoService: bracket info, overview, division joins
 * - BracketParticipantService: participants, teams, seed validation
 * - BracketMatchReadService: brackets-manager match queries
 * - BracketStageService: stage, group, participant association queries
 * - BracketStandingsService: final standings
 */

export type { BracketsOverviewRow } from './read/BracketInfoService';
export {
  fetchBracketInfo,
  fetchBracketsOverview,
  fetchBracketWithDivision,
} from './read/BracketInfoService';
export { fetchBracketsManagerMatchData } from './read/BracketMatchReadService';
export {
  fetchBracketParticipants,
  fetchPlayoffTeams,
  fetchTeamsByIds,
  validateSeeds,
} from './read/BracketParticipantService';
export { fetchBracketsForSelector } from './read/BracketSelectorService';
export { fetchGroupsAndMatches, fetchStageAndParticipants } from './read/BracketStageService';
export { fetchFinalStandings } from './read/BracketStandingsService';
