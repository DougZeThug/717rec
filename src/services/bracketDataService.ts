
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
    .select('*, divisions(name), challonge_tournament_id, challonge_tournament_url')
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
  
  // Convert the bracket state to a valid value if it exists
  let bracketState: "pending" | "underway" | "complete" | undefined = undefined;
  if (bracketData.state) {
    if (["pending", "underway", "complete"].includes(bracketData.state)) {
      bracketState = bracketData.state as "pending" | "underway" | "complete";
    } else {
      // Default to pending if invalid value
      bracketState = "pending";
    }
  }
  
  // Transform to our application PlayoffBracket type
  const bracket: PlayoffBracket = {
    id: bracketData.id,
    name: bracketData.title,
    division: bracketData.divisions?.name || "Unknown",
    matches: matches,
    format: bracketData.format as "Single Elimination" | "Double Elimination" || "Single Elimination",
    champion: champion,
    challongeTournamentId: bracketData.challonge_tournament_id,
    challongeTournamentUrl: bracketData.challonge_tournament_url,
    state: bracketState
  };
  
  return bracket;
};

/**
 * Fetches all brackets with basic information
 */
export const fetchAllBrackets = async (): Promise<Partial<PlayoffBracket>[]> => {
  const { data, error } = await supabase
    .from('brackets')
    .select('*, divisions(name), challonge_tournament_id, challonge_tournament_url')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  
  return data.map(bracket => ({
    id: bracket.id,
    name: bracket.title,
    division: bracket.divisions?.name || "Unknown",
    format: bracket.format as "Single Elimination" | "Double Elimination",
    challongeTournamentId: bracket.challonge_tournament_id,
    challongeTournamentUrl: bracket.challonge_tournament_url
  }));
};
