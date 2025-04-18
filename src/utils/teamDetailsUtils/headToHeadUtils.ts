
import { Team, Match } from "@/types";

export const calculateHeadToHead = (teamId: string, teams: Team[], matches: Match[]) => {
  const headToHeadMap: Record<string, { wins: number; losses: number; opponentName: string }> = {};
  
  // Get all matches involving this team
  const teamMatches = matches.filter(match => 
    match.team1Id === teamId || match.team2Id === teamId
  );
  
  teamMatches.forEach(match => {
    if (!match.iscompleted || !match.winnerId || !match.loserId) return;
    
    const opponentId = match.team1Id === teamId ? match.team2Id : match.team1Id;
    const opponent = teams.find(t => t.id === opponentId);
    
    if (!opponent) return;
    
    if (!headToHeadMap[opponentId]) {
      headToHeadMap[opponentId] = {
        wins: 0,
        losses: 0,
        opponentName: opponent.name
      };
    }
    
    if (match.winnerId === teamId) {
      headToHeadMap[opponentId].wins++;
    } else {
      headToHeadMap[opponentId].losses++;
    }
  });
  
  return headToHeadMap;
};
