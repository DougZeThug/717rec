
import { fetchTeamsFromApi } from "./teams/TeamFetchService";
import { createTeamApi } from "./teams/TeamCreateService";
import { updateTeamApi } from "./teams/TeamUpdateService";
import { deleteTeamApi } from "./teams/TeamDeleteService";
import { toggleTeamHiddenStatus, hideTeam, showTeam } from "./teams/TeamHideService";

// Re-export all team services from one central file
export {
  fetchTeamsFromApi,
  createTeamApi,
  updateTeamApi,
  deleteTeamApi,
  toggleTeamHiddenStatus,
  hideTeam,
  showTeam
};
