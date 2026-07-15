export interface BracketRecord {
  id: string;
  challonge_tournament_id: number;
  division_id: string;
  title: string;
  format: string;
  state: string;
  created_at: string;
  uses_brackets_manager: boolean;
  participants: Array<{
    teamId: string;
    name: string;
    seed: number;
  }>;
}
