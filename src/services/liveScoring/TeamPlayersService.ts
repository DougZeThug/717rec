import { ValidationError } from '@/types/errors';
import { ensureFound } from '@/utils/errorHandler';

import type { TeamPlayerRow } from './dbTypes';
import { liveDb } from './liveDb';
import { handleLiveScoringError } from './LiveMatchService';

const TEAM_PLAYER_COLUMNS = 'id, team_id, display_name, profile_id, is_active, created_at';

export const TeamPlayersService = {
  fetchTeamPlayers: async (teamId: string): Promise<TeamPlayerRow[]> => {
    const { data, error } = await liveDb
      .from('team_players')
      .select(TEAM_PLAYER_COLUMNS)
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    if (error) handleLiveScoringError(error, 'Failed to fetch team players');
    return data ?? [];
  },

  addTeamPlayer: async (teamId: string, displayName: string): Promise<TeamPlayerRow> => {
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Player name cannot be empty');
    }

    const { data, error } = await liveDb
      .from('team_players')
      .insert({ team_id: teamId, display_name: trimmed })
      .select(TEAM_PLAYER_COLUMNS)
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ValidationError(`"${trimmed}" is already on this team's roster`);
      }
      handleLiveScoringError(error, 'Failed to add player');
    }
    return ensureFound(data, 'Player');
  },
};
