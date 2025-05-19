
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
      
      // Determine the state of the bracket based on matches
      const state = this.determineBracketState(allMatches as PlayoffMatch[]);
      
      return {
        id: bracketData.id,
        name: bracketData.title,
        division: bracketData.division?.name || '',
        format: bracketData.format as BracketFormat,
        matches: allMatches as PlayoffMatch[],
        state: state
      };
    } catch (error) {
      console.error("Error fetching bracket details:", error);
      throw error;
    }
  }
  
  /**
   * Determine the state of a bracket based on its matches
   */
  private static determineBracketState(matches: PlayoffMatch[]): typeof BRACKET_STATES[keyof typeof BRACKET_STATES] {
    if (matches.length === 0) return BRACKET_STATES.PENDING;
    
    // Check if all matches are completed
    const allCompleted = matches.every(match => 
      match.team1Id && match.team2Id && match.winnerId);
    
    if (allCompleted) return BRACKET_STATES.COMPLETE;
    
    // Check if any matches have been played
    const anyPlayed = matches.some(match => match.winnerId);
    
    return anyPlayed ? BRACKET_STATES.UNDERWAY : BRACKET_STATES.PENDING;
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
