import { fetchTeamForStats } from '@/services/teams/TeamFetchService';
import { errorLog, teamLog } from '@/utils/logger';

export const fetchTeamData = async (teamId: string) => {
  teamLog('Fetching team data for ID:', teamId);

  const team = await fetchTeamForStats(teamId);

  if (!team) {
    errorLog('ERROR FETCHING TEAM:', 'No team found with ID: ' + teamId);
    return null;
  }

  teamLog('Team data fetched:', {
    name: team.name,
    wins: team.wins,
    losses: team.losses,
    game_wins: team.game_wins,
    game_losses: team.game_losses,
  });

  return team;
};
