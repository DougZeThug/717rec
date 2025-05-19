
import { BracketsManager } from 'brackets-manager';
import { BracketsAdapter } from '../adapter/BracketsAdapter';
import { BracketFormat } from '@/constants/brackets';
// Import the SeedOrdering type directly from brackets-manager to ensure compatibility
import { SeedOrdering as BracketsSeedOrdering } from 'brackets-model';

// Define our own type alias that matches the brackets-manager type
export type SeedOrdering = BracketsSeedOrdering;

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
    // Ensure seedOrdering is properly typed for brackets-manager
    // Use proper typing to match brackets-manager expectations
    const seedOrderings = (stage.settings.seedOrdering || []) as BracketsSeedOrdering[];
    
    await this.manager.create.stage({
      id: stage.id,
      name: stage.name,
      type: stage.type,
      tournamentId: stage.tournamentId,
      seeding: stage.seeding,
      settings: {
        ...stage.settings,
        seedOrdering: seedOrderings
      }
    });
  }
  
  /**
   * Register participants (teams)
   */
  async registerParticipants(participants: any[]): Promise<void> {
    // Fix: Use the correct method for registering participants
    // In brackets-manager, it's create.participant not create.participants
    await this.manager.create.participant(participants);
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
    // Use the adapter directly with proper typing for the table name
    // Cast the table name to satisfy type requirements
    const adapter = this.manager.storage;
    return await adapter.select('match', filter) as unknown as any[];
  }
  
  /**
   * Delete matches by filter
   */
  async deleteMatches(filter: Record<string, any>): Promise<void> {
    // Use the adapter directly with proper typing for the table name
    const adapter = this.manager.storage;
    // Cast the table name to satisfy type requirements
    await adapter.delete('match', filter);
  }
}

// Singleton instance
export const bracketManager = new BracketManager();
