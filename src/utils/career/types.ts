// Types for career calculation utilities

export interface DivisionRecord {
  wins: number;
  losses: number;
}

export interface DivisionRecords {
  competitive: DivisionRecord;
  intermediate: DivisionRecord;
  recreational: DivisionRecord;
}

export interface PlayoffConsistency {
  seasonsPlayed: number;
  seasonsInPlayoffs: number;
  playoffRate: number;
}

export interface TeamTotals {
  career_match_wins: number;
  career_match_losses: number;
  career_game_wins: number;
  career_game_losses: number;
  career_playoff_wins: number;
  career_playoff_losses: number;
  championships: number;
  runner_ups: number;
  playoff_finishes: Array<{ rank: number; season_name: string; division_name: string }>;
  career_power_score: number;
  career_sweep_rate: number;
  career_sweeps: number;
  career_clutch_wins: number;
  career_clutch_game3s: number;
  career_clutch_win_pct: number;
  career_sos: number;
  division_records: DivisionRecords;
  playoff_consistency: PlayoffConsistency;
}

// Input types for calculation functions
export interface SeasonStats {
  match_wins: number | null;
  match_losses: number | null;
  game_wins: number | null;
  game_losses: number | null;
  champion: boolean | null;
  runner_up: boolean | null;
  playoff_rank: number | null;
  sos: number | null;
  division_name: string | null;
  power_score?: number | null;
  seasons?: { name: string } | null;
  season_id?: string | null;
}

export interface MatchData {
  winner_id: string | null;
  loser_id: string | null;
  team1_game_wins: number | null;
  team2_game_wins: number | null;
  team1_id: string | null;
  team2_id: string | null;
  season_id: string | null;
  team1?: { id: string; divisions: { name: string } | null } | null;
  team2?: { id: string; divisions: { name: string } | null } | null;
}

export interface ArchivedMatchData {
  winner_id: string | null;
  loser_id: string | null;
  team1_game_wins: number | null;
  team2_game_wins: number | null;
  team1_id: string | null;
  team2_id: string | null;
  season_id: string | null;
}

export interface PlayoffMatchData {
  winner_id: string | null;
  loser_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  team1_id: string | null;
  team2_id: string | null;
  bracket_id: string | null;
}

export interface CareerMatchStatsResult {
  career_match_wins: number;
  career_match_losses: number;
  career_game_wins: number;
  career_game_losses: number;
}

export interface SweepRateResult {
  career_sweeps: number;
  career_sweep_rate: number;
}

export interface PlayoffStatsResult {
  career_playoff_wins: number;
  career_playoff_losses: number;
  competitive_playoff_wins: number;
}

export interface PlayoffFinish {
  rank: number;
  season_name: string;
  division_name: string;
}

export type DivisionTier = 'competitive' | 'intermediate' | 'recreational';
