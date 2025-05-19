
import { BracketsManager } from 'brackets-manager';
import type { SeedOrdering as LibSeedOrdering, InputStage } from 'brackets-model';
import { BracketsAdapter } from '../adapter/BracketsAdapter';
import { BracketFormat } from '@/constants/brackets';

// Re-export the SeedOrdering type from brackets-manager
export type SeedOrdering = LibSeedOrdering;

export interface StageSettings {
  grandFinal?: 'simple' | 'double'; 
  matchesChildCount?: number;
  size?: number;
  consolationFinal?: boolean;
  skipFirstRound?: boolean;
  seedOrdering?: SeedOrdering[];
  match?: { 
    games: number 
  };
}

export interface BracketStage {
  id: string;
  name: string;
  type: 'single_elimination' | 'double_elimination';
  seeding: string[];
  settings: StageSettings;
  divisionId?: string;
  tournamentId: string; // Required for InputStage
}

/**
 * Type-safe wrapper for BracketsManager 
 */
class BracketManager {
  private manager: BracketsManager;
  
  constructor() {
    const adapter = new BracketsAdapter();
    // Cast to any to avoid type errors until we fully align types
    this.manager = new BracketsManager(adapter as any);
  }
  
  /**
   * Convert our app's BracketFormat to the library's format
   */
  formatToStageType(format: BracketFormat): 'single_elimination' | 'double_elimination' {
    return format === 'Single Elimination' 
      ? 'single_elimination' 
      : 'double_elimination';
  }
  
  /**
   * Create a stage (bracket)
   */
  async createStage(stage: BracketStage): Promise<void> {
    // Create a new InputStage object that matches the library's expectations
    const inputStage: InputStage = {
      id: stage.id,
      name: stage.name,
      type: stage.type,
      seeding: stage.seeding,
      settings: {
        ...stage.settings,
        // Ensure seedOrdering is properly cast to the library's type
        seedOrdering: stage.settings.seedOrdering as LibSeedOrdering[]
      }
    };
    
    await this.manager.create.stage(inputStage);
  }
  
  /**
   * Register participants (teams)
   */
  async registerParticipants(participants: any[]): Promise<void> {
    // Fix: Use correct method name 'participant' instead of 'participants'
    for (const participant of participants) {
      await this.manager.create.participant(participant);
    }
  }
  
  /**
   * Update a match result
   */
  async updateMatchResult(matchId: string, result: any): Promise<void> {
    await this.manager.update.match({id: matchId, ...result});
  }
  
  /**
   * Get matches by filter
   */
  async getMatches(filter: Record<string, any>): Promise<any[]> {
    // Fix: brackets-manager doesn't have get.match method
    // Using select directly from the adapter
    return await this.manager.get.matches(filter);
  }
  
  /**
   * Delete matches by filter
   */
  async deleteMatches(filter: Record<string, any>): Promise<void> {
    // Fix: brackets-manager doesn't have delete.match method
    await this.manager.delete.matches(filter);
  }
}

// Singleton instance
export const bracketManager = new BracketManager();
