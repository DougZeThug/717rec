
import { supabase } from "@/integrations/supabase/client";
import { PlayoffBracket } from "@/types";
import { transformMatches } from "@/utils/matchTransformer";

/**
 * Fetches detailed bracket data by ID
 */
export const fetchBracketById = async (bracketId: string): Promise<PlayoffBracket> => {
  // Get the bracket
  const { data: bracketData, error: bracketError } = await supabase
    .from('brackets')
    .select('*, divisions(name)')
    .eq('id', bracketId)
    .single();
    
  if (bracketError) throw bracketError;
  
  // Get all matches for this bracket
  const { data: matchesData, error: matchesError } = await supabase
    .from('matches')
    .select('*, games(*)')
    .eq('bracket_id', bracketId)
    .order('round_number', { ascending: true })
    .order('position', { ascending: true });
    
  if (matchesError) throw matchesError;
  
  // Find champion if exists (winner of the finals match)
  let champion = null;
  if (matchesData) {
    const finalMatch = matchesData.find(m => 
      m.match_type === 'finals' && 
      m.winner_id !== null
    );
    if (finalMatch) {
      champion = finalMatch.winner_id;
    }
  }
  
  // Transform matches to application format
  const matches = transformMatches(matchesData);
  
  // Transform to our application PlayoffBracket type
  const bracket: PlayoffBracket = {
    id: bracketData.id,
    name: bracketData.title,
    division: bracketData.divisions?.name || "Unknown",
    matches: matches,
    format: bracketData.format as "Single Elimination" | "Double Elimination" || "Single Elimination",
    champion: champion
  };
  
  return bracket;
};
