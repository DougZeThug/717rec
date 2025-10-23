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

      // Step 3: Create seeding array with BYEs (null values)
      bracketLog("📝 Step 3/5: Creating seeding array with BYEs...");
      const seeding: (string | null)[] = [];
      for (let i = 0; i < bracketSize; i++) {
        if (i < teams.length) {
          seeding.push(teamsBySeed[i].name);
        } else {
          seeding.push(null); // BYE represented as null
        }
      }
      
      bracketLog("✅ Seeding array created:", { 
        length: seeding.length,
        teams: seeding.filter(s => s !== null).length,
        byes: seeding.filter(s => s === null).length
      });

      // Step 4: Prepare participant inserts (including BYEs)
      bracketLog("📝 Step 4/5: Preparing participant inserts...");
      const participantInserts = seeding.map((name) => ({
        tournament_id: bracketId,
        name: name // null for BYEs
      }));
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
          seedOrdering: ['natural' as const],
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
   * Check if a match can be updated
   */
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
