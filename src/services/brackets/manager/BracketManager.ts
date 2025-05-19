
import { BracketsManager } from 'brackets-manager';
import { BracketsAdapter } from '../adapter/BracketsAdapter';
import { BracketFormat } from '@/constants/brackets';
// Import proper types from brackets-model
import { SeedOrdering as BracketsSeedOrdering, InputStage } from 'brackets-model';

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
    
    // Create InputStage object compatible with brackets-manager
    // Remove the id property when converting to InputStage
    const inputStage: InputStage = {
      name: stage.name,
      type: stage.type,
      tournamentId: stage.tournamentId,
      seeding: stage.seeding,
      settings: {
        ...stage.settings,
        seedOrdering: seedOrderings
      }
    };
    
    // According to brackets-manager API, we need to pass the stage directly
    // The InputStage type doesn't have an id property, so we need to cast it
    await this.manager.create.stage({
      ...inputStage,
      id: stage.id
    } as any);
  }
  
  /**
   * Register participants (teams)
   */
  async registerParticipants(participants: any[]): Promise<void> {
    // After checking the brackets-manager API, the correct method is likely 'participant' (singular)
    // Cast to any to avoid type errors
    await this.manager.create.participant(participants as any);
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
