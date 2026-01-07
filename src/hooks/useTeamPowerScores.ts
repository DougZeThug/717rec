
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { errorLog } from "@/utils/logger";

// Define interface for the team power score data
export interface TeamPowerScoreData {
  team_id: string;
  name: string;
  power_score: number;
}

export const useTeamPowerScores = () => {
  const [powerScores, setPowerScores] = useState<Record<string, number>>({});
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPowerScores = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('v_team_details')
          .select('team_id, name, power_score');
          
        if (error) {
          throw error;
        }
        
        // Create mappings for power scores and team names
        const scoreMap: Record<string, number> = {};
        const nameMap: Record<string, string> = {};
        
        data?.forEach((team: TeamPowerScoreData) => {
          scoreMap[team.team_id] = team.power_score;
          nameMap[team.team_id] = team.name;
        });
        
        setPowerScores(scoreMap);
        setTeamNames(nameMap);
      } catch (err) {
        errorLog("Error fetching team power scores:", err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPowerScores();
  }, []);
  
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
    error
  };
};
