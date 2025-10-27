import { BracketsManager } from "brackets-manager";
import { SupabaseSqlStorage } from "./SupabaseSqlStorage";
import { supabase } from "@/integrations/supabase/client";
import { bracketLog, successLog, failureLog } from "@/utils/logger";

/**
 * Safely serialize any error type to a readable string
 */
function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  try {
    // Try to extract meaningful info from plain objects
    const errorObj = error as any;
    if (errorObj && typeof errorObj === 'object') {
      const parts: string[] = [];
      
      // Common error properties
      if (errorObj.message) parts.push(`Message: ${errorObj.message}`);
      if (errorObj.code) parts.push(`Code: ${errorObj.code}`);
      if (errorObj.details) parts.push(`Details: ${errorObj.details}`);
      if (errorObj.hint) parts.push(`Hint: ${errorObj.hint}`);
      if (errorObj.table) parts.push(`Table: ${errorObj.table}`);
      if (errorObj.operation) parts.push(`Operation: ${errorObj.operation}`);
      
      if (parts.length > 0) {
        return parts.join(' | ');
      }
      
      // Fallback: full JSON
      return JSON.stringify(errorObj, Object.getOwnPropertyNames(errorObj), 2);
    }
    
    return String(error);
  } catch {
    return 'Unable to serialize error';
  }
}

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

export interface UpdateSeedingOptions {
  bracketId: string;
  newSeeding: Array<{ id: string; name: string; seed: number }>;
  keepSameSize?: boolean;
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

    bracketLog("🚀 STARTING bracket creation with SQL storage:", {
      bracketId,
      format,
      teamCount: teams.length
    });

    try {
      // Step 1: Calculate required bracket size (next power of 2 for brackets-manager)
      // brackets-manager requires bracket size >= team count for BYEs to work
      let bracketSize = 2;
      while (bracketSize < teams.length) {
        bracketSize *= 2;
      }
      const byesNeeded = bracketSize - teams.length;
      
      bracketLog("📊 Bracket sizing (with BYE support):", {
        teamCount: teams.length,
        bracketSize,
        byesNeeded,
        note: byesNeeded > 0 ? `Top ${byesNeeded} seeds get BYEs (auto-advance to round 2), bottom ${teams.length - byesNeeded} seeds play in round 1` : 'No BYEs needed'
      });

      // Step 2: Sort teams by seed
      bracketLog("📝 Step 2/5: Sorting teams by seed...");
      const teamsBySeed = [...teams].sort((a, b) => a.seed - b.seed);
      bracketLog("✅ Teams sorted:", { teams: teamsBySeed.map(t => `${t.name} (seed ${t.seed})`) });

      // Step 3: Create seeding array using standard bracket seeding
      // This ensures proper matchups (1v16, 8v9, 4v13, 5v12, 2v15, 7v10, 3v14, 6v11)
      bracketLog("📝 Step 3/5: Creating seeding array with standard bracket seeding...");
      
      // Generate standard bracket seeding order
      const bracketOrder = this.generateBracketOrder(bracketSize);
      bracketLog("Bracket order for size", bracketSize, ":", bracketOrder);
      
      // Create seeding array by mapping teams to their bracket positions
      // Teams are sorted by seed, so team at index 0 is seed 1, index 1 is seed 2, etc.
      const seeding: (string | null)[] = bracketOrder.map(position => {
        // position is 1-based (1-16 for 16-team bracket)
        // teamsBySeed is 0-based array
        const teamIndex = position - 1;
        if (teamIndex < teamsBySeed.length) {
          return teamsBySeed[teamIndex].name;
        }
        return null; // BYE for positions beyond team count
      });
      
      bracketLog("✅ Seeding array created:", { 
        length: seeding.length,
        teams: seeding.filter(s => s !== null).length,
        byes: seeding.filter(s => s === null).length,
        order: seeding.map((name, idx) => `Pos ${idx + 1}: ${name || 'BYE'}`)
      });

      // Step 4: Prepare participant inserts (including BYEs)
      bracketLog("📝 Step 4/5: Preparing participant inserts...");
      const participantInserts = seeding.map((name, index) => {
        // Find the original team to get its seed
        const team = teamsBySeed.find(t => t.name === name);
        return {
          tournament_id: bracketId,
          name: name, // null for BYEs
          position: team?.seed ?? null  // Store the actual team seed
        };
      });
      bracketLog("✅ Participant inserts prepared:", { 
        count: participantInserts.length,
        teams: participantInserts.filter(p => p.name !== null).length,
        byes: participantInserts.filter(p => p.name === null).length
      });

      // Step 5: Insert participants into database
      bracketLog("📝 Step 5/5: Inserting participants into database...");
      const { data: insertedParticipants, error: participantsError } = await supabase
        .from('participant' as any)
        .insert(participantInserts)
        .select('*');

      if (participantsError) {
        console.error("❌ Participant insertion failed - FULL ERROR:", {
          error: participantsError,
          errorType: participantsError?.constructor?.name,
          code: participantsError.code,
          message: participantsError.message,
          details: participantsError.details,
          hint: participantsError.hint,
          statusCode: (participantsError as any).statusCode,
          inserts: participantInserts,
          serialized: serializeError(participantsError)
        });
        throw new Error(`Failed to insert participants: ${serializeError(participantsError)}`);
      }

      bracketLog("✅ Participants inserted successfully:", { 
        insertedCount: insertedParticipants?.length || 0,
        participants: insertedParticipants 
      });

      // Step 6: Create bracket stage with brackets-manager
      bracketLog("📝 Step 6/5: Creating bracket stage with brackets-manager...");
      
      const stageConfig = {
        name: bracketId,
        tournamentId: bracketId,
        type: format,
        seeding,
        settings: {
          seedOrdering: format === "double_elimination" 
            ? (['natural', 'natural'] as ['natural', 'natural']) 
            : (['natural'] as ['natural']),
          grandFinal: (format === "double_elimination" 
            ? (options.grandFinalType || "simple")
            : "none") as "simple" | "double" | "none"
        }
      };
      
      bracketLog("🎯 Stage configuration:", stageConfig);
      
      await this.manager.create.stage(stageConfig);

      bracketLog("✅ Stage created successfully in SQL tables");
      successLog("Bracket created successfully", bracketId);
    } catch (error) {
      // Comprehensive error logging
      const errorDetails = {
        timestamp: new Date().toISOString(),
        bracketId,
        format,
        teamCount: teams.length,
        errorType: error?.constructor?.name || typeof error,
        errorString: String(error),
        errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
        serializedError: serializeError(error),
      };
      
      // Check if it's a Supabase error
      if (error && typeof error === 'object' && 'code' in error) {
        Object.assign(errorDetails, {
          supabaseCode: (error as any).code,
          supabaseMessage: (error as any).message,
          supabaseDetails: (error as any).details,
          supabaseHint: (error as any).hint,
          supabaseStatusCode: (error as any).statusCode,
        });
      }
      
      console.error("🔴 BracketManagerService.createBracket FAILED - Full Debug Info:", errorDetails);
      
      failureLog("Failed to create bracket", serializeError(error));
      
      throw new Error(`Bracket creation failed: ${serializeError(error)}`);
    }
  }

  /**
   * Update a match result using brackets-manager with SQL storage
   * Both opponents MUST have explicit result values for proper loser propagation
   */
  async updateMatch(options: UpdateMatchOptions): Promise<void> {
    const { matchId, scores } = options;

    bracketLog("Updating match with SQL storage:", { matchId, scores });

    try {
      // Ensure both opponents have explicit results (required for loser propagation)
      const opponent1Result = scores.opponent1.result || 
        (scores.opponent1.score! > scores.opponent2.score! ? "win" : "loss");
      const opponent2Result = scores.opponent2.result || 
        (scores.opponent2.score! > scores.opponent1.score! ? "win" : "loss");

      // Update match using brackets-manager (automatically saves to SQL and handles propagation)
      await this.manager.update.match({
        id: matchId,
        opponent1: {
          score: scores.opponent1.score,
          result: opponent1Result
        },
        opponent2: {
          score: scores.opponent2.score,
          result: opponent2Result
        }
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
   * Update the seeding of an existing bracket stage
   * Only allowed if changes don't impact existing match results
   */
  async updateSeeding(options: UpdateSeedingOptions): Promise<void> {
    const { bracketId, newSeeding, keepSameSize = true } = options;

    bracketLog("🔄 Updating bracket seeding:", {
      bracketId,
      newSeedingCount: newSeeding.length,
      keepSameSize
    });

    try {
      // Step 1: Get the stage ID for this bracket
      const stages = await this.storage.select('stage', { 
        tournament_id: bracketId 
      } as any);
      
      if (!stages || (Array.isArray(stages) && stages.length === 0)) {
        throw new Error(`No stage found for bracket: ${bracketId}`);
      }

      const stage = Array.isArray(stages) ? stages[0] : stages;
      const stageId = (stage as any).id;

      // Step 2: Sort teams by seed
      const teamsBySeed = [...newSeeding].sort((a, b) => a.seed - b.seed);
      
      // Step 3: Calculate bracket size
      let bracketSize = 2;
      while (bracketSize < teamsBySeed.length) {
        bracketSize *= 2;
      }

      // Step 4: Generate bracket order
      const bracketOrder = this.generateBracketOrder(bracketSize);

      // Step 5: Create new seeding array
      const seedingArray: (string | null)[] = bracketOrder.map(position => {
        const teamIndex = position - 1;
        if (teamIndex < teamsBySeed.length) {
          return teamsBySeed[teamIndex].name;
        }
        return null; // Will be treated as TBD (not BYE) per docs
      });

      bracketLog("📝 New seeding array prepared:", {
        length: seedingArray.length,
        teams: seedingArray.filter(s => s !== null).length,
        tbds: seedingArray.filter(s => s === null).length
      });

      // Step 6: Update seeding via brackets-manager
      await this.manager.update.seeding(stageId, seedingArray, keepSameSize);

      // Step 7: Update participant positions in database
      const participants = await this.storage.select('participant', {
        tournament_id: bracketId
      } as any);

      if (participants) {
        const participantArray = Array.isArray(participants) ? participants : [participants];
        
        // Update positions for each participant
        for (const participant of participantArray) {
          const team = teamsBySeed.find(t => t.name === (participant as any).name);
          if (team) {
            await supabase
              .from('participant')
              .update({ position: team.seed })
              .eq('id', (participant as any).id);
          }
        }
      }

      successLog("Seeding updated successfully", bracketId);
    } catch (error) {
      const errorMsg = serializeError(error);
      failureLog("Failed to update seeding", errorMsg);
      
      // Check if error is due to existing match results
      if (errorMsg.includes('impact') || errorMsg.includes('result')) {
        throw new Error(
          "Cannot update seeding: Changes would affect existing match results. " +
          "You can only reorder teams that haven't started matches yet."
        );
      }
      
      throw new Error(`Seeding update failed: ${errorMsg}`);
    }
  }

  /**
   * Generate standard bracket seeding order
   * For a 16-team bracket: [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]
   * This creates proper matchups: 1v16, 8v9, 4v13, 5v12, 2v15, 7v10, 3v14, 6v11
   */
  private generateBracketOrder(bracketSize: number): number[] {
    let order = [1];
    let currentSize = 1;
    
    while (currentSize < bracketSize) {
      const newOrder: number[] = [];
      const complement = currentSize * 2 + 1;
      
      for (const seed of order) {
        newOrder.push(seed);
        newOrder.push(complement - seed);
      }
      
      order = newOrder;
      currentSize *= 2;
    }
    
    return order;
  }

  /**
  async canUpdateMatch(matchId: number): Promise<{ canUpdate: boolean; reason?: string }> {
    try {
      const match = await this.storage.select('match', matchId);
      
      // Check if match is already completed
      if (match.status === 4) { // Status 4 = completed
        return { canUpdate: false, reason: 'Match already completed' };
      }
      
      // Check if both participants are known
      if (!match.opponent1?.id || !match.opponent2?.id) {
        return { canUpdate: false, reason: 'Waiting for participants' };
      }
      
      return { canUpdate: true };
    } catch (error) {
      console.error('Error checking match update status:', error);
      return { canUpdate: false, reason: 'Error checking match status' };
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
