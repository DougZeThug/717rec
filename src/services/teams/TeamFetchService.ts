/**
 * TeamFetchService — barrel re-export
 *
 * This file was split into focused service modules. All exports are
 * preserved here so existing imports continue to work unchanged.
 *
 * New code should import directly from the relevant module:
 *   - teamFetch.types.ts      — shared TypeScript interfaces
 *   - TeamQueryService.ts     — fetch team lists, details, and stats data
 *   - TeamAnalysisService.ts  — coach notes and analysis
 *   - TeamRequestService.ts   — join requests (submit, list, approve/reject)
 *   - TeamMembershipService.ts — membership (join, leave, admin approvals)
 *   - TeamBadgeService.ts     — achievement badges
 */

export { fetchTeamAnalysis, upsertTeamAnalysis } from './TeamAnalysisService';
export { fetchAllTeamBadges, fetchSeasonBadges, fetchTeamBadges } from './TeamBadgeService';
export type {
  TeamAnalysis,
  TeamAnalysisInput,
  TeamMembershipForAdmin,
  TeamMembershipRecord,
  TeamsQueryOptions,
  UserProfile,
} from './teamFetch.types';
export {
  fetchPendingMembershipCount,
  fetchPendingMembershipsForAdmin,
  fetchTeamMembership,
  joinTeamMembership,
  leaveTeamMembership,
  updateMembershipApproval,
} from './TeamMembershipService';
export {
  fetchAvailableTeams,
  fetchTeamDetails,
  fetchTeamForStats,
  fetchTeamsFromApi,
  fetchTeamsWithOptions,
} from './TeamQueryService';
export {
  fetchAllRequests,
  fetchPendingRequestsCount,
  fetchTeamRequests,
  submitTeamRequest,
  updateTeamRequestStatus,
} from './TeamRequestService';
