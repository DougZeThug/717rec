/**
 * Transitional shim: re-exports the only runtime call sites still
 * referenced by BracketCreationDialog and usePlayoffBracketManagement.
 * Once those components are refactored you can delete this file and
 * import BracketCreationService directly.
 */

import { BracketCreationService } from '@/services/brackets/services/BracketCreationService';
import { Team } from "@/types";
import { mapBracketsToAppFormat } from './brackets/utils/BracketConversionUtils';
import { BracketFormat, BRACKET_FORMATS, BracketState } from '@/constants/brackets';
import { PlayoffMatch, PlayoffGame } from '@/types/playoffs';
import { supabase } from '@/integrations/supabase/client';
import { BracketMapper } from './brackets/mappers/BracketMapper';
import { BracketDto, MatchDto } from '@/types/supabase.generated';
import { updateMatchScore } from './brackets/updateMatchScore';
import { computeBracketState } from './brackets/computeBracketState';

// Export new score update function
export { updateMatchScore };

// Export bracket state helper
export { computeBracketState };

// TODO: UI uses this; replace with real impl if needed. For now noop.
export const scoreMatch = async () => ({ ok: true });

export const listBrackets = async () => {
  const { data, error } = await supabase
    .from('brackets')
    .select('*, matches(*)');
  if (error) throw new Error(error.message);
  
  return data.map(bracketDto => {
    const matchesDto = bracketDto.matches || [];
    return BracketMapper.bracketDtoToDomain(bracketDto as BracketDto, matchesDto);
  });
};

export const getBracketById = async (id: string) => {
  const { data, error } = await supabase
    .from('brackets')
    .select('*, matches(*)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  
  return BracketMapper.bracketDtoToDomain(
    data as BracketDto, 
    (data.matches || [])
  );
};

export const deleteBracket = async (id: string) => {
  const { error } = await supabase.from('brackets').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

/** 
 * Create a double-elimination stage (play-ins auto-handled) 
 */
export async function createDoubleElimStage(
  bracketId: string,
  name: string,
  teams: Team[],
  bestOf = 3,
): Promise<void> {
  // We'll implement this by creating a bracket with the correct format
  const divisionId = ''; // This would need to be retrieved or passed in
  await BracketCreationService.createBracket(
    BRACKET_FORMATS.DOUBLE,
    name,
    divisionId,
    teams.map(t => t.id)
  );
}

/** 
 * Create a single-elimination stage 
 */
export async function createSingleElimStage(
  bracketId: string,
  name: string,
  teams: Team[],
  bestOf = 3,
): Promise<void> {
  // We'll implement this by creating a bracket with the correct format
  const divisionId = ''; // This would need to be retrieved or passed in
  await BracketCreationService.createBracket(
    BRACKET_FORMATS.SINGLE,
    name,
    divisionId,
    teams.map(t => t.id)
  );
}

/** 
 * Update a match result 
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
  try {
    // Use the new updateMatchScore implementation
    await updateMatchScore(
      matchId,
      winnerId, 
      team1Score,
      team2Score,
      team1GameWins,
      team2GameWins,
      games
    );
    
    console.log(`Match ${matchId} updated with scores: ${team1Score}-${team2Score}`);
  } catch (error) {
    console.error('Error updating match result:', error);
    throw new Error(`Failed to update match result: ${error}`);
  }
}

/** 
 * Create a Tournament Bracket 
 */
export async function createTournamentBracket(
  bracketFormat: BracketFormat,
  name: string,
  divisionId: string,
  teams: Team[]
): Promise<string> {
  // Fix: Ensure bracketFormat is a valid BracketFormat by passing it directly
  const format: BracketFormat = Object.values(BRACKET_FORMATS).includes(bracketFormat as any) 
    ? bracketFormat 
    : BRACKET_FORMATS.SINGLE;
    
  return BracketCreationService.createBracket(
    format,
    name, 
    divisionId, 
    teams.map(t => t.id)
  );
}

// Re-export for convenience
export { mapBracketsToAppFormat };

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
    
    // Use our mapper to convert DTO to domain model
    return BracketMapper.bracketDtoToDomain(
      bracket as BracketDto, 
      (matches || [])
    );
  } catch (error) {
    console.error('Error fetching bracket:', error);
    throw new Error('Failed to fetch bracket data');
  }
}

// ——————————————————————————————————————————————
// Export barrel (declared AFTER all helpers)
// ——————————————————————————————————————————————
export const BracketService = {
  createBracket: BracketCreationService.createBracket,
  deleteBracket,
  listBrackets,
  getBracketById,
  updateMatchScore,
  computeBracketState,
  supabase // Export supabase to be used by our hooks
};
