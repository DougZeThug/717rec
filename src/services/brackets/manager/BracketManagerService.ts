import { BracketsManager } from 'brackets-manager';

import { SupabaseSqlStorage } from './SupabaseSqlStorage';
import type {
  CreateBracketOptions,
  UpdateMatchOptions,
  UpdateSeedingOptions,
} from './types/BracketServiceTypes';
import { BracketNormalizationService } from './services/BracketNormalizationService';
import { BracketAdminService } from './services/BracketAdminService';
import { BracketStandingsService } from './services/BracketStandingsService';
import { BracketSeedingService } from './services/BracketSeedingService';
import { BracketCreationService } from './services/BracketCreationService';
import { BracketUpdateService } from './services/BracketUpdateService';

// Re-export public types for consumers
export type { CreateBracketOptions, UpdateMatchOptions, UpdateSeedingOptions } from './types/BracketServiceTypes';

/**
 * Service wrapper for brackets-manager.js with SQL Storage
 * Uses SQL tables (stage, group, round, match, match_game, participant)
 * All operations automatically persist to database
 */
export class BracketManagerService {
  private storage: SupabaseSqlStorage;
  private manager: BracketsManager;
  private normalizationService: BracketNormalizationService;
  private adminService: BracketAdminService;
  private standingsService: BracketStandingsService;
  private seedingService: BracketSeedingService;
  private creationService: BracketCreationService;
  private updateService: BracketUpdateService;

  constructor() {
    this.storage = new SupabaseSqlStorage();
    // Enable verbose logging for brackets-manager operations
    const VERBOSE = true;
    this.manager = new BracketsManager(this.storage, VERBOSE);
    this.normalizationService = new BracketNormalizationService(this.storage);
    this.adminService = new BracketAdminService(this.storage);
    this.standingsService = new BracketStandingsService(this.storage, this.manager);
    this.seedingService = new BracketSeedingService(this.storage, this.manager);
    this.creationService = new BracketCreationService(this.storage, this.manager);
    this.updateService = new BracketUpdateService(this.storage, this.manager, this.normalizationService);
  }

  /**
   * Create a new bracket using brackets-manager with SQL storage
   */
  async createBracket(options: CreateBracketOptions): Promise<void> {
    return this.creationService.createBracket(options);
  }

  /**
   * Update a match result using brackets-manager with SQL storage
   * Both win and loss must be explicitly set for proper loser propagation
   * Updates are serialized to prevent race conditions during concurrent updates
   */
  async updateMatch(options: UpdateMatchOptions): Promise<void> {
    return this.updateService.updateMatch(options);
  }

  /**
   * Normalize Losers Bracket Round 1 matches to fix duplicate participant issues
   * Detects and fixes cases where the same participant is in both opponent slots
   * @public - Used externally by tests and other services
   */
  async normalizeLosersR1(stageId: number): Promise<void> {
    return this.normalizationService.normalizeLosersR1(stageId);
  }

  /**
   * Update the seeding of an existing bracket stage
   * Only allowed if changes don't impact existing match results
   */
  async updateSeeding(options: UpdateSeedingOptions): Promise<void> {
    return this.seedingService.updateSeeding(options);
  }

  /**
   * Calculate and store final standings for a completed bracket
   */
  async calculateFinalStandings(bracketId: string): Promise<void> {
    return this.standingsService.calculateFinalStandings(bracketId);
  }

  /**
   * Get the storage instance for direct access if needed
   */
  getStorage(): SupabaseSqlStorage {
    return this.storage;
  }

  /**
   * Check if a match is eligible for BYE status toggle (public wrapper)
   */
  async checkByeEligibility(matchId: number) {
    return this.adminService.checkByeEligibility(matchId);
  }


  /**
   * Admin-only: Toggle BYE match status between Waiting, Ready, and Completed
   *
   * Supports reopening completed matches with downstream cascade clearing.
   *
   * @param matchId - Match ID in the brackets-manager database
   * @param makeReady - If true, set to Ready (2). If false, revert to Waiting (1)
   * @param clearDownstream - If true, clear downstream matches when reopening completed match
   */
  async adminToggleByeReady(
    matchId: number,
    makeReady: boolean,
    clearDownstream: boolean = false
  ) {
    return this.adminService.adminToggleByeReady(matchId, makeReady, clearDownstream);
  }
}

// Export singleton instance
export const bracketManagerService = new BracketManagerService();
