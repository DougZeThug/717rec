
import { Team, Match, Ranking } from "@/types";
import { calculateSOS } from "./calculateSOS";
import { calculateStreak } from "./calculateStreak";
import { calculateHeadToHead } from "./calculateHeadToHead";
import { calculateWinPercentage } from "./calculateWinPercentage";
import { calculateGameStats } from "@/utils/teamDetailsUtils/gameStatsUtils";

/**
 * Create a ranking object for a team
 * Now uses the display_division from v_team_details for consistent grouping
 */
export const createRankingObject = async (
  team: Team, 
  allTeams: Team[], 
  allMatches: Match[] | undefined,
  previousRankings: Record<string, number>
): Promise<Ranking> => {
  // Parse and ensure we're working with numbers
  const wins = parseInt(String(team.wins)) || 0;
  const losses = parseInt(String(team.losses)) || 0;
  
  console.log(`Creating ranking for team ${team.name} with record ${wins}-${losses}`);
  
  // Calculate win percentage using wins and losses
  const winPercentage = calculateWinPercentage(wins, losses);
  console.log(`Win percentage calculated for ${team.name}: ${winPercentage} (${winPercentage * 100}%)`);
  
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
  
  // Use power_score directly from the database view (v_team_details)
  // which now includes the weighted calculation with division weights
  const powerScore = team.power_score || 0;
  
  console.log(`Team ${team.name} final stats: Record ${wins}-${losses}, Win% ${(winPercentage * 100).toFixed(1)}%, Games ${gamesWon}-${gamesLost}, Power ${powerScore.toFixed(1)}`);
  
  return {
    teamId: team.id,
    teamName: team.name || 'Unknown Team',
    logoUrl: team.logoUrl,
    imageUrl: team.imageUrl,
    wins: wins,
    losses: losses,
    winPercentage,
    // Use divisionName which now contains the display_division from the database
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
