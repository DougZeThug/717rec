import { BracketsManager } from "brackets-manager";
import { SupabaseStorage } from "./SupabaseStorage";
import { bracketLog, successLog, failureLog } from "@/utils/logger";

export interface CreateBracketOptions {
  bracketId: string;
  format: "single_elimination" | "double_elimination";
  teams: Array<{ id: string; name: string; seed: number }>;
}

export interface UpdateMatchOptions {
  matchId: string;
  team1Score: number;
  team2Score: number;
  team1GameWins: number;
  team2GameWins: number;
}

/**
 * Service wrapper for brackets-manager.js
 * Handles bracket creation and match updates using the library
 */
export class BracketManagerService {
  private storage: SupabaseStorage;
  private manager: BracketsManager;

  constructor() {
    this.storage = new SupabaseStorage();
    this.manager = new BracketsManager(this.storage);
  }

  /**
   * Create a new bracket using brackets-manager
   */
  async createBracket(options: CreateBracketOptions): Promise<void> {
    const { bracketId, format, teams } = options;

    bracketLog("Creating bracket with brackets-manager:", {
      bracketId,
      format,
      teamCount: teams.length
    });

    try {
      // Prepare seeding - convert team IDs to numeric format
      const seeding = teams
        .sort((a, b) => a.seed - b.seed)
        .map(team => team.name); // brackets-manager uses participant names

      // Create the tournament stage
      await this.manager.create({
        name: bracketId,
        tournamentId: 0, // Not used in our case
        type: format,
        seeding,
        settings: {
          seedOrdering: ["natural"], // Standard seeding
          grandFinal: format === "double_elimination" ? "simple" : "none",
          skipFirstRound: false
        }
      });

      successLog("Bracket created successfully with brackets-manager", bracketId);
    } catch (error) {
      failureLog("Failed to create bracket with brackets-manager", error);
      throw new Error(
        `Bracket creation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Update a match result and automatically progress winners
   */
  async updateMatch(options: UpdateMatchOptions): Promise<void> {
    const { matchId, team1Score, team2Score, team1GameWins, team2GameWins } = options;

    bracketLog("Updating match with brackets-manager:", {
      matchId,
      team1GameWins,
      team2GameWins
    });

    try {
      // Determine winner
      const winnerId = team1GameWins > team2GameWins ? 1 : 2; // opponent1 or opponent2

      // Update match in brackets-manager
      // The library will automatically handle:
      // - Setting winner/loser
      // - Progressing winners to next rounds
      // - Handling grand finals reset if needed
      await this.manager.update.match({
        id: parseInt(matchId), // Convert UUID to numeric ID via storage
        opponent1: {
          score: team1Score,
          result: winnerId === 1 ? "win" : "loss"
        },
        opponent2: {
          score: team2Score,
          result: winnerId === 2 ? "win" : "loss"
        }
      });

      successLog("Match updated successfully with brackets-manager", matchId);
    } catch (error) {
      failureLog("Failed to update match with brackets-manager", error);
      throw new Error(
        `Match update failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get the storage instance for direct access if needed
   */
  getStorage(): SupabaseStorage {
    return this.storage;
  }
}

// Export singleton instance
export const bracketManagerService = new BracketManagerService();
