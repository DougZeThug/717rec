
/**
 * Transitional shim: re-exports the only runtime call sites still
 * referenced by BracketCreationDialog and usePlayoffBracketManagement.
 * Once those components are refactored you can delete this file and
 * import BracketCreationService directly.
 */

import { BracketCreationService } from '@/services/brackets/services/BracketCreationService';

export const BracketService = {
  createBracket: (
    name: string,
    format: string,
    divisionId: string,
    teamIds: string[]
  ) => BracketCreationService.createBracket(format as any, name, divisionId, teamIds),
  
  deleteBracket: async (id: string) => {
    // This is a stub implementation - replace with real implementation later
    console.warn('BracketService.deleteBracket is a stub and does not perform any operation');
    return Promise.resolve();
  },
  
  /* stub fetchers so TypeScript stops complaining.
     Replace with real implementations later. */
  getBracketById: async () => null,
  listBrackets: async () => []
};
