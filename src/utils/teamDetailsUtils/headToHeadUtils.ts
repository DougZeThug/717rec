
import { Team, Match, HeadToHeadMap } from "@/types";

export const calculateHeadToHead = (teamId: string, allTeams: Team[], allMatches: Match[]) => {
  const result: HeadToHeadMap = {};
  
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
      const isTeam1 = match.team1Id === teamId;
      const opponentId = isTeam1 ? match.team2Id : match.team1Id;
      
      if (opponentId && result[opponentId]) {
        if (match.winnerId === teamId) {
          result[opponentId].wins += 1;
        } else if (match.loserId === teamId) {
          result[opponentId].losses += 1;
        }
      }
    });
  
  return result;
};
