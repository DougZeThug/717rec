
import { SeasonStats, MatchData, CareerMatchStatsResult } from './types';

interface CareerMatchStatsInput {
  seasonStats: SeasonStats[] | null;
  currentMatches: MatchData[] | null;
  teamId: string;
  currentSeasonId?: string | null;
}

/**
 * Calculates career match and game statistics for a team.
 * Aggregates historical season stats + current season matches.
 * 
 * IMPORTANT: To avoid double-counting, we exclude the current active season
 * from seasonStats (since currentMatches already contains those matches).
 */
export const calculateCareerMatchStats = ({
  seasonStats,
  currentMatches,
  teamId,
  currentSeasonId
}: CareerMatchStatsInput): CareerMatchStatsResult => {
  // Filter out current season from historical stats to avoid double-counting
  // (current season matches are counted separately from the matches table)
  const historicalStats = currentSeasonId 
    ? seasonStats?.filter(stat => stat.season_id !== currentSeasonId) 
    : seasonStats;

  // Start with historical season stats (excluding current season)
  let career_match_wins = historicalStats?.reduce((sum, stat) => sum + (stat.match_wins || 0), 0) || 0;
  let career_match_losses = historicalStats?.reduce((sum, stat) => sum + (stat.match_losses || 0), 0) || 0;
  let career_game_wins = historicalStats?.reduce((sum, stat) => sum + (stat.game_wins || 0), 0) || 0;
  let career_game_losses = historicalStats?.reduce((sum, stat) => sum + (stat.game_losses || 0), 0) || 0;

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
