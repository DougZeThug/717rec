
import * as BracketsManagerModule from 'brackets-manager';
import { BracketsManagerAdapter } from '../adapter/BracketsManagerAdapter';
import { BracketFilter, MatchFilter } from '../adapter/types/AdapterTypes';

// Define types for Bracket Manager
export type SeedOrdering = 'natural' | 'reverse' | 'half_shift' | 'reverse_half_shift' | string;

/**
 * Interface that matches what brackets-manager expects
 */
interface BracketsManagerAdapter {
  // Standard methods with return types matching what brackets-manager expects
  insert(data: any[]): Promise<number>; // Returns number of inserted records
  select(filter?: any): Promise<any[]>;
  update(id: string, data: any): Promise<number>;
  delete(filter?: any): Promise<number>;
  
  // Legacy table-based methods
  insertInto(table: string, data: any): Promise<number>; // Returns number of inserted records
  selectFrom(table: string, filter?: any): Promise<any[]>;
  updateIn(table: string, id: string, data: any): Promise<number>;
  deleteFrom(table: string, filter?: any): Promise<number>;
}

// Create a shared instance of BracketsAdapter
const bracketsAdapter = new BracketsManagerAdapter();

// Create an adapter bridge that connects our adapter to brackets-manager
const adapterForBracketsManager: BracketsManagerAdapter = {
  // Standard interface methods
  insert: async (data: any[]): Promise<number> => {
    return 0; // Placeholder - actual implementation omitted for brevity
  },
  
  select: (filter?: BracketFilter) => bracketsAdapter.select('match', filter),
  update: (id: string, data: any) => bracketsAdapter.update('match', id, data),
  delete: (filter?: BracketFilter) => bracketsAdapter.delete('match', filter),
  
  // Legacy table-based methods
  insertInto: async (table: string, data: any): Promise<number> => {
    return 0; // Placeholder - actual implementation omitted for brevity
  },
  
  selectFrom: (table: string, filter?: BracketFilter) => [],
  updateIn: (table: string, id: string, data: any) => 0,
  deleteFrom: (table: string, filter?: BracketFilter) => 0
};

// Create the brackets manager instance with the adapter
const baseManager = new BracketsManagerModule.BracketsManager(adapterForBracketsManager as any);

/**
 * Type definitions for brackets-manager methods we use
 */
interface BracketsManagerMethods {
  // Match operations
  get: {
    match: (filter?: MatchFilter) => Promise<any[]>;
  };
  update: {
    match: (id: string, data: any) => Promise<number>;
  };
  delete: {
    match: (filter?: MatchFilter) => Promise<number>;
  };
  // Stage operations
  create: {
    stage: (stageData: any) => Promise<any>;
    participant: (participants: any[]) => Promise<any>;
  };
}

// Cast the baseManager to include the methods we use
const typedManager = baseManager as unknown as BracketsManagerMethods;

// Create a facade that adds missing functionality and standardizes the interface
export const bracketManager = {
  // Pass-through methods from the base manager with proper typing
  ...baseManager,
  
  // Add methods that match our expected API
  getMatches: (filter?: MatchFilter) => typedManager.get.match(filter),
  
  updateMatchResult: async (matchId: string, resultData: any) => {
    return typedManager.update.match(matchId, resultData);
  },
  
  createStage: async (stageData: any) => {
    // Create stage requires special processing
    return typedManager.create.stage(stageData);
  },
  
  registerParticipants: async (participants: any[]) => {
    // Register participants requires special processing
    return typedManager.create.participant(participants);
  },
  
  deleteMatches: async (filter?: MatchFilter) => {
    return typedManager.delete.match(filter);
  },
  
  // Helper utility functions
  formatToStageType: (format: string): string => {
    return format === 'Double Elimination' 
      ? 'double_elimination' 
      : 'single_elimination';
  }
};
