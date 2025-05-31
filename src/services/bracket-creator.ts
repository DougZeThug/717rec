
import { supabase } from "@/integrations/supabase/client";
import { bracketLog, successLog, failureLog } from "@/utils/logger";
import type { BracketRecord, CreateBracketPayload } from "@/types/bracketRecord";

export interface BracketCreationOptions {
  name: string;
  format: "singleElim" | "doubleElim";
  divisionId: string;
  teams: { id: string; name: string; seed?: number }[];
  onProgress?: (step: string) => void;
}

export async function createBracket(options: BracketCreationOptions): Promise<BracketRecord> {
  const { name, format, divisionId, teams, onProgress } = options;
  
  bracketLog("Starting E2E bracket creation:", { name, format, teamCount: teams.length });
  
  try {
    onProgress?.("Creating tournament and saving to database...");
    
    const payload: CreateBracketPayload = {
      name,
      divisionId,
      format,
      teams: teams.sort((a, b) => (a.seed || 999) - (b.seed || 999))
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
