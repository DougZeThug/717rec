
import { Team } from "@/types";
import { mapBracketsToAppFormat } from './brackets/utils/BracketConversionUtils';
import { BracketFormat, BRACKET_FORMATS, BracketState } from '@/constants/brackets';
import { PlayoffMatch, PlayoffGame } from '@/types/playoffs';
import { supabase } from '@/integrations/supabase/client';
import { BracketMapper } from './brackets/mappers/BracketMapper';
import { BracketDto, MatchDto } from '@/types/supabase.generated';
import { computeBracketState } from './brackets/computeBracketState';

// Export bracket state helper
export { computeBracketState };

export const listBrackets = async () => {
  try {
    const { data, error } = await supabase
      .from('brackets')
      .select('*, matches(*)');
    
    if (error) throw new Error(error.message);
    
    return data.map(bracketDto => {
      const matchesDto = bracketDto.matches || [];
      return BracketMapper.bracketDtoToDomain(bracketDto, matchesDto);
    });
  } catch (error) {
    console.error('Error listing brackets:', error);
    throw new Error(`Failed to list brackets: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const getBracketById = async (id: string) => {
  try {
    if (!id) {
      throw new Error('Bracket ID is required');
    }

    const { data, error } = await supabase
      .from('brackets')
      .select('*, matches(*)')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    
    return BracketMapper.bracketDtoToDomain(
      data, 
      (data.matches || [])
    );
  } catch (error) {
    console.error('Error getting bracket by ID:', error);
    throw new Error(`Failed to get bracket: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const deleteBracket = async (id: string) => {
  try {
    if (!id) {
      throw new Error('Bracket ID is required');
    }

    const { error } = await supabase.from('brackets').delete().eq('id', id);
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error('Error deleting bracket:', error);
    throw new Error(`Failed to delete bracket: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/** 
 * Create a double-elimination stage 
 * @deprecated Use ChallongeService instead
 */
export async function createDoubleElimStage(
  bracketId: string,
  name: string,
  teams: Team[],
  bestOf = 3,
): Promise<void> {
  throw new Error('Legacy bracket creation deprecated - use ChallongeService instead');
}

/** 
 * Create a single-elimination stage 
 * @deprecated Use ChallongeService instead
 */
export async function createSingleElimStage(
  bracketId: string,
  name: string,
  teams: Team[],
  bestOf = 3,
): Promise<void> {
  throw new Error('Legacy bracket creation deprecated - use ChallongeService instead');
}

/** 
 * Update a match result 
 * @deprecated Legacy function - use ChallongeService instead
 */
export async function updateMatchResult(
  matchId: string,
  winnerId: string,
  team1Score: number,
  team2Score: number,
  team1GameWins: number = 0,
  team2GameWins: number = 0,
  games?: PlayoffGame[]
): Promise<void> {
  throw new Error('Legacy match updates deprecated - use ChallongeService instead');
}

/** 
 * Create a Tournament Bracket
 * @deprecated Use ChallongeService instead
 */
export async function createTournamentBracket(
  bracketFormat: BracketFormat,
  name: string,
  divisionId: string,
  teams: Team[]
): Promise<string> {
  throw new Error('Legacy bracket creation deprecated - use ChallongeService instead');
}

// Re-export for convenience
export { mapBracketsToAppFormat };

// Group bracket matches by type
export function groupBracketMatchesByType(bracket: any) {
  if (!bracket || !bracket.matches || !Array.isArray(bracket.matches)) {
    return { winners: [], losers: [], finals: [] };
  }

  const winners: any[][] = [];
  const losers: any[][] = [];
  const finals: any[] = [];

  bracket.matches.forEach((match: any) => {
    const round = match.round || 0;
    
    if (match.matchType === "winners" || match.match_type === "winners") {
      winners[round] = winners[round] || [];
      winners[round].push(match);
    } 
    else if (match.matchType === "losers" || match.match_type === "losers") {
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
    if (!bracketId) {
      throw new Error('Bracket ID is required');
    }

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
    
    return BracketMapper.bracketDtoToDomain(
      bracket, 
      (matches || [])
    );
  } catch (error) {
    console.error('Error fetching bracket:', error);
    throw new Error(`Failed to fetch bracket data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Export barrel
export const BracketService = {
  createBracket: () => { throw new Error('Legacy bracket creation deprecated - use ChallongeService instead'); },
  deleteBracket,
  listBrackets,
  getBracketById,
  computeBracketState,
  supabase
};
