
import { MatchWithTeams } from "../types";
import { normalizeDate } from "@/utils/dateNormalization";

export const transformDatabaseMatchToMatchWithTeams = (match: any): MatchWithTeams => {
  const normalizedDate = normalizeDate(match.date, `transformDatabaseMatchToMatchWithTeams(${match.id})`);
  
  // Enhanced logging to debug date transformation
  console.log(`🔄 transformDatabaseMatchToMatchWithTeams for match ${match.id}:`, {
    originalDate: match.date,
    originalDateType: typeof match.date,
    normalizedDate,
    normalizedDateType: typeof normalizedDate,
    team1_game_wins: match.team1_game_wins,
    team1_game_wins_type: typeof match.team1_game_wins,
    team2_game_wins: match.team2_game_wins,
    team2_game_wins_type: typeof match.team2_game_wins
  });
  
  // Ensure game wins are properly parsed as numbers
  const team1GameWins = typeof match.team1_game_wins === 'number' ? 
    match.team1_game_wins : parseInt(String(match.team1_game_wins || 0));
    
  const team2GameWins = typeof match.team2_game_wins === 'number' ? 
    match.team2_game_wins : parseInt(String(match.team2_game_wins || 0));
    
  console.log(`Game wins parsing for match ${match.id}:`, {
    original: {
      team1_game_wins: match.team1_game_wins,
      team1_game_wins_type: typeof match.team1_game_wins,
      team2_game_wins: match.team2_game_wins,
      team2_game_wins_type: typeof match.team2_game_wins,
    },
    parsed: {
      team1GameWins,
      team2GameWins,
      team1GameWinsType: typeof team1GameWins,
      team2GameWinsType: typeof team2GameWins,
    }
  });
  
  return {
    id: match.id,
    team1Id: match.team1_id,
    team2Id: match.team2_id,
    team1Score: match.team1_score,
    team2Score: match.team2_score,
    date: normalizedDate,
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
    team1_game_wins: team1GameWins,
    team2_game_wins: team2GameWins,
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
    isValid: true
  };
};
