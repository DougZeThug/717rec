
import { supabase } from "@/integrations/supabase/client";
import { PlayoffBracket, PlayoffMatch } from "@/types";
import { transformMatches } from "@/utils/matchTransformer";
import { BracketMatchesByType } from "@/hooks/usePlayoffBracketData";

/**
 * Groups matches by round number into separate arrays
 * @param matches Array of matches to group
 * @returns Array of arrays, where each inner array contains matches from one round
 */
export const groupMatchesByRound = (matches: PlayoffMatch[]): PlayoffMatch[][] => {
  if (!matches || matches.length === 0) return [];
  
  const roundsMap: Record<number, PlayoffMatch[]> = {};
  
  // Group matches by round number
  matches.forEach(match => {
    if (!roundsMap[match.round]) {
      roundsMap[match.round] = [];
    }
    roundsMap[match.round].push(match);
  });
  
  // Sort rounds by number and then sort matches within each round by position
  return Object.keys(roundsMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map(roundNum => 
      roundsMap[roundNum].sort((a, b) => a.position - b.position)
    );
};

/**
 * Organizes a playoff bracket's matches by type (winners, losers, finals)
 * @param bracket The playoff bracket containing all matches
 * @returns Object with winners, losers, and finals matches grouped appropriately
 */
export const groupBracketMatchesByType = (bracket: PlayoffBracket): BracketMatchesByType => {
  // Filter matches by type
  const winnersMatches = bracket.matches.filter(m => m.matchType === 'winners');
  const losersMatches = bracket.matches.filter(m => m.matchType === 'losers');
  const finalsMatches = bracket.matches.filter(m => m.matchType === 'finals');
  
  return {
    winners: groupMatchesByRound(winnersMatches),
    losers: groupMatchesByRound(losersMatches),
    finals: finalsMatches
  };
};

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
    // For Double Elimination, query the playoff_matches table with separate queries for match types
    // This helps better organize the bracket display by match type

    // 1. Fetch winners bracket matches
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

    // 2. Fetch losers bracket matches
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

    // 3. Fetch finals matches
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

    // Combine all match data and transform
    const allPlayoffMatches = [
      ...(winnersMatchesData || []),
      ...(losersMatchesData || []),
      ...(finalsMatchesData || [])
    ];

    console.log(`Found ${allPlayoffMatches.length} total playoff matches for bracket ${bracketId}`);
    
    // Transform matches to application format
    matches = allPlayoffMatches?.map(match => {
      // Calculate game wins from the actual games if needed
      const gamesData = match.playoff_games || [];
      const calculatedTeam1GameWins = gamesData.filter(game => game.winner_id === match.team1_id).length;
      const calculatedTeam2GameWins = gamesData.filter(game => game.winner_id === match.team2_id).length;
      
      return {
        id: match.id,
        round: match.round,
        position: match.position,
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        // Use calculated values from games if direct fields don't exist
        team1GameWins: calculatedTeam1GameWins,
        team2GameWins: calculatedTeam2GameWins,
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
      };
    }) || [];
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
