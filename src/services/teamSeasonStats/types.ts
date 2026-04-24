import { SeasonRelation } from '@/hooks/teams/seasonBreakdown/types';

export interface TeamUpdate {
  team_id: string;
  season_id: string;
  division_name: string;
  playoff_rank: number | null;
}

export interface MatchRecord {
  winner_id: string | null;
  loser_id: string | null;
  team1_game_wins: number | null;
  team2_game_wins: number | null;
  team1_id: string | null;
  team2_id: string | null;
  season_id: string | null;
}

export interface BracketInfo {
  season_id: string;
  division_weight: number;
}

export interface PlayoffMatchRecord {
  winner_id: string | null;
  loser_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  team1_id: string | null;
  team2_id: string | null;
  bracket_id: string | null;
  bracketInfo: BracketInfo | null;
}

export interface SeasonStatRow {
  season_id: string;
  match_wins: number | null;
  match_losses: number | null;
  game_wins: number | null;
  game_losses: number | null;
  sos: number | null;
  power_score: number | null;
  champion: boolean | null;
  runner_up: boolean | null;
  playoff_rank: number | null;
  division_name: string | null;
  seasons: SeasonRelation | null;
}
