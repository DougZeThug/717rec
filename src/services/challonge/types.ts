
export interface ChallongeTournament {
  id: number;
  url: string;
  name: string;
  state: "pending" | "underway" | "complete";
}

export interface ChallongeParticipant {
  id: number;
  name: string;
  misc_info?: string;
}

export interface ChallongeMatch {
  id: number;
  tournament_id?: number;
  player1_id: number | null;
  player2_id: number | null;
  scores_csv: string;
  winner_id: number | null;
  state: "open" | "pending" | "complete";
  round: number;
  next_match_id: number | null;
  loser_id: number | null;
}

export interface ChallongeTournamentComplete {
  tournament: {
    id: number;
    url: string;
    name: string;
    state: "pending" | "underway" | "complete";
    tournament_type: "single elimination" | "double elimination";
    participants: Array<{ participant: ChallongeParticipant }>;
    matches: Array<{ match: ChallongeMatch }>;
  };
}
