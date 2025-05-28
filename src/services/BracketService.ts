
import { BracketCoreService } from './brackets/services/BracketCoreService';
import { BracketMatchService } from './brackets/services/BracketMatchService';
import { BracketValidationService } from './brackets/validation/BracketValidationService';
import { Team } from "@/types";
import { mapBracketsToAppFormat } from './brackets/utils/BracketConversionUtils';
import { BracketFormat, BRACKET_FORMATS } from '@/constants/brackets';
import { PlayoffGame } from '@/types/playoffs';
import { updateMatchScore } from './brackets/updateMatchScore';
import { computeBracketState } from './brackets/computeBracketState';
import { supabase } from '@/integrations/supabase/client';

// Export core functions
export { updateMatchScore };
export { computeBracketState };

// Core bracket operations
export const listBrackets = BracketCoreService.listBrackets;
export const getBracketById = BracketCoreService.getBracketById;
export const deleteBracket = BracketCoreService.deleteBracket;
export const fetchBracketById = BracketCoreService.fetchBracketById;

// Match operations
export const updateMatchResult = BracketMatchService.updateMatchResult;
export const groupBracketMatchesByType = BracketMatchService.groupBracketMatchesByType;

/** 
 * Create a double-elimination stage 
 */
export async function createDoubleElimStage(
  bracketId: string,
  name: string,
  teams: Team[],
  bestOf = 3,
): Promise<void> {
  BracketValidationService.validateBracketCreation(name, teams[0]?.division_id || '', teams.map(t => t.id));
  
  const divisionId = teams[0].division_id;
  if (!divisionId) {
    throw new Error('Teams must have a division ID');
  }

  await BracketCoreService.createBracket(
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
  BracketValidationService.validateBracketCreation(name, teams[0]?.division_id || '', teams.map(t => t.id));
  
  const divisionId = teams[0].division_id;
  if (!divisionId) {
    throw new Error('Teams must have a division ID');
  }

  await BracketCoreService.createBracket(
    BRACKET_FORMATS.SINGLE,
    name,
    divisionId,
    teams.map(t => t.id)
  );
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
  BracketValidationService.validateBracketCreation(name, divisionId, teams.map(t => t.id));

  const format: BracketFormat = Object.values(BRACKET_FORMATS).includes(bracketFormat as any) 
    ? bracketFormat 
    : BRACKET_FORMATS.SINGLE;
      
  return BracketCoreService.createBracket(
    format,
    name, 
    divisionId, 
    teams.map(t => t.id)
  );
}

// Re-export for convenience
export { mapBracketsToAppFormat };

// Export barrel
export const BracketService = {
  createBracket: BracketCoreService.createBracket,
  deleteBracket: BracketCoreService.deleteBracket,
  listBrackets: BracketCoreService.listBrackets,
  getBracketById: BracketCoreService.getBracketById,
  updateMatchScore,
  computeBracketState,
  supabase
};
