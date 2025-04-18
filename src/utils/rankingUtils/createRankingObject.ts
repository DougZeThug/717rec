
import { Team, Match, Ranking } from "@/types";
import { calculateSOS } from "./calculateSOS";
import { calculateStreak } from "./calculateStreak";
import { calculateHeadToHead } from "./calculateHeadToHead";
import { calculateWinPercentage } from "./calculateWinPercentage";
import { calculateGameStats } from "@/utils/teamDetailsUtils/gameStatsUtils";
import { calculatePowerScore } from "@/utils/teamDetailsUtils/powerScoreUtils";

/**
 * Create a ranking object for a team
 */
export const createRankingObject = async (
  team: Team, 
  allTeams: Team[], 
  allMatches: Match[] | undefined,
  previousRankings: Record<string, number>
): Promise<Ranking> => {
  const winPercentage = calculateWinPercentage(team.wins || 0, team.losses || 0);
  const sos = await calculateSOS(team, allTeams, allMatches);
  const streak = calculateStreak(team.id, allMatches);
  const headToHead = calculateHeadToHead(team.id, allTeams, allMatches);
  const previousRank = previousRankings[team.id];
  
  // Calculate game-level statistics
  const { 
    gamesWon,
    gamesLost,
    gameWinPercentage,
    closeMatchLosses
  } = calculateGameStats(team.id, allMatches);
  
  // Calculate power score using the weighted formula
  const powerScore = calculatePowerScore(winPercentage, sos, gameWinPercentage);
  
  return {
    teamId: team.id,
    teamName: team.name || 'Unknown Team',
    logoUrl: team.logoUrl,
    imageUrl: team.imageUrl,
    wins: team.wins || 0,
    losses: team.losses || 0,
    winPercentage,
    divisionName: team.divisionName,
    sos,
    streak,
    headToHead,
    previousRank,
    rankChange: previousRank !== undefined ? 0 : undefined, // Will be updated after sorting
    gamesWon,
    gamesLost,
    gameWinPercentage,
    powerScore,
    closeMatchLosses
  };
};
