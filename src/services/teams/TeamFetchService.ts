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

export type {
  TeamAnalysis,
  TeamAnalysisInput,
  TeamsQueryOptions,
  TeamMembershipRecord,
  UserProfile,
  TeamMembershipForAdmin,
} from './teamFetch.types';

export {
  fetchTeamsFromApi,
  fetchTeamsWithOptions,
  fetchTeamDetails,
  fetchAvailableTeams,
  fetchTeamForStats,
} from './TeamQueryService';

export { fetchTeamAnalysis, upsertTeamAnalysis } from './TeamAnalysisService';

export {
  fetchPendingRequestsCount,
  fetchTeamRequests,
  fetchAllRequests,
  submitTeamRequest,
  updateTeamRequestStatus,
} from './TeamRequestService';

export {
  fetchTeamMembership,
  joinTeamMembership,
  leaveTeamMembership,
  fetchPendingMembershipCount,
  fetchPendingMembershipsForAdmin,
  updateMembershipApproval,
} from './TeamMembershipService';

export { fetchTeamBadges, fetchAllTeamBadges, fetchSeasonBadges } from './TeamBadgeService';
