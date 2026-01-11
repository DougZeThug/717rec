import { supabase } from '@/integrations/supabase/client';
import { errorLog, teamLog } from '@/utils/logger';

export const fetchTeamData = async (teamId: string) => {
  teamLog('Fetching team data for ID:', teamId);

  const { data: team, error } = await supabase
    .from('teams')
    .select(
      `
      id, 
      name, 
      wins, 
      losses, 
      game_wins, 
      game_losses,
      divisions (name)
    `
    )
    .eq('id', teamId)
    .maybeSingle();

  if (error || !team) {
    errorLog('ERROR FETCHING TEAM:', error || 'No team found with ID: ' + teamId);
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
