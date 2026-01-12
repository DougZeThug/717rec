import { Team } from '@/types';

/**
 * Raw row type from v_team_details view
 * This matches the database schema for team data
 */
export interface TeamRowData {
  team_id: string;
  name: string | null;
  logo_url: string | null;
  image_url: string | null;
  wins: number | null;
  losses: number | null;
  game_wins: number | null;
  game_losses: number | null;
  division_id: string | null;
  divisionname: string | null;
  sos: number | null;
  power_score: number | null;
  win_percentage: number | null;
  game_win_percentage: number | null;
  players: unknown;
  created_at: string | null;
  close_match_losses: number | null;
}

/**
 * Transform a raw database row into a Team object
 * This is the single source of truth for team data transformation
 *
 * @param row - Raw team data from v_team_details view
 * @returns Transformed Team object
 */
export function transformTeamRow(row: TeamRowData): Team {
  return {
    id: row.team_id,
    name: row.name || 'Unnamed Team',
    logoUrl: row.image_url || row.logo_url || null,
    imageUrl: row.image_url || row.logo_url || null,
    players: Array.isArray(row.players) ? row.players : [],
    wins: row.wins || 0,
    losses: row.losses || 0,
    game_wins: row.game_wins || 0,
    game_losses: row.game_losses || 0,
    created_at: row.created_at || new Date().toISOString(),
    division_id: row.division_id || null,
    division: row.division_id || null, // Legacy compatibility
    divisionName: row.divisionname || null,
    // Preserve NULL/undefined values for SOS and power score (can be null for 0-0 teams)
    sos: typeof row.sos === 'number' ? row.sos : null,
    power_score: typeof row.power_score === 'number' ? row.power_score : null,
    win_percentage: row.win_percentage || 0,
    game_win_percentage: row.game_win_percentage || 0,
    close_match_losses: row.close_match_losses,
  };
}
