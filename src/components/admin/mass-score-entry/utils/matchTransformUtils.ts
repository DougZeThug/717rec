
import { MatchWithTeams } from "../types";
import { validateMatchScores } from "./matchValidation";

export const transformDatabaseMatchToMatchWithTeams = (match: any): MatchWithTeams => {
  return {
    id: match.id,
    team1Id: match.team1_id,
    team2Id: match.team2_id,
    team1Score: match.team1_score,
    team2Score: match.team2_score,
    date: match.date,
    location: match.location,
    iscompleted: match.iscompleted,
    winnerId: match.winner_id,
    loserId: match.loser_id,
    round_number: match.round_number,
    position: match.position,
    bracket_id: match.bracket_id,
    match_type: match.match_type,
    next_match_id: match.next_match_id,
    next_loser_match_id: match.next_loser_match_id,
    best_of: match.best_of,
    created_at: match.created_at,
    team1: match.team1 ? {
      id: match.team1.id,
      name: match.team1.name,
      logoUrl: match.team1.logo_url,
      players: [],
      wins: 0,
      losses: 0,
      game_wins: 0,
      game_losses: 0,
      created_at: "",
      sos: 0.5,
      power_score: 0,
      win_percentage: 0,
      game_win_percentage: 0
    } : undefined,
    team2: match.team2 ? {
      id: match.team2.id,
      name: match.team2.name,
      logoUrl: match.team2.logo_url,
      players: [],
      wins: 0,
      losses: 0,
      game_wins: 0,
      game_losses: 0,
      created_at: "",
      sos: 0.5,
      power_score: 0,
      win_percentage: 0,
      game_win_percentage: 0
    } : undefined,
    isEdited: false,
    isValid: validateMatchScores(match.team1_score, match.team2_score)
  };
};
