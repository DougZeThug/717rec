import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/types';
import { errorLog, teamLog } from '@/utils/logger';

export const fetchTeamsForMatch = async (teamIds: string[]): Promise<Team[]> => {
  try {
    teamLog(`Fetching teams for ids:`, teamIds);

    // Return early if there are no team IDs
    if (!teamIds.length) {
      return [];
    }

    const { data, error } = await supabase
      .from('v_team_details')
      .select(
        'team_id, name, image_url, logo_url, players, wins, losses, game_wins, game_losses, created_at, division_id, divisionname, sos, power_score, win_percentage, game_win_percentage'
      )
      .in('team_id', teamIds);

    if (error) {
      errorLog('Error fetching team data:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      errorLog('No teams found for ids:', teamIds);
      return [];
    }

    // Create a Map to ensure each team ID is only represented once
    const uniqueTeams = new Map<string, any>();

    data.forEach((team) => {
      if (!uniqueTeams.has(team.team_id)) {
        uniqueTeams.set(team.team_id, team);
      }
    });

    const teamArray = Array.from(uniqueTeams.values());
    teamLog(`Found ${teamArray.length} unique teams out of ${data.length} total records`);

    const formattedTeams: Team[] = teamArray.map((team) => ({
      id: team.team_id,
      name: team.name,
      logoUrl: team.image_url || team.logo_url || null,
      imageUrl: team.image_url || team.logo_url || null,
      players: Array.isArray(team.players) ? team.players : [],
      wins: team.wins || 0,
      losses: team.losses || 0,
      game_wins: team.game_wins || 0,
      game_losses: team.game_losses || 0,
      created_at: team.created_at || new Date().toISOString(),
      division: team.division_id || null,
      divisionName: team.divisionname || null,
      sos:
        typeof team.sos === 'number'
          ? team.sos
          : typeof team.sos === 'string'
            ? parseFloat(team.sos)
            : 0.5,
      power_score:
        typeof team.power_score === 'number'
          ? team.power_score
          : typeof team.power_score === 'string'
            ? parseFloat(team.power_score)
            : 0,
      win_percentage: typeof team.win_percentage === 'number' ? team.win_percentage : 0,
      game_win_percentage:
        typeof team.game_win_percentage === 'number' ? team.game_win_percentage : 0,
    }));

    return formattedTeams;
  } catch (error) {
    errorLog('Error in fetchTeamsForMatch:', error);
    throw error;
  }
};
