
import { supabase } from "@/integrations/supabase/client";
import { PlayoffBracket, PlayoffMatch, Team } from "@/types";
import { bracketManager } from "../manager/BracketManager";
import { BRACKET_STATES, BracketFormat } from "@/constants/brackets";
import { mapBracketsToAppFormat } from "../utils/BracketConversionUtils";

/**
 * Service for bracket query operations
 */
export class BracketQueryService {
  /**
   * Get bracket details including matches
   */
  static async getBracketDetails(bracketId: string): Promise<PlayoffBracket | null> {
    try {
      // Get bracket info
      const { data: bracketData, error: bracketError } = await supabase
        .from('brackets')
        .select('id, title, format, division_id, division:divisions(name)')
        .eq('id', bracketId)
        .single();
      
      if (bracketError) throw bracketError;
      
      if (!bracketData) return null;
      
      // Get matches using brackets-manager
      const matches = await bracketManager.getMatches({ stage_id: bracketId });
      
      // Map to our format
      const organizedMatches = mapBracketsToAppFormat(bracketId, matches);
      
      // Flatten for the PlayoffBracket interface
      const allMatches = [
        ...(organizedMatches.winners.flat() || []),
        ...(organizedMatches.losers.flat() || []), 
        ...(organizedMatches.finals || [])
      ];
      
      return {
        id: bracketData.id,
        name: bracketData.title,
        division: bracketData.division?.name || '',
        format: bracketData.format as BracketFormat,
        matches: allMatches as PlayoffMatch[],
        state: BRACKET_STATES.PENDING
      };
    } catch (error) {
      console.error("Error fetching bracket details:", error);
      throw error;
    }
  }
  
  /**
   * Get teams for bracket selection
   */
  static async getTeamsForBracket(divisionId: string): Promise<Team[]> {
    try {
      // Get the teams to include in the bracket
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, seed, image_url, logo_url')
        .eq('division_id', divisionId);
      
      if (teamsError) throw teamsError;
      return teams || [];
    } catch (error) {
      console.error("Error getting teams for bracket:", error);
      throw error;
    }
  }
}
