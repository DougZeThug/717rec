// ---------------------------------------------------------------------------
// Types for season opponent history — used by useSeasonOpponentHistory hook
// ---------------------------------------------------------------------------

export interface OpponentRecord {
  opponentId: string;
  opponentName: string;
  opponentDivision: string | null;
  matchCount: number;
  wins: number;
  losses: number;
}

export interface TeamOpponentHistory {
  teamId: string;
  teamName: string;
  divisionId: string | null;
  divisionName: string | null;
  opponents: OpponentRecord[];
  uniqueOpponentCount: number;
  totalMatches: number;
}

export interface SeasonOpponentData {
  seasonId: string;
  seasonName: string;
  teams: TeamOpponentHistory[];
}
