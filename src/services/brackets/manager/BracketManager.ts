
import * as BracketsManagerModule from 'brackets-manager';
import { BracketsAdapter } from '../adapter/BracketsAdapter';
import { BracketFilter, MatchFilter } from '../adapter/types/AdapterTypes';

// Define types for Bracket Manager
export type SeedOrdering = 'natural' | 'reverse' | 'half_shift' | 'reverse_half_shift' | string;

// Create a shared instance of BracketsAdapter
const bracketsAdapter = new BracketsAdapter();

// Create a bridge to support the old-style table-based API
// This extends the adapter with the original method signatures
const adapterWithLegacySupport = {
  // Standard interface methods
  insert: (data: any[]): Promise<boolean> => bracketsAdapter.insert(data),
  select: (filter?: BracketFilter) => bracketsAdapter.select(filter),
  update: (id: string, data: any) => bracketsAdapter.update(id, data),
  delete: (filter?: BracketFilter) => bracketsAdapter.delete(filter),
  
  // Legacy table-based methods used by brackets-manager
  insertInto: (table: string, data: any): Promise<boolean> => bracketsAdapter.insertIntoTable(table, data),
  selectFrom: (table: string, filter?: BracketFilter) => bracketsAdapter.selectFromTable(table, filter),
  updateIn: (table: string, id: string, data: any) => bracketsAdapter.updateInTable(table, id, data),
  deleteFrom: (table: string, filter?: BracketFilter) => bracketsAdapter.deleteFromTable(table, filter)
};

// Create the brackets manager instance
const baseManager = new BracketsManagerModule.BracketsManager(adapterWithLegacySupport);

// Create a facade that adds missing functionality and standardizes the interface
export const bracketManager = {
  // Pass-through methods from the base manager
  ...baseManager,
  
  // Add methods that match our expected API
  getMatches: (filter?: MatchFilter) => baseManager.select.match(filter),
  
  updateMatchResult: async (matchId: string, resultData: any) => {
    return baseManager.update.match(matchId, resultData);
  },
  
  createStage: async (stageData: any) => {
    // Create stage requires special processing
    return baseManager.create.stage(stageData);
  },
  
  registerParticipants: async (participants: any[]) => {
    // Register participants requires special processing
    return baseManager.create.participant(participants);
  },
  
  deleteMatches: async (filter?: MatchFilter) => {
    return baseManager.delete.match(filter);
  },
  
  // Helper utility functions
  formatToStageType: (format: string): string => {
    return format === 'Double Elimination' 
      ? 'double_elimination' 
      : 'single_elimination';
  }
};
