export interface BracketManagerMatchWithStage {
  id: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  number: number;
  status: number;
  opponent1_id: number | null;
  opponent1_score: number | null;
  opponent1_result: string | null;
  opponent2_id: number | null;
  opponent2_score: number | null;
  opponent2_result: string | null;
  child_count: number;
  stage: {
    id: number;
    name: string;
    type: string;
    tournament_id: number;
    number: number;
    settings: Record<string, unknown> | null;
  } | null;
}

export interface LegacyPlayoffMatchWithGames {
  id: string;
  bracket_id: string;
  round: number;
  position: number;
  match_type: string;
  best_of: number;
  status: string;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_id: string | null;
  loser_id: string | null;
  team1_seed: number | null;
  team2_seed: number | null;
  next_win_match_id: string | null;
  next_lose_match_id: string | null;
  bracket: {
    id: string;
    uses_brackets_manager: boolean | null;
  } | null;
  playoff_games: Array<{
    id: string;
    match_id: string;
    game_number: number;
    team1_score: number | null;
    team2_score: number | null;
    winner_id: string | null;
  }>;
}
