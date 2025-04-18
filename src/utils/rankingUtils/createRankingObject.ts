
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
  // Make sure we're working with defined values for wins and losses
  const wins = team.wins || 0;
  const losses = team.losses || 0;
  
  console.log(`Creating ranking for team ${team.name} with record ${wins}-${losses}`);
  
  // Calculate win percentage using wins and losses
  const winPercentage = calculateWinPercentage(wins, losses);
  
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
  
  console.log(`Team ${team.name} stats: Record ${wins}-${losses}, Win% ${(winPercentage * 100).toFixed(1)}%, Games ${gamesWon}-${gamesLost}, Power ${powerScore.toFixed(1)}`);
  
  return {
    teamId: team.id,
    teamName: team.name || 'Unknown Team',
    logoUrl: team.logoUrl,
    imageUrl: team.imageUrl,
    wins: wins,
    losses: losses,
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
