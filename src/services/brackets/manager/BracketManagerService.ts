import { BracketsManager } from "brackets-manager";
import { SupabaseSqlStorage } from "./SupabaseSqlStorage";
import { supabase } from "@/integrations/supabase/client";
import { bracketLog, successLog, failureLog } from "@/utils/logger";

export interface CreateBracketOptions {
  bracketId: string;
  format: "single_elimination" | "double_elimination";
  teams: Array<{ id: string; name: string; seed: number }>;
  grandFinalType?: "simple" | "double";
}

export interface UpdateMatchOptions {
  matchId: number;
  scores: {
    opponent1: { score?: number; result?: "win" | "loss" | "draw" };
    opponent2: { score?: number; result?: "win" | "loss" | "draw" };
  };
}

/**
 * Service wrapper for brackets-manager.js with SQL Storage
 * Uses SQL tables (stage, group, round, match, match_game, participant)
 * All operations automatically persist to database
 */
export class BracketManagerService {
  private storage: SupabaseSqlStorage;
  private manager: BracketsManager;

  constructor() {
    this.storage = new SupabaseSqlStorage();
    this.manager = new BracketsManager(this.storage);
  }

  /**
   * Create a new bracket using brackets-manager with SQL storage
   */
  async createBracket(options: CreateBracketOptions): Promise<void> {
    const { bracketId, format, teams } = options;

    bracketLog("Creating bracket with SQL storage:", {
      bracketId,
      format,
      teamCount: teams.length
    });

    try {
      // Sort teams by seed and create seeding array
      const teamsBySeed = [...teams].sort((a, b) => a.seed - b.seed);
      const seeding = teamsBySeed.map(t => t.name);

      bracketLog("Team seeding:", { seeding });

      // Create bracket using brackets-manager (automatically saves to SQL tables)
      bracketLog("Calling brackets-manager create.stage()...");
      await this.manager.create.stage({
        name: bracketId,
        tournamentId: bracketId, // Using bracketId as tournamentId
        type: format,
        seeding,
        settings: {
          seedOrdering: ['natural'],
          grandFinal: format === "double_elimination" 
            ? (options.grandFinalType || "simple")
            : "none"
        }
      });

      bracketLog("Stage created successfully in SQL tables");
      successLog("Bracket created successfully", bracketId);
    } catch (error) {
      console.error("🔴 BracketManagerService.createBracket failed:", {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        bracketId,
        format,
        teamCount: teams.length
      });
      
      failureLog("Failed to create bracket", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Bracket creation failed: ${errorMessage}`);
    }
  }

  /**
   * Update a match result using brackets-manager with SQL storage
   */
  async updateMatch(options: UpdateMatchOptions): Promise<void> {
    const { matchId, scores } = options;

    bracketLog("Updating match with SQL storage:", { matchId, scores });

    try {
      // Update match using brackets-manager (automatically saves to SQL)
      await this.manager.update.match({
        id: matchId,
        opponent1: scores.opponent1,
        opponent2: scores.opponent2
      });

      bracketLog("Match updated successfully in SQL tables");
      successLog("Match updated successfully", String(matchId));
    } catch (error) {
      failureLog("Failed to update match", error);
      throw new Error(
        `Match update failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Calculate and store final standings for a completed bracket
   */
  async calculateFinalStandings(bracketId: string): Promise<void> {
    bracketLog("Calculating final standings from SQL tables:", { bracketId });

    try {
      // Get all stages for this bracket from SQL tables
      const stages = await this.storage.select('stage', { tournament_id: bracketId } as any);
      
      if (!stages || (Array.isArray(stages) && stages.length === 0)) {
        console.warn('No stages found for bracket:', bracketId);
        return;
      }

      const stage = Array.isArray(stages) ? stages[0] : stages;
      
      // Get final standings from brackets-manager
      const finalStandings = await this.manager.get.finalStandings((stage as any).id);

      bracketLog("Final standings calculated:", {
        stageId: (stage as any).id,
        standings: finalStandings
      });

      // Get participants to map back to team IDs
      const participants = await this.storage.select('participant', { tournament_id: bracketId } as any);
      
      if (!participants) {
        console.error("No participants found for bracket:", bracketId);
        return;
      }

      const participantArray = Array.isArray(participants) ? participants : [participants];

      // Update playoff_team_records
      const recordUpdates = (finalStandings as any[]).map((standing, index) => ({
        team_id: (participantArray as any)[standing.id - 1]?.team_id,
        bracket_id: bracketId,
        placement: index + 1
      })).filter(r => r.team_id);

      if (recordUpdates.length > 0) {
        const { error } = await supabase
          .from('playoff_team_records')
          .upsert(recordUpdates, {
            onConflict: 'team_id,bracket_id'
          });

        if (error) {
          console.error("Error updating playoff team records:", error);
          throw error;
        }

        successLog("Final standings updated in playoff_team_records", bracketId);
      }
    } catch (error) {
      failureLog("Failed to calculate final standings", error);
      throw new Error(
        `Final standings calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get the storage instance for direct access if needed
   */
  getStorage(): SupabaseSqlStorage {
    return this.storage;
  }
}

// Export singleton instance
export const bracketManagerService = new BracketManagerService();
