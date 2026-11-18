import { updateTeamNameAndImage } from '@/services/teams/TeamUpdateService';

/**
 * Save a team's own name and image (the member edit on My Team).
 *
 * A plain pass-through on purpose: the component keeps the toast, the refresh
 * and the cache invalidation in their exact order. Not `useUpdateTeam`: that one
 * is the admin edit and writes more tables.
 */
export const useUpdateTeamDetails = () => updateTeamNameAndImage;
