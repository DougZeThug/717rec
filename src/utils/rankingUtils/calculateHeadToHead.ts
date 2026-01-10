
import { Team, Match, HeadToHeadMap, HeadToHeadEntry } from "@/types";

/**
 * Calculate head-to-head records for a team against all other teams
 */
export const calculateHeadToHead = (teamId: string, allTeams: Team[] | undefined, allMatches: Match[] | undefined): HeadToHeadMap => {
  const result: HeadToHeadMap = {};
  
  if (!teamId || !allTeams || !allMatches || allTeams.length === 0) return result;
  
  // Initialize records for all teams
  allTeams.forEach(team => {
    if (team && team.id && team.id !== teamId) {
      result[team.id] = {
        opponentName: team.name || 'Unknown Team',
        wins: 0,
        losses: 0
      };
    }
  });
  
  // Count wins and losses against each team
  allMatches
    .filter(match => 
      match && 
      match.iscompleted && 
      (match.team1Id === teamId || match.team2Id === teamId)
    )
    .forEach(match => {
      if (!match) return;
      
      const isTeam1 = match.team1Id === teamId;
      const opponentId = isTeam1 ? match.team2Id : match.team1Id;
      
      if (opponentId && result[opponentId]) {
        if (match.winnerId === teamId) {
          result[opponentId].wins += 1;
        } else if (match.winnerId === opponentId) {
          result[opponentId].losses += 1;
        }
      }
    });
  
  return result;
};
