
import { supabase } from "@/integrations/supabase/client";
import { PlayoffBracket } from "@/types";
import { BRACKET_STATES } from "@/constants/brackets";
import { bracketManager } from "./manager/BracketManager";
import { mapBracketsToAppFormat } from "./utils/BracketConversionUtils";

/**
 * Fetch all brackets
 */
export async function fetchAllBrackets(): Promise<PlayoffBracket[]> {
  try {
    const { data, error } = await supabase
      .from('brackets')
      .select('*, division:divisions(name)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(bracket => ({
      id: bracket.id,
      name: bracket.title,
      division: bracket.division?.name || '',
      format: bracket.format,
      matches: [], // Matches are loaded separately on demand
      state: bracket.state || BRACKET_STATES.PENDING
    }));
  } catch (error) {
    console.error('Error fetching brackets:', error);
    throw error;
  }
}

/**
 * Fetch a specific bracket by ID including matches
 */
export async function fetchBracketById(bracketId: string): Promise<PlayoffBracket | null> {
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
      format: bracketData.format,
      matches: allMatches,
      state: BRACKET_STATES.PENDING
    };
  } catch (error) {
    console.error('Error fetching bracket:', error);
    throw error;
  }
}
