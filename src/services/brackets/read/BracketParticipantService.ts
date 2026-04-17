import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import type { Team } from '@/utils/playoffs/playoffTypes';

/**
 * Validate seeds for a division using RPC
 * Used by useSeedValidation hook
 */
export const validateSeeds = async (divisionId: string) => {
  const { data, error } = await supabase.rpc('validate_division_seeds', {
    p_division_id: divisionId,
  });

  if (error) {
    handleDatabaseError(error, 'Failed to validate seeds');
  }

  return data || [];
};

/**
 * Fetch bracket participants ordered by position
 * Used by BracketDetail component
 */
export const fetchBracketParticipants = async (bracketId: string) => {
  const { data, error } = await supabase
    .from('participant')
    .select('id, name, position')
    .eq('tournament_id', bracketId)
    .order('position', { ascending: true });

  if (error) {
    handleDatabaseError(error, 'Failed to fetch bracket participants');
  }

  return data;
};

/**
 * Fetch playoff teams with seed data from v_team_details and teams tables
 * Used by usePlayoffTeams hook
 */
export const fetchPlayoffTeams = async (): Promise<Team[]> => {
  const [teamDetailsResult, teamsResult] = await Promise.all([
    supabase.from('v_team_details').select(`
        team_id,
        name,
        logo_url,
        image_url,
        division_id,
        divisionname,
        wins,
        losses,
        game_wins,
        game_losses,
        players,
        power_score,
        sos,
        win_percentage,
        game_win_percentage,
        close_match_losses
      `),
    supabase.from('teams').select('id, seed'),
  ]);

  if (teamDetailsResult.error) {
    handleDatabaseError(teamDetailsResult.error, 'Failed to fetch playoff team details');
  }
  if (teamsResult.error) {
    handleDatabaseError(teamsResult.error, 'Failed to fetch team seeds');
  }

  const teamDetails = teamDetailsResult.data ?? [];
  const teamSeeds = new Map((teamsResult.data ?? []).map((t) => [t.id, t.seed]));

  return teamDetails.map((row) => ({
    id: row.team_id,
    name: row.name ?? 'Unnamed Team',
    logoUrl: row.image_url ?? row.logo_url ?? null,
    imageUrl: row.image_url ?? row.logo_url ?? null,
    division_id: row.division_id ?? null,
    division: row.division_id ?? null,
    divisionName: row.divisionname ?? null,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    game_wins: row.game_wins ?? 0,
    game_losses: row.game_losses ?? 0,
    players: Array.isArray(row.players) ? row.players : [],
    created_at: new Date().toISOString(),
    seed: teamSeeds.get(row.team_id) ?? null,
    power_score: row.power_score ?? 0,
    sos: row.sos ?? 0.5,
    win_percentage: row.win_percentage ?? 0,
    game_win_percentage: row.game_win_percentage ?? 0,
    close_match_losses: row.close_match_losses ?? 0,
  })) as Team[];
};

/**
 * Fetch participants by their IDs
 * Used by usePlayoffMatchUpdate hook (BM path)
 */
export const fetchParticipantsByIds = async (ids: number[]) => {
  const { data, error } = await supabase
    .from('participant')
    .select('id, name, tournament_id')
    .in('id', ids);

  if (error) {
    handleDatabaseError(error, 'Failed to fetch participants');
  }

  return data ?? [];
};

/**
 * Fetch team details by team names
 * Used by useBracketData hook (step 4)
 */
export const fetchTeamsByNames = async (teamNames: string[]) => {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, image_url')
    .in('name', teamNames);

  if (error) {
    handleDatabaseError(error, 'Failed to fetch teams by names');
  }

  return data ?? [];
};
