import { createTeamApi } from './teams/TeamCreateService';
import { deleteTeamApi } from './teams/TeamDeleteService';
import {
  fetchTeamsFromApi,
  fetchPendingMembershipCount,
} from './teams/TeamFetchService';
import { updateTeamApi, updateTeamNameAndImage } from './teams/TeamUpdateService';

// Re-export all team services from one central file
export {
  createTeamApi,
  deleteTeamApi,
  fetchTeamsFromApi,
  fetchPendingMembershipCount,
  updateTeamApi,
  updateTeamNameAndImage,
};
