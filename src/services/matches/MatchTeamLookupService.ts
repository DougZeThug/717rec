import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { handleDatabaseError } from '@/utils/errorHandler';

/**
 * Service layer for team data lookup operations
 */

type MatchRow = Tables<'matches'>;

/** v_team_details columns embedded in the team-matches join-select. */
type TeamMatchDetail = Pick<
  Tables<'v_team_details'>,
  'team_id' | 'name' | 'image_url' | 'logo_url' | 'divisionname'
>;

/** A match row plus its two joined v_team_details rows. */
type MatchWithTeamDetails = MatchRow & {
  team1: TeamMatchDetail | null;
  team2: TeamMatchDetail | null;
};

/** v_team_details columns returned by the team-lookup queries. */
type TeamDetailsRow = Pick<
  Tables<'v_team_details'>,
  | 'team_id'
  | 'name'
  | 'image_url'
  | 'logo_url'
  | 'players'
  | 'wins'
  | 'losses'
  | 'game_wins'
  | 'game_losses'
  | 'created_at'
  | 'division_id'
  | 'divisionname'
  | 'sos'
  | 'power_score'
  | 'win_percentage'
  | 'game_win_percentage'
>;

/**
 * Fetch team matches for a specific team in the active season.
 * Returns null if no active season is found.
 * @throws {DatabaseError} When database operations fail
 */
export const fetchTeamMatchesData = async (
  teamId: string
): Promise<MatchWithTeamDetails[] | null> => {
  // Get active season first to filter matches
  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();

  // Returns null when no data exists yet (not an error) — caller renders an empty state.
  if (!activeSeason) {
    return null;
  }

  const { data, error } = await supabase
    .from('matches')
    .select(
      `
      id, team1_id, team2_id, team1_score, team2_score, date, location, iscompleted, winner_id, loser_id, round_number, position, bracket_id, match_type, next_match_id, next_loser_match_id, best_of, team1_game_wins, team2_game_wins, season_id, metadata, created_at,
      team1:v_team_details!team1_id(
        team_id,
        name,
        image_url,
        logo_url,
        divisionname
      ),
      team2:v_team_details!team2_id(
        team_id,
        name,
        image_url,
        logo_url,
        divisionname
      )
    `
    )
    .eq('season_id', activeSeason.id)
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .order('date');

  if (error) handleDatabaseError(error, 'Failed to fetch team matches');
  return data || [];
};

/**
 * Fetch teams by their IDs from v_team_details view
 * Returns empty array if no IDs provided
 * @throws {DatabaseError} When database operations fail
 */
export const fetchTeamsByIds = async (teamIds: string[]): Promise<TeamDetailsRow[]> => {
  if (!teamIds.length) return [];

  const { data, error } = await supabase
    .from('v_team_details')
    .select(
      'team_id, name, image_url, logo_url, players, wins, losses, game_wins, game_losses, created_at, division_id, divisionname, sos, power_score, win_percentage, game_win_percentage'
    )
    .in('team_id', teamIds);

  if (error) handleDatabaseError(error, 'Failed to fetch teams by IDs');
  return data || [];
};

/**
 * Fetch all teams from v_team_details view (for team lookup maps)
 * @throws {DatabaseError} When database operations fail
 */
export const fetchTeamsMap = async (): Promise<TeamDetailsRow[]> => {
  const { data, error } = await supabase
    .from('v_team_details')
    .select(
      'team_id, name, image_url, logo_url, players, wins, losses, game_wins, game_losses, created_at, division_id, divisionname, sos, power_score, win_percentage, game_win_percentage'
    );

  if (error) handleDatabaseError(error, 'Failed to fetch teams map');
  return data || [];
};
