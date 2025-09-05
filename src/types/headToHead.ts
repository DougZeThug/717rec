export interface HeadToHeadRecord {
  team_id: string;
  opponent_id: string;
  opponent_name: string;
  matches_played: number;
  wins: number;
  losses: number;
  game_wins: number;
  game_losses: number;
  win_pct: number;
  last_played_at: string | null;
}

export interface HeadToHeadResponse {
  team_id: string;
  opponent_id: string;
  matches_played: number;
  wins: number;
  losses: number;
  game_wins: number;
  game_losses: number;
  win_pct: number;
  last_played_at: string | null;
}

export interface OpponentHistory {
  matches: Array<{
    id: string;
    date: string;
    team1_name: string;
    team2_name: string;
    team1_score: number;
    team2_score: number;
    team1_game_wins: number;
    team2_game_wins: number;
    winner_name: string;
    location?: string;
  }>;
  summary: HeadToHeadRecord;
}