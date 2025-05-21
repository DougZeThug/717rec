
// Export main bracket services
export * from './BracketsService';
export * from './services/BracketCreationService';

// Export utility functions
export * from './utils/BracketConversionUtils';

// Export interfaces and types
export * from './types';

// Export the bracket manager instance
export * from './BracketsManagerInstance';

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
