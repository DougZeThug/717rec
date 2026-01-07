import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { errorLog } from "@/utils/logger";

// Define interface for the team power score data
export interface TeamPowerScoreData {
  team_id: string;
  name: string;
  power_score: number;
}

interface PowerScoreResult {
  powerScores: Record<string, number>;
  teamNames: Record<string, string>;
}

export const useTeamPowerScores = () => {
  const { data, isLoading, error } = useQuery<PowerScoreResult, Error>({
    queryKey: ['team-power-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_team_details')
        .select('team_id, name, power_score');
        
      if (error) {
        errorLog("Error fetching team power scores:", error);
        throw error;
      }
      
      // Create mappings for power scores and team names
      const scoreMap: Record<string, number> = {};
      const nameMap: Record<string, string> = {};
      
      data?.forEach((team: TeamPowerScoreData) => {
        scoreMap[team.team_id] = team.power_score;
        nameMap[team.team_id] = team.name;
      });
      
      return { powerScores: scoreMap, teamNames: nameMap };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - power scores don't change frequently
  });
  
  const powerScores = data?.powerScores ?? {};
  const teamNames = data?.teamNames ?? {};
  
  // Get power score by team ID
  const getTeamPowerScore = (teamId: string | null): number | undefined => {
    if (!teamId) return undefined;
    return powerScores[teamId];
  };
  
  // Get team name by ID
  const getTeamName = (teamId: string | null): string | undefined => {
    if (!teamId) return undefined;
    return teamNames[teamId];
  };

  return {
    powerScores,
    teamNames,
    getTeamPowerScore,
    getTeamName,
    isLoading,
    error: error ?? null
  };
};
