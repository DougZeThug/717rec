import { createTeamApi } from './teams/TeamCreateService';
import { deleteTeamApi } from './teams/TeamDeleteService';
import { updateTeamApi } from './teams/TeamUpdateService';

// Re-export all team services from one central file
export { createTeamApi, deleteTeamApi, updateTeamApi };
