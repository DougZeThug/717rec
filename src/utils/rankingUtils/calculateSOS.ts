
import { Team, Match } from "@/types";
import { supabase } from "@/integrations/supabase/client";

/**
 * Calculate the strength of schedule (SOS) for a team
 */
export const calculateSOS = async (team: Team, allTeams: Team[], allMatches: Match[] | undefined) => {
  if (!team || !allTeams || allTeams.length === 0) return 0.5;
  
  // Get division weights from the database
  const { data: divisionsData, error } = await supabase
    .from('divisions')
    .select('id, name, division_weight')
    .order('name');
  
  if (error) {
    console.error("Error fetching division weights:", error);
    return 0.5;
  }
  
  // Create a map of division IDs to weights
  const divisionWeights = new Map<string, number>();
  divisionsData?.forEach(div => {
    divisionWeights.set(div.id, div.division_weight || 0.85);
  });
  
  // Get matches involving this team
  const teamMatches = allMatches?.filter(match => 
    match.team1Id === team.id || match.team2Id === team.id
  ) || [];
  
  if (teamMatches.length === 0) return 0.5;
  
  // Get list of opponents
  const opponentIds = teamMatches.map(match => 
    match.team1Id === team.id ? match.team2Id : match.team1Id
  );
  
  // Find unique opponents
  const uniqueOpponentIds = [...new Set(opponentIds)];
  
  // Calculate average opponent weight
  let totalWeight = 0;
  let countedOpponents = 0;
  
  uniqueOpponentIds.forEach(opponentId => {
    const opponent = allTeams.find(t => t.id === opponentId);
    if (opponent && opponent.division) {
      const weight = divisionWeights.get(opponent.division) || 0.85;
      totalWeight += weight;
      countedOpponents++;
    }
  });
  
  return countedOpponents > 0 ? totalWeight / countedOpponents : 0.5;
};
