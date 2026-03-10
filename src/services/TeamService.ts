import { createTeamApi } from './teams/TeamCreateService';
import { deleteTeamApi } from './teams/TeamDeleteService';
import { fetchPendingMembershipCount, fetchTeamsFromApi } from './teams/TeamFetchService';
import { updateTeamApi, updateTeamNameAndImage } from './teams/TeamUpdateService';

// Re-export all team services from one central file
export {
  createTeamApi,
  deleteTeamApi,
  fetchPendingMembershipCount,
  fetchTeamsFromApi,
  updateTeamApi,
  updateTeamNameAndImage,
};
