
import { BracketsManager } from 'brackets-manager';
import { BracketsAdapter } from '../adapter/BracketsAdapter';
import { BracketFormat } from '@/constants/brackets';

// Define SeedOrdering type locally since we can't find brackets-model
export type SeedOrdering = 
  | 'natural'
  | 'reverse'
  | 'half_shift'
  | 'reverse_half_shift'
  | 'pair_flip'
  | 'inner_outer'
  | 'groups.effort_balanced'
  | 'groups.snake'
  | 'groups.distance_based'
  | string;

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
    await this.manager.create.stage({
      id: stage.id,
      name: stage.name,
      type: stage.type,
      tournamentId: stage.tournamentId,
      seeding: stage.seeding,
      settings: {
        ...stage.settings,
        seedOrdering: stage.settings.seedOrdering as SeedOrdering[]
      }
    });
  }
  
  /**
   * Register participants (teams)
   */
  async registerParticipants(participants: any[]): Promise<void> {
    // Fix: Register participants using the correct method name
    await this.manager.create.participants(participants);
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
    // Use direct adapter implementation instead
    const adapter = this.manager.storage;
    return await adapter.select('matches', filter);
  }
  
  /**
   * Delete matches by filter
   */
  async deleteMatches(filter: Record<string, any>): Promise<void> {
    // Use direct adapter implementation instead
    const adapter = this.manager.storage;
    await adapter.delete('matches', filter);
  }
}

// Singleton instance
export const bracketManager = new BracketManager();
