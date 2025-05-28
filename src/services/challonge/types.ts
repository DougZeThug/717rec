
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
  player1_id: number;
  player2_id: number;
  scores_csv: string;
  winner_id: number | null;
  state: "open" | "pending" | "complete";
}
