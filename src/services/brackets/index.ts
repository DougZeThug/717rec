
// Export main bracket services
export * from './services/BracketCreationService';

// Export utility functions
export * from './utils/BracketConversionUtils';

// Export interfaces and types
export * from './types';

// Export the bracket manager instance
export * from './BracketsManagerInstance';

/**
 * Service for updating match scores
 */
export class MatchScoreService {
  /**
   * Update a match's score
   */
  static async updateMatchScore(
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ): Promise<void> {
    // Determine the winner based on game wins
    const winnerId = team1GameWins > team2GameWins 
      ? matchId.split('-')[0]  // team1Id is first part of matchId
      : matchId.split('-')[1]; // team2Id is second part of matchId
      
    // Create a simplified match update structure for brackets-manager
    const matchData = {
      id: matchId,
      status: "completed",
      opponent1: {
        id: matchId.split('-')[0],
        score: team1Score,
        result: team1GameWins > team2GameWins ? "win" : "loss"
      },
      opponent2: {
        id: matchId.split('-')[1],
        score: team2Score,
        result: team2GameWins > team1GameWins ? "win" : "loss"
      }
    };
    
    try {
      // Import the manager from BracketsManagerInstance
      const { manager } = await import('./BracketsManagerInstance');
      
      // Update the match
      await manager.update.match(matchData);
      
      console.log(`Match ${matchId} updated with scores: ${team1Score}-${team2Score}`);
    } catch (error) {
      console.error('Error updating match score:', error);
      throw new Error(`Failed to update match score: ${error}`);
    }
  }
}

// Group bracket matches by type (winners/losers/finals) for a bracket
export function groupBracketMatchesByType(bracket: any) {
  if (!bracket || !bracket.matches || !Array.isArray(bracket.matches)) {
    return { winners: [], losers: [], finals: [] };
  }

  // Group matches by type and round
  const winners: any[][] = [];
  const losers: any[][] = [];
  const finals: any[] = [];

  // Process matches
  bracket.matches.forEach((match: any) => {
    const round = match.round || 0;
    
    // Categorize by match type
    if (match.matchType === "winners" || match.match_type === "winners") {
      // Ensure the round array exists
      winners[round] = winners[round] || [];
      winners[round].push(match);
    } 
    else if (match.matchType === "losers" || match.match_type === "losers") {
      // Ensure the round array exists
      losers[round] = losers[round] || [];
      losers[round].push(match);
    } 
    else if (match.matchType === "finals" || match.match_type === "finals") {
      finals.push(match);
    }
  });

  return { winners, losers, finals };
}

// Fetch a bracket by ID
export async function fetchBracketById(bracketId: string) {
  try {
    // This is a simplified implementation - in a real app, you'd query your database
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Get the bracket details
    const { data: bracket, error: bracketError } = await supabase
      .from('brackets')
      .select('*')
      .eq('id', bracketId)
      .single();
      
    if (bracketError) throw bracketError;
    
    // Get all matches for this bracket
    const { data: matches, error: matchesError } = await supabase
      .from('playoff_matches')
      .select('*')
      .eq('bracket_id', bracketId);
      
    if (matchesError) throw matchesError;
    
    // Combine data
    return {
      ...bracket,
      matches: matches || []
    };
  } catch (error) {
    console.error('Error fetching bracket:', error);
    throw new Error('Failed to fetch bracket data');
  }
}

// Interface for grouping matches by type
export interface BracketMatchesByType {
  winners: any[][];
  losers: any[][];
  finals: any[];
}
