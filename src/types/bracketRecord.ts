
export interface BracketRecord {
  id: string;
  challonge_tournament_id: number;
  division_id: string;
  title: string;
  format: string;
  state: string;
  created_at: string;
  participants: Array<{
    teamId: string;
    name: string;
    seed: number;
  }>;
}

export interface CreateBracketPayload {
  name: string;
  displayDivision: string;
  format: 'singleElim' | 'doubleElim';
  teams: Array<{
    id: string;
    name: string;
    seed?: number;
  }>;
}
