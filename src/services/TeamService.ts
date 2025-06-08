
import { fetchTeamsFromApi } from "./teams/TeamFetchService";
import { createTeamApi } from "./teams/TeamCreateService";
import { updateTeamApi } from "./teams/TeamUpdateService";
import { deleteTeamApi } from "./teams/TeamDeleteService";

// Re-export all team services from one central file
export {
  fetchTeamsFromApi,
  createTeamApi,
  updateTeamApi,
  deleteTeamApi
};
