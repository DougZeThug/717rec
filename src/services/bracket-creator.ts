
import { supabase } from "@/integrations/supabase/client";
import { bracketLog, successLog, failureLog } from "@/utils/logger";
import type { BracketRecord, CreateBracketPayload } from "@/types/bracketRecord";

export interface BracketCreationOptions {
  name: string;
  format: "singleElim" | "doubleElim";
  displayDivision: string;
  teams: { id: string; name: string; seed?: number }[];
  onProgress?: (step: string) => void;
}

export async function createBracket(options: BracketCreationOptions): Promise<BracketRecord> {
  const { name, format, displayDivision, teams, onProgress } = options;
  
  bracketLog("Starting E2E bracket creation:", { name, format, teamCount: teams.length });
  
  try {
    onProgress?.("Creating tournament and saving to database...");
    
    // Fetch complete team data with power scores for proper seeding
    const { data: fullTeamData, error: teamError } = await supabase
      .from('v_team_details')
      .select('team_id, name, power_score, wins, losses')
      .in('team_id', teams.map(t => t.id));
      
    if (teamError) {
      console.warn("Failed to fetch team details for seeding, using provided order:", teamError);
    }
    
    // Sort teams by ranking (same logic as useTeamRankings) and assign seeds
    const sortedTeams = teams.map(team => {
      const fullData = fullTeamData?.find(ft => ft.team_id === team.id);
      return {
        ...team,
        power_score: fullData?.power_score || null,
        wins: fullData?.wins || 0,
        losses: fullData?.losses || 0
      };
    }).sort((a, b) => {
      const aPowerScore = a.power_score;
      const bPowerScore = b.power_score;
      
      // Handle NULL power scores - put them at the end
      if (aPowerScore === null && bPowerScore === null) {
        // Both null, sort by win percentage
        const aWinPct = a.wins && (a.wins + a.losses) > 0 ? a.wins / (a.wins + a.losses) : 0;
        const bWinPct = b.wins && (b.wins + b.losses) > 0 ? b.wins / (b.wins + b.losses) : 0;
        if (aWinPct !== bWinPct) return bWinPct - aWinPct;
        return a.name.localeCompare(b.name);
      }
      if (aPowerScore === null) return 1;
      if (bPowerScore === null) return -1;
      
      // Both have power scores, sort by power score desc
      if (aPowerScore !== bPowerScore) {
        return bPowerScore - aPowerScore;
      }
      
      // Power scores equal, sort by win percentage desc
      const aWinPct = a.wins && (a.wins + a.losses) > 0 ? a.wins / (a.wins + a.losses) : 0;
      const bWinPct = b.wins && (b.wins + b.losses) > 0 ? b.wins / (b.wins + b.losses) : 0;
      if (aWinPct !== bWinPct) return bWinPct - aWinPct;
      
      // Win percentages equal, sort by name asc
      return a.name.localeCompare(b.name);
    }).map((team, index) => ({
      id: team.id,
      name: team.name,
      seed: index + 1 // Assign seeds based on ranking order
    }));

    const payload: CreateBracketPayload = {
      name,
      displayDivision,
      format,
      teams: sortedTeams
    };

    const { data, error } = await supabase.functions.invoke('create-bracket', {
      body: payload
    });

    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Unknown error occurred');
    }

    const bracket = data.bracket as BracketRecord;
    
    onProgress?.("Complete!");
    successLog("E2E bracket creation completed", `ID: ${bracket.id}`);
    
    return bracket;
    
  } catch (error) {
    failureLog("E2E bracket creation failed", error);
    
    // Re-throw with appropriate error type
    throw new Error(`Bracket creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
