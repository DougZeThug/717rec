
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
    .select('*, divisions(name), state')
    .eq('id', bracketId)
    .single();
    
  if (bracketError) throw bracketError;

  console.log(`Fetching bracket: ${bracketId}, format: ${bracketData.format}`);
  
  let matches = [];
  
  // Query different tables based on bracket format
  if (bracketData.format === 'Double Elimination') {
    // For Double Elimination, query the playoff_matches table
    const { data: playoffMatchesData, error: playoffMatchesError } = await supabase
      .from('playoff_matches')
      .select('*, playoff_games(*)')
      .eq('bracket_id', bracketId)
      .order('round', { ascending: true })
      .order('position', { ascending: true });
      
    if (playoffMatchesError) {
      console.error("Error fetching playoff matches:", playoffMatchesError);
      throw playoffMatchesError;
    }

    console.log(`Found ${playoffMatchesData?.length || 0} playoff matches for bracket ${bracketId}`);
    
    // Transform matches to application format
    matches = playoffMatchesData?.map(match => ({
      id: match.id,
      round: match.round,
      position: match.position,
      team1Id: match.team1_id,
      team2Id: match.team2_id,
      team1Score: match.team1_score,
      team2Score: match.team2_score,
      // The database fields might be named differently or not exist in playoff_matches
      // Use null as default if fields don't exist
      team1GameWins: match.team1_game_wins ?? null,
      team2GameWins: match.team2_game_wins ?? null,
      winnerId: match.winner_id,
      loserId: match.loser_id,
      matchType: match.match_type,
      team1Seed: match.team1_seed,
      team2Seed: match.team2_seed,
      nextWinMatchId: match.next_win_match_id,
      nextLoseMatchId: match.next_lose_match_id,
      bestOf: match.best_of || 3,
      games: match.playoff_games?.map(game => ({
        id: game.id,
        team1Score: game.team1_score,
        team2Score: game.team2_score,
        winner: game.winner_id
      })) || []
    })) || [];
  } else {
    // For Single Elimination, query the regular matches table (existing logic)
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('*, games(*)')
      .eq('bracket_id', bracketId)
      .order('round_number', { ascending: true })
      .order('position', { ascending: true });
      
    if (matchesError) throw matchesError;
    
    console.log(`Found ${matchesData?.length || 0} standard matches for bracket ${bracketId}`);
    
    // Transform matches to application format (existing logic)
    matches = transformMatches(matchesData);
  }
  
  // Find champion if exists (winner of the finals match)
  let champion = null;
  if (matches.length > 0) {
    const finalMatch = matches.find(m => 
      m.matchType === 'finals' && 
      m.winnerId !== null
    );
    if (finalMatch) {
      champion = finalMatch.winnerId;
    }
  }
  
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
    format: bracket.format as "Single Elimination" | "Double Elimination",
    state: bracket.state as "pending" | "underway" | "complete" | undefined
  }));
};
