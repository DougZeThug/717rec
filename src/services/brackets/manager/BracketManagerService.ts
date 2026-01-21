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
 * Facade for bracket management operations
 *
 * This service delegates to specialized services while maintaining backward compatibility.
 * All operations use brackets-manager.js with SQL Storage and automatically persist to database.
 *
 * Uses SQL tables: stage, group, round, match, match_game, participant
 *
 * @example
 * // Create a new bracket
 * await bracketManagerService.createBracket({
 *   bracketId: 'playoff-2024',
 *   format: 'double_elimination',
 *   teams: [{ id: '1', name: 'Team A', seed: 1 }, ...],
 * });
 *
 * @example
 * // Update a match result
 * await bracketManagerService.updateMatch({
 *   matchId: 42,
 *   scores: {
 *     opponent1: { score: 21, result: 'win' },
 *     opponent2: { score: 19, result: 'loss' },
 *   },
 * });
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
   *
   * Calculates required bracket size (next power of 2), sorts teams by seed,
   * creates seeding array with BYE slots, and automatically handles BYE propagation.
   *
   * @param options - Bracket creation options
   * @param options.bracketId - Unique identifier for the bracket (stored in stage.tournament_id)
   * @param options.format - Tournament format ('single_elimination' or 'double_elimination')
   * @param options.teams - Array of teams with id, name, and seed (sorted by seed ascending)
   * @param options.grandFinalType - Grand final type for double elimination ('simple' or 'double')
   *
   * @returns Promise that resolves when bracket is created
   *
   * @throws {Error} If participant insertion fails or bracket creation fails
   *
   * @example
   * await bracketManagerService.createBracket({
   *   bracketId: 'playoffs-2024-division-a',
   *   format: 'double_elimination',
   *   teams: [
   *     { id: 'team-1', name: 'Thunder', seed: 1 },
   *     { id: 'team-2', name: 'Lightning', seed: 2 },
   *     { id: 'team-3', name: 'Storm', seed: 3 },
   *     { id: 'team-4', name: 'Cyclone', seed: 4 },
   *   ],
   *   grandFinalType: 'simple',
   * });
   */
  async createBracket(options: CreateBracketOptions): Promise<void> {
    return this.creationService.createBracket(options);
  }

  /**
   * Update a match result using brackets-manager with SQL storage
   *
   * Updates are serialized via matchUpdateQueue to prevent race conditions.
   * Special handling for BYE matches: unlocks to status 2 without calling brackets-manager.
   * For normal matches: runs normalizeLosersR1() 3 times with delays and normalizeGrandFinalPopulation().
   *
   * @param options - Match update options
   * @param options.matchId - Match ID in the brackets-manager database
   * @param options.scores - Score data for both opponents
   * @param options.scores.opponent1 - Score and result for opponent 1
   * @param options.scores.opponent2 - Score and result for opponent 2
   *
   * @returns Promise that resolves when match is updated and winner is propagated
   *
   * @throws {Error} If match update fails
   *
   * @example
   * await bracketManagerService.updateMatch({
   *   matchId: 42,
   *   scores: {
   *     opponent1: { score: 21, result: 'win' },
   *     opponent2: { score: 19, result: 'loss' },
   *   },
   * });
   *
   * @remarks
   * Both win and loss must be explicitly set for proper loser propagation in double elimination.
   * Updates are queued and processed serially to prevent race conditions during concurrent updates.
   */
  async updateMatch(options: UpdateMatchOptions): Promise<void> {
    return this.updateService.updateMatch(options);
  }

  /**
   * Normalize Losers Bracket Round 1 matches to fix duplicate participant issues
   *
   * Clears participant cache, finds LB group and Round 1, checks all matches for duplicates.
   * Critical fix: detects if same participant is in both opponent slots and uses direct SQL
   * to bypass defensive merge, clearing opponent2 and setting status to 4 (Waiting/BYE).
   * Also shifts opponent2 to opponent1 if opponent1 is empty.
   *
   * @param stageId - Stage ID in the brackets-manager database
   *
   * @returns Promise that resolves when normalization is complete
   *
   * @remarks
   * - Public method used externally by tests and other services
   * - Logs errors but does NOT throw (defensive, non-critical)
   * - Returns early with log if no LB group or LB R1 found
   *
   * @example
   * await bracketManagerService.normalizeLosersR1(stageId);
   */
  async normalizeLosersR1(stageId: number): Promise<void> {
    return this.normalizationService.normalizeLosersR1(stageId);
  }

  /**
   * Update the seeding of an existing bracket stage
   *
   * Gets stage ID, sorts teams by seed, calculates bracket size and BYEs needed,
   * creates seeding array in seed order, and updates stage seeding and participant positions.
   *
   * @param options - Seeding update options
   * @param options.bracketId - Bracket ID to update
   * @param options.newSeeding - New seeding array with id, name, and seed for each team
   * @param options.keepSameSize - If true, maintains current bracket size
   *
   * @returns Promise that resolves when seeding is updated
   *
   * @throws {Error} If no stage found for bracket
   * @throws {Error} If changes would affect existing match results
   * @throws {Error} If seeding update fails
   *
   * @example
   * await bracketManagerService.updateSeeding({
   *   bracketId: 'playoffs-2024',
   *   newSeeding: [
   *     { id: 'team-1', name: 'Thunder', seed: 1 },
   *     { id: 'team-2', name: 'Lightning', seed: 2 },
   *   ],
   *   keepSameSize: false,
   * });
   *
   * @remarks
   * Only allowed if changes don't impact existing match results.
   */
  async updateSeeding(options: UpdateSeedingOptions): Promise<void> {
    return this.seedingService.updateSeeding(options);
  }

  /**
   * Calculate and store final standings for a completed bracket
   *
   * Gets all stages for bracket, calls manager.get.finalStandings(), maps participant IDs
   * to team IDs, and upserts final standings to playoff_team_records table.
   *
   * @param bracketId - Bracket ID to calculate standings for
   *
   * @returns Promise that resolves when standings are calculated and stored
   *
   * @throws {Error} If database upsert fails
   * @throws {Error} If final standings calculation fails
   *
   * @example
   * await bracketManagerService.calculateFinalStandings('playoffs-2024');
   *
   * @remarks
   * - Returns early with warning if no stages found
   * - Returns early with error log if no participants found
   * - Uses upsert with conflict resolution on team_id, bracket_id
   */
  async calculateFinalStandings(bracketId: string): Promise<void> {
    return this.standingsService.calculateFinalStandings(bracketId);
  }

  /**
   * Get the storage instance for direct access if needed
   *
   * @returns The SupabaseSqlStorage instance used by this service
   *
   * @example
   * const storage = bracketManagerService.getStorage();
   * // Use storage for direct SQL queries if needed
   */
  getStorage(): SupabaseSqlStorage {
    return this.storage;
  }

  /**
   * Check if a match is eligible for BYE status toggle
   *
   * Checks if match is in Losers Bracket (group number === 2), has exactly one real team
   * (other slot is null or BYE), and has Locked (0), Waiting (1), or Completed (4) status.
   *
   * @param matchId - Match ID to check
   *
   * @returns Promise resolving to eligibility result
   * @returns result.ok - Whether match is eligible for BYE toggle
   * @returns result.reason - Reason if not eligible
   * @returns result.meta - Match metadata including status, opponents, and bracket info
   *
   * @example
   * const result = await bracketManagerService.checkByeEligibility(42);
   * if (result.ok) {
   *   console.log('Match is eligible for BYE toggle');
   * } else {
   *   console.log('Not eligible:', result.reason);
   * }
   */
  async checkByeEligibility(matchId: number) {
    return this.adminService.checkByeEligibility(matchId);
  }


  /**
   * Admin-only: Toggle BYE match status between Waiting, Ready, and Completed
   *
   * Supports reopening completed matches with downstream cascade clearing.
   *
   * For reopening completed matches (status 4, makeReady = false):
   * - If clearDownstream = false, checks if downstream matches populated and throws if they are
   * - If clearDownstream = true, nullifies all downstream matches
   * - Clears current match results and sets status to 2 (Ready)
   *
   * For normal toggle to Ready (makeReady = true):
   * - Validates eligibility via isLosersByeMatch()
   * - Sets status to 2 (Ready)
   *
   * For normal revert to Waiting (makeReady = false):
   * - Validates status is not >= 4
   * - Sets status to 1 (Waiting)
   *
   * @param matchId - Match ID in the brackets-manager database
   * @param makeReady - If true, set to Ready (2). If false, revert to Waiting (1) or reopen from Completed (4)
   * @param clearDownstream - If true, clear downstream matches when reopening completed match (default: false)
   *
   * @returns Promise resolving to status update result
   * @returns result.matchId - The match ID that was updated
   * @returns result.status - New status code
   * @returns result.statusName - Human-readable status name
   * @returns result.message - Success message
   *
   * @throws {Error} If cannot set to Ready due to eligibility check failure
   * @throws {Error} If cannot reopen completed match with downstream populated (when clearDownstream = false)
   * @throws {Error} If match data unavailable
   * @throws {Error} If cannot revert due to invalid status
   * @throws {Error} If toggle operation fails
   *
   * @example
   * // Toggle match to Ready status
   * const result = await bracketManagerService.adminToggleByeReady(42, true);
   * console.log(result.message); // "Match 42 set to Ready"
   *
   * @example
   * // Reopen completed match and clear downstream
   * const result = await bracketManagerService.adminToggleByeReady(42, false, true);
   * console.log(result.message); // "Match 42 reopened to Ready (downstream cleared)"
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
