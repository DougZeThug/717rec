
import { supabase } from "@/integrations/supabase/client";
import { PlayoffBracket } from "@/types";
import { BracketState } from "./types";
import { determineChampion, normalizeBracketState, normalizeBracketFormat } from "./bracketFormatters";
import { transformDoubleEliminationMatches } from "./transformers/doubleElimination";
import { transformSingleEliminationMatches } from "./transformers/singleElimination";

/**
 * Fetches basic bracket data by ID
 */
async function fetchBaseBracketData(bracketId: string) {
  const { data: bracketData, error: bracketError } = await supabase
    .from('brackets')
    .select('*, divisions(name), state')
    .eq('id', bracketId)
    .single();
    
  if (bracketError) throw bracketError;
  
  console.log(`Fetching bracket: ${bracketId}, format: ${bracketData.format}`);
  
  return bracketData;
}

/**
 * Fetches single elimination matches for a bracket
 */
async function fetchSingleEliminationMatches(bracketId: string) {
  const { data: matchesData, error: matchesError } = await supabase
    .from('matches')
    .select('*, games(*)')
    .eq('bracket_id', bracketId)
    .order('round_number', { ascending: true })
    .order('position', { ascending: true });
    
  if (matchesError) throw matchesError;
  
  console.log(`Found ${matchesData?.length || 0} standard matches for bracket ${bracketId}`);
  
  return transformSingleEliminationMatches(matchesData || []);
}

/**
 * Fetches winners bracket matches for a double elimination bracket
 */
async function fetchWinnersBracketMatches(bracketId: string) {
  const { data: winnersMatchesData, error: winnersError } = await supabase
    .from('playoff_matches')
    .select('*, playoff_games(*)')
    .eq('bracket_id', bracketId)
    .eq('match_type', 'winners')
    .order('round', { ascending: true })
    .order('position', { ascending: true });
    
  if (winnersError) {
    console.error("Error fetching winners bracket matches:", winnersError);
    throw winnersError;
  }
  
  return winnersMatchesData || [];
}

/**
 * Fetches losers bracket matches for a double elimination bracket
 */
async function fetchLosersBracketMatches(bracketId: string) {
  const { data: losersMatchesData, error: losersError } = await supabase
    .from('playoff_matches')
    .select('*, playoff_games(*)')
    .eq('bracket_id', bracketId)
    .eq('match_type', 'losers')
    .order('round', { ascending: true })
    .order('position', { ascending: true });
    
  if (losersError) {
    console.error("Error fetching losers bracket matches:", losersError);
    throw losersError;
  }
  
  return losersMatchesData || [];
}

/**
 * Fetches finals matches for a double elimination bracket
 */
async function fetchFinalsBracketMatches(bracketId: string) {
  const { data: finalsMatchesData, error: finalsError } = await supabase
    .from('playoff_matches')
    .select('*, playoff_games(*)')
    .eq('bracket_id', bracketId)
    .eq('match_type', 'finals')
    .order('round', { ascending: true })
    .order('position', { ascending: true });
    
  if (finalsError) {
    console.error("Error fetching finals matches:", finalsError);
    throw finalsError;
  }
  
  return finalsMatchesData || [];
}

/**
 * Fetches double elimination matches for a bracket
 */
async function fetchDoubleEliminationMatches(bracketId: string) {
  try {
    const winnersMatches = await fetchWinnersBracketMatches(bracketId);
    const losersMatches = await fetchLosersBracketMatches(bracketId);
    const finalsMatches = await fetchFinalsBracketMatches(bracketId);
    
    const allPlayoffMatches = [
      ...winnersMatches,
      ...losersMatches,
      ...finalsMatches
    ];
    
    console.log(`Found ${allPlayoffMatches.length} total playoff matches for bracket ${bracketId}`);
    
    return transformDoubleEliminationMatches(allPlayoffMatches);
  } catch (error) {
    console.error("Error fetching double elimination matches:", error);
    throw error;
  }
}

/**
 * Fetches detailed bracket data by ID
 */
export const fetchBracketById = async (bracketId: string): Promise<PlayoffBracket> => {
  // Get the bracket
  const bracketData = await fetchBaseBracketData(bracketId);
  
  let matches = [];
  
  // Query different tables based on bracket format
  if (bracketData.format === 'Double Elimination') {
    matches = await fetchDoubleEliminationMatches(bracketId);
  } else {
    matches = await fetchSingleEliminationMatches(bracketId);
  }
  
  // Find champion if exists
  const champion = determineChampion(matches);
  
  // Convert the bracket state to a valid value
  const bracketState = normalizeBracketState(bracketData.state);
  
  // Transform to our application PlayoffBracket type
  const bracket: PlayoffBracket = {
    id: bracketData.id,
    name: bracketData.title,
    division: bracketData.divisions?.name || "Unknown",
    matches: matches,
    format: normalizeBracketFormat(bracketData.format),
    champion: champion,
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
    .select('*, divisions(name), state')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  
  return data.map(bracket => ({
    id: bracket.id,
    name: bracket.title,
    division: bracket.divisions?.name || "Unknown",
    format: normalizeBracketFormat(bracket.format),
    state: normalizeBracketState(bracket.state)
  }));
};
