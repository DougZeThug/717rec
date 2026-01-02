
import { SeasonStats, MatchData, CareerMatchStatsResult } from './types';

interface CareerMatchStatsInput {
  seasonStats: SeasonStats[] | null;
  currentMatches: MatchData[] | null;
  teamId: string;
}

/**
 * Calculates career match and game statistics for a team.
 * Aggregates historical season stats + current season matches.
 */
export const calculateCareerMatchStats = ({
  seasonStats,
  currentMatches,
  teamId
}: CareerMatchStatsInput): CareerMatchStatsResult => {
  // Start with historical season stats
  let career_match_wins = seasonStats?.reduce((sum, stat) => sum + (stat.match_wins || 0), 0) || 0;
  let career_match_losses = seasonStats?.reduce((sum, stat) => sum + (stat.match_losses || 0), 0) || 0;
  let career_game_wins = seasonStats?.reduce((sum, stat) => sum + (stat.game_wins || 0), 0) || 0;
  let career_game_losses = seasonStats?.reduce((sum, stat) => sum + (stat.game_losses || 0), 0) || 0;

  // Add current season matches
  if (currentMatches) {
    for (const match of currentMatches) {
      if (match.winner_id === teamId) {
        career_match_wins++;
        career_game_wins += match.team1_id === teamId 
          ? (match.team1_game_wins || 0) 
          : (match.team2_game_wins || 0);
        career_game_losses += match.team1_id === teamId 
          ? (match.team2_game_wins || 0) 
          : (match.team1_game_wins || 0);
      } else if (match.loser_id === teamId) {
        career_match_losses++;
        career_game_wins += match.team1_id === teamId 
          ? (match.team1_game_wins || 0) 
          : (match.team2_game_wins || 0);
        career_game_losses += match.team1_id === teamId 
          ? (match.team2_game_wins || 0) 
          : (match.team1_game_wins || 0);
      }
    }
  }

  return {
    career_match_wins,
    career_match_losses,
    career_game_wins,
    career_game_losses
  };
};
