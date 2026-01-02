
/**
 * Season-related type definitions
 */

export interface Season {
  id: string;
  name: string;
  is_active: boolean;
  is_archived: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  champion_team_id?: string | null;
  runner_up_team_id?: string | null;
}

export interface SeasonStats {
  season_id: string;
  team_id: string;
  match_wins: number;
  match_losses: number;
  game_wins: number;
  game_losses: number;
  power_score: number | null;
  sos: number | null;
  champion: boolean;
  runner_up: boolean;
  playoff_rank: number | null;
  division_name: string | null;
  seasons?: {
    name: string;
  } | null;
}

export interface ArchivedSeason {
  id: string;
  name: string;
  archived_at: string;
  champion_team_id?: string | null;
  runner_up_team_id?: string | null;
}

export interface SeasonWithStats extends Season {
  teamCount?: number;
  matchCount?: number;
  completedMatchCount?: number;
}
