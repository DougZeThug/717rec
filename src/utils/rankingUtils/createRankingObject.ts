
import { Team, Match, Ranking } from "@/types";
import { calculateSOS } from "./calculateSOS";
import { calculateStreak } from "./calculateStreak";
import { calculateHeadToHead } from "./calculateHeadToHead";
import { calculateWinPercentage } from "./calculateWinPercentage";

/**
 * Create a ranking object for a team
 */
export const createRankingObject = (
  team: Team, 
  allTeams: Team[], 
  allMatches: Match[] | undefined,
  previousRankings: Record<string, number>
): Ranking => {
  const winPercentage = calculateWinPercentage(team.wins || 0, team.losses || 0);
  const sos = calculateSOS(team, allTeams);
  const streak = calculateStreak(team.id, allMatches);
  const headToHead = calculateHeadToHead(team.id, allTeams, allMatches);
  const previousRank = previousRankings[team.id];
  
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
    rankChange: previousRank !== undefined ? 0 : undefined // Will be updated after sorting
  };
};
