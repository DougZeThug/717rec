import { BracketsManager } from "brackets-manager";
import { SupabaseSqlStorage } from "./SupabaseSqlStorage";
import { supabase } from "@/integrations/supabase/client";
import { bracketLog, successLog, failureLog, errorLog, warnLog } from "@/utils/logger";
import { matchUpdateQueue } from "./MatchUpdateQueue";

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
    // Enable verbose logging for brackets-manager operations
    const VERBOSE = true;
    this.manager = new BracketsManager(this.storage, VERBOSE);
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

      // Step 3: Create seeding array in simple seed order
      // brackets-manager will apply seedOrdering: 'inner_outer' to create proper matchups
      bracketLog("📝 Step 3/5: Creating seeding array in seed order...");
      
      // Pass teams in seed order [seed1, seed2, ..., null, null] 
      // brackets-manager's seedOrdering handles the bracket positioning
      const seeding: (string | null)[] = teamsBySeed
        .map(t => t.name)
        .concat(Array(byesNeeded).fill(null));
      
      bracketLog("✅ Seeding array created:", { 
        length: seeding.length,
        teams: seeding.filter(s => s !== null).length,
        byes: seeding.filter(s => s === null).length,
        order: seeding.map((name, idx) => `Seed ${idx + 1}: ${name || 'BYE'}`)
      });

      // Step 4: Prepare participant inserts (including BYEs)
      bracketLog("📝 Step 4/5: Preparing participant inserts...");
      const participantInserts = seeding.map((name, index) => {
        return {
          tournament_id: bracketId,
          name: name, // null for BYEs
          position: index + 1  // Use bracket position (1-based), not team seed
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
        errorLog("Participant insertion failed - FULL ERROR:", {
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

      // Load participants into cache before bracket operations
      bracketLog("📝 Loading participants into cache...");
      await (this.storage as SupabaseSqlStorage).loadParticipantsForTournament(bracketId);

      // Step 6: Create bracket stage with brackets-manager
      bracketLog("📝 Step 6/5: Creating bracket stage with brackets-manager...");
      
      const stageConfig = {
        name: bracketId,
        tournamentId: bracketId,
        type: format,
        seeding,
        settings: {
          // Fixed seedOrdering for double elimination:
          // [WB R1, LB minor R1 (reverse), LB major R1 (natural), LB minor R2 (reverse)]
          // Alternates between 'reverse' (losers intake) and 'natural' (LB progression)
          seedOrdering: ['inner_outer', 'natural', 'reverse_half_shift', 'reverse'] as any,
          grandFinal: (format === "double_elimination" 
            ? (options.grandFinalType || "simple")
            : "none") as "simple" | "double" | "none"
        }
      };
      
      bracketLog("🎯 Stage configuration:", stageConfig);
      
      await this.manager.create.stage(stageConfig);

      bracketLog("✅ Stage created successfully in SQL tables");
      
      // Note: brackets-manager handles child_count and BYE propagation automatically
      
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
      
      errorLog("BracketManagerService.createBracket FAILED - Full Debug Info:", errorDetails);
      
      failureLog("Failed to create bracket", serializeError(error));
      
      throw new Error(`Bracket creation failed: ${serializeError(error)}`);
    }
  }

  /**
   * Update a match result using brackets-manager with SQL storage
   * Both win and loss must be explicitly set for proper loser propagation
   * Updates are serialized to prevent race conditions during concurrent updates
   */
  async updateMatch(options: UpdateMatchOptions): Promise<void> {
    const { matchId, scores } = options;

    bracketLog("🎯 BracketManagerService.updateMatch() START:", { matchId, scores });

    // Serialize updates to prevent race conditions
    return matchUpdateQueue.enqueue(async () => {
      try {
        // ⭐ Fetch current match state before update
        const currentMatch = await this.storage.select('match', matchId);
        bracketLog(`CURRENT MATCH STATE - Match ${matchId}:`, {
          opponent1: currentMatch.opponent1,
          opponent2: currentMatch.opponent2,
          round_id: currentMatch.round_id,
          group_id: currentMatch.group_id,
          number: currentMatch.number,
          stage_id: currentMatch.stage_id,
          status: currentMatch.status
        });
        
        // ⭐ Check if this is a BYE match (one opponent is null)
        const isByeMatch = !currentMatch.opponent1 || !currentMatch.opponent2;
        
        // ⭐ If it's a BYE match and locked/waiting, unlock it for manual advancement
        // Status: 0 = Locked, 1 = Waiting, 2 = Ready, 3 = Running, 4 = Completed, 5 = Archived
        if (isByeMatch && (currentMatch.status === 0 || currentMatch.status === 1)) {
          bracketLog(`Unlocking BYE match ${matchId} for manual advancement (status: ${currentMatch.status} -> 2)`);
          
          // Directly update the match status in the database to Ready (2)
          await supabase
            .from('match')
            .update({ status: 2 }) // 2 = Ready
            .eq('id', matchId);
            
          // ⭐ Update the local object to match the database
          currentMatch.status = 2;
            
          bracketLog(`BYE match ${matchId} unlocked successfully`);
          
          // ⭐ FIX: Return early to prevent calling manager.update.match() without scores
          // This prevents BYE matches from being marked as Completed (status 4) without a winner
          return;
        }
        
        // ⭐ Load participants into cache before update
        const stage = await this.storage.select('stage', (currentMatch as any).stage_id);
        if (stage) {
          await (this.storage as SupabaseSqlStorage)
            .loadParticipantsForTournament((stage as any).tournament_id);
        }
        
        bracketLog(`CALLING manager.update.match() with:`, {
          id: matchId,
          opponent1: scores.opponent1,
          opponent2: scores.opponent2
        });
        
        // Build update payload - only include opponents that exist
        const updatePayload: any = { id: matchId };
        
        if (scores.opponent1) {
          updatePayload.opponent1 = {
            score: scores.opponent1.score,
            result: scores.opponent1.result
          };
        }
        
        if (scores.opponent2) {
          updatePayload.opponent2 = {
            score: scores.opponent2.score,
            result: scores.opponent2.result
          };
        }
        
        bracketLog(`Final update payload:`, updatePayload);
        
        // Update match using brackets-manager (automatically saves to SQL and handles propagation)
        await this.manager.update.match(updatePayload);

        bracketLog(`manager.update.match() COMPLETED for Match ${matchId}`);
        
        // ⭐ Normalize LB R1 to fix same-side-twice issues
        const stageId = typeof currentMatch.stage_id === 'string' 
          ? parseInt(currentMatch.stage_id) 
          : currentMatch.stage_id;
        
        // Run normalization multiple times to catch timing issues
        for (let i = 0; i < 3; i++) {
          await this.normalizeLosersR1(stageId);
          // Small delay to let propagation complete
          if (i < 2) await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // ⭐ Normalize Grand Final population after every update (defensive)
        await this.normalizeGrandFinalPopulation(stageId);
        
        // ⭐ Fetch and log next matches to see propagation results
        const updatedMatch = await this.storage.select('match', matchId);
        bracketLog(`UPDATED MATCH STATE - Match ${matchId}:`, {
          opponent1: updatedMatch.opponent1,
          opponent2: updatedMatch.opponent2
        });
        
        // Log all LB matches to see propagation
        const allMatches = await this.storage.select('match', { 
          stage_id: updatedMatch.stage_id,
          group_id: 2 // Loser bracket group
        });
        bracketLog(`ALL LB MATCHES after Match ${matchId} update:`, 
          allMatches.map(m => ({
            id: m.id,
            round: m.round_id,
            number: m.number,
            opponent1_id: m.opponent1?.id,
            opponent2_id: m.opponent2?.id,
            opponent1_result: m.opponent1?.result,
            opponent2_result: m.opponent2?.result
          }))
        );

        bracketLog("Match updated successfully in SQL tables");
        successLog("Match updated successfully", String(matchId));
      } catch (error) {
        failureLog("Failed to update match", error);
        errorLog(`FULL ERROR DETAILS for Match ${matchId}:`, error);
        throw new Error(
          `Match update failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });
  }

  /**
   * Calculate the total number of Loser Bracket rounds based on bracket size
   */
  private calculateLBRounds(bracketSize: number): number {
    // For double elimination:
    // Size 4 → 2 LB rounds
    // Size 8 → 4 LB rounds
    // Size 16 → 6 LB rounds
    return (Math.log2(bracketSize) * 2) - 2;
  }

  /**
   * Find the LB Final match for a given stage
   */
  private async findLBFinalMatch(stageId: number): Promise<any | null> {
    try {
      // Find LB group (group number 2 in double elimination)
      const groups = await this.storage.select('group', { stage_id: stageId } as any);
      const groupsArray = Array.isArray(groups) ? groups : [groups];
      const lbGroup = groupsArray.find((g: any) => g.number === 2);
      
      if (!lbGroup) return null;
      
      const lbGroupId = (lbGroup as any).id;
      
      // Find all LB rounds
      const rounds = await this.storage.select('round', { group_id: lbGroupId } as any);
      const roundsArray = Array.isArray(rounds) ? rounds : [rounds];
      
      // The final round is the max round number
      const maxRoundNumber = Math.max(...roundsArray.map((r: any) => r.number));
      const lbFinalRound = roundsArray.find((r: any) => r.number === maxRoundNumber);
      
      if (!lbFinalRound) return null;
      
      // Get the LB Final match (should be the only match in that round)
      const matches = await this.storage.select('match', { 
        round_id: (lbFinalRound as any).id 
      } as any);
      
      return Array.isArray(matches) ? matches[0] : matches;
    } catch (error) {
      errorLog('Error finding LB Final match:', error);
      return null;
    }
  }

  /**
   * Normalize Grand Final population after LB Final
   * If GF opponent2 is missing and LB Final is complete, populate it
   */
  private async normalizeGrandFinalPopulation(stageId: number): Promise<void> {
    try {
      bracketLog('🔍 Checking Grand Final population...', { stageId });
      
      // Find GF group (group number 3 in double elimination)
      const groups = await this.storage.select('group', { stage_id: stageId } as any);
      const groupsArray = Array.isArray(groups) ? groups : [groups];
      const gfGroup = groupsArray.find((g: any) => g.number === 3);
      
      if (!gfGroup) {
        bracketLog('No GF group found, skipping normalization');
        return;
      }
      
      const gfGroupId = (gfGroup as any).id;
      
      // Get GF Round 1
      const rounds = await this.storage.select('round', { group_id: gfGroupId } as any);
      const roundsArray = Array.isArray(rounds) ? rounds : [rounds];
      const gfRound1 = roundsArray.find((r: any) => r.number === 1);
      
      if (!gfRound1) {
        bracketLog('No GF Round 1 found, skipping normalization');
        return;
      }
      
      const gfMatches = await this.storage.select('match', { 
        round_id: (gfRound1 as any).id 
      } as any);
      const gfMatch = Array.isArray(gfMatches) ? gfMatches[0] : gfMatches;
      
      if (!gfMatch) {
        bracketLog('No GF match found, skipping normalization');
        return;
      }
      
      const m = gfMatch as any;
      
      // If opponent2 is missing, populate from LB Final
      if (!m.opponent2?.id) {
        bracketLog('🔧 GF opponent2 missing, checking LB Final...');
        
        const lbFinalMatch = await this.findLBFinalMatch(stageId);
        
        if (lbFinalMatch && lbFinalMatch.status === 4) {
          // Match is complete
          const winnerId = lbFinalMatch.opponent1?.result === 'win' 
            ? lbFinalMatch.opponent1?.id 
            : lbFinalMatch.opponent2?.id;
          
          if (winnerId) {
            bracketLog('✅ [NORMALIZE GF] Populating opponent2 from LB Final winner', {
              gfMatchId: m.id,
              lbWinnerId: winnerId
            });
            
            await this.storage.update('match', m.id, {
              opponent2: { id: winnerId, position: undefined },
              status: m.status
            } as any);
            
            successLog('Grand Final normalized', `Populated opponent2 with LB winner ${winnerId}`);
          }
        }
      }
    } catch (error) {
      errorLog('Error normalizing Grand Final:', error);
      // Don't throw - normalization is defensive, not critical
    }
  }

  /**
   * Normalize Losers Bracket Round 1 matches to fix duplicate participant issues
   * Detects and fixes cases where the same participant is in both opponent slots
   */
  async normalizeLosersR1(stageId: number): Promise<void> {
    try {
      // Clear cache before normalization as we're changing structure
      (this.storage as SupabaseSqlStorage).clearParticipantCache();
      
      // Find LB group (group number 2 in double elimination)
      const groups = await this.storage.select('group', { stage_id: stageId } as any);
      const groupsArray = Array.isArray(groups) ? groups : [groups];
      const lbGroup = groupsArray.find((g: any) => g.number === 2);
      
      if (!lbGroup) {
        bracketLog('No LB group found, skipping normalization');
        return;
      }
      
      const lbGroupId = (lbGroup as any).id;
      
      // Find LB R1 (first round in LB group)
      const rounds = await this.storage.select('round', { group_id: lbGroupId } as any);
      const roundsArray = Array.isArray(rounds) ? rounds : [rounds];
      const minRoundNumber = Math.min(...roundsArray.map((r: any) => r.number));
      const lbR1 = roundsArray.find((r: any) => r.number === minRoundNumber);
      
      if (!lbR1) {
        bracketLog('No LB R1 found, skipping normalization');
        return;
      }
      
      const lbR1Id = (lbR1 as any).id;
      
      // Get all LB R1 matches
      const matches = await this.storage.select('match', { round_id: lbR1Id } as any);
      const matchesArray = Array.isArray(matches) ? matches : [matches];
      
      bracketLog(`[NORMALIZE] Checking ${matchesArray.length} LB R1 matches for duplicates`);
      
      for (const match of matchesArray) {
        const m = match as any;
        const opponent1Id = m.opponent1?.id;
        const opponent2Id = m.opponent2?.id;
        
        // CRITICAL FIX: Detect if same participant is in both slots (duplicate bug)
        if (opponent1Id && opponent2Id && opponent1Id === opponent2Id) {
          bracketLog(`[NORMALIZE] DUPLICATE DETECTED in LB R1 Match ${m.id}: Participant ${opponent1Id} in both slots`);
          bracketLog(`[NORMALIZE] Force-clearing opponent2 using direct SQL to bypass defensive merge`);
          
          // Bypass storage adapter's defensive merge and use direct SQL
          // Use service role to ensure permissions
          const { error } = await supabase
            .from('match')
            .update({
              opponent2_id: null,
              opponent2_score: null,
              opponent2_result: null,
              status: 4 // Set to waiting/ready status for BYE
            })
            .eq('id', m.id);
            
          if (error) {
            errorLog(`[NORMALIZE] Failed to clear duplicate in match ${m.id}:`, error);
            // Log full error details for debugging
            errorLog(`[NORMALIZE] Error details:`, JSON.stringify(error, null, 2));
          } else {
            bracketLog(`[NORMALIZE] Successfully cleared duplicate in match ${m.id}, converted to BYE`);
            // Clear cache to reflect changes
            (this.storage as SupabaseSqlStorage).clearParticipantCache();
          }
          continue;
        }
        
        // If only opponent2 is filled, shift to opponent1
        if (!opponent1Id && opponent2Id) {
          bracketLog(`[NORMALIZE] Shifting opponent2 to opponent1 in LB R1 Match ${m.id}`);
          await this.storage.update('match', m.id, {
            opponent1: { id: opponent2Id, score: null, result: null },
            opponent2: { id: null, score: null, result: null },
            status: m.status
          } as any);
        }
      }
      
      // BYE matches are handled manually via forfeit scoring in the match editor
      // No automatic BYE detection needed
      
      bracketLog(`[NORMALIZE] LB R1 normalization complete`);
    } catch (error) {
      errorLog('Error normalizing LB R1:', error);
      // Don't throw - normalization is defensive, not critical
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
      
      // Step 3: Calculate bracket size and BYEs needed
      let bracketSize = 2;
      while (bracketSize < teamsBySeed.length) {
        bracketSize *= 2;
      }
      const byesNeeded = bracketSize - teamsBySeed.length;

      // Step 4: Create simple seeding array in seed order
      // brackets-manager's seedOrdering handles bracket positioning
      const seedingArray: (string | null)[] = teamsBySeed
        .map(t => t.name)
        .concat(Array(byesNeeded).fill(null));

      bracketLog("📝 New seeding array prepared:", {
        length: seedingArray.length,
        teams: seedingArray.filter(s => s !== null).length,
        tbds: seedingArray.filter(s => s === null).length
      });

      // Load participants into cache before seeding update
      await (this.storage as SupabaseSqlStorage).loadParticipantsForTournament(bracketId);

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
      errorLog('Error checking match update status:', error);
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
        warnLog('No stages found for bracket:', bracketId);
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
        errorLog("No participants found for bracket:", bracketId);
        return;
      }

      const participantArray = Array.isArray(participants) ? participants : [participants];

      // Create a Map for O(1) lookups by participant ID
      const participantMap = new Map<number, any>();
      participantArray.forEach(p => {
        participantMap.set((p as any).id, p);
      });

      // Update playoff_team_records
      const recordUpdates = (finalStandings as any[]).map((standing, index) => {
        const participant = participantMap.get(standing.id);
        return {
          team_id: (participant as any)?.team_id,
          bracket_id: bracketId,
          placement: index + 1
        };
      }).filter(r => r.team_id);

      if (recordUpdates.length > 0) {
        const { error } = await supabase
          .from('playoff_team_records')
          .upsert(recordUpdates, {
            onConflict: 'team_id,bracket_id'
          });

        if (error) {
          errorLog("Error updating playoff team records:", error);
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

  /**
   * Check if a match is a BYE-facing Losers Bracket match eligible for manual status toggle
   * @private
   */
  private async isLosersByeMatch(matchId: number): Promise<{
    ok: boolean;
    reason?: string;
    meta?: {
      isLosers: boolean;
      exactlyOneReal: boolean;
      isByeSide: boolean;
      status: number;
      currentStatusName: string;
      opponent1Name: string | null;
      opponent2Name: string | null;
    };
  }> {
    try {
      const matchData = await this.storage.select('match', matchId);
      if (!matchData) {
        return { ok: false, reason: 'Match not found' };
      }

      const round = await this.storage.select('round', matchData.round_id);
      if (!round) {
        return { ok: false, reason: 'Round not found' };
      }

      const group = await this.storage.select('group', round.group_id);
      if (!group) {
        return { ok: false, reason: 'Group not found' };
      }

      const isLosers = group.number === 2;

      let opponent1Name: string | null = null;
      let opponent2Name: string | null = null;

      if (matchData.opponent1?.id) {
        const p1 = await this.storage.select('participant', matchData.opponent1.id);
        opponent1Name = p1?.name || null;
      }

      if (matchData.opponent2?.id) {
        const p2 = await this.storage.select('participant', matchData.opponent2.id);
        opponent2Name = p2?.name || null;
      }

      const o1Real = !!matchData.opponent1?.id && opponent1Name !== null;
      const o2Real = !!matchData.opponent2?.id && opponent2Name !== null;
      const exactlyOneReal = (o1Real ? 1 : 0) + (o2Real ? 1 : 0) === 1;

      const isByeSide = 
        (!matchData.opponent1?.id || opponent1Name === null) ||
        (!matchData.opponent2?.id || opponent2Name === null);

      const lockedOrWaiting = matchData.status === 0 || matchData.status === 1;

      const statusNames: Record<number, string> = {
        0: 'Locked',
        1: 'Waiting',
        2: 'Ready',
        3: 'Running',
        4: 'Completed',
        5: 'Archived'
      };

      const meta = {
        isLosers,
        exactlyOneReal,
        isByeSide,
        status: matchData.status,
        currentStatusName: statusNames[matchData.status] || 'Unknown',
        opponent1Name,
        opponent2Name
      };

      // Allow completed matches for reopening (status 4)
      const isCompletedMatch = matchData.status === 4;
      const isEligible = isLosers && exactlyOneReal && isByeSide && (lockedOrWaiting || isCompletedMatch);

      if (!isEligible) {
        let reason = 'Not eligible: ';
        if (!isLosers) reason += 'Not in Losers Bracket. ';
        if (!exactlyOneReal) reason += 'Must have exactly one real team. ';
        if (!isByeSide) reason += 'No BYE detected. ';
        if (!lockedOrWaiting && !isCompletedMatch) reason += `Status is ${meta.currentStatusName} (must be Locked, Waiting, or Completed).`;
        
        return { ok: false, reason: reason.trim(), meta };
      }

      return { ok: true, meta };
    } catch (error) {
      errorLog('Error checking BYE match eligibility:', error);
      return { 
        ok: false,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Check if a match is eligible for BYE status toggle (public wrapper)
   */
  async checkByeEligibility(matchId: number) {
    return this.isLosersByeMatch(matchId);
  }

  /**
   * Check if downstream matches have been populated with this match's winner
   */
  private async checkDownstreamPopulation(matchId: number): Promise<{
    hasDownstream: boolean;
    downstreamMatches: any[];
  }> {
    const currentMatch = await this.storage.select('match', matchId);
    if (!currentMatch) {
      return { hasDownstream: false, downstreamMatches: [] };
    }

    // Get all matches in the same stage
    const allMatches = await this.storage.select('match', { stage_id: currentMatch.stage_id });
    
    // Find matches that have this match's participants as opponents
    const winnerParticipantId = currentMatch.opponent1?.id || currentMatch.opponent2?.id;
    
    const populated = allMatches.filter((m: any) => 
      m.id !== matchId && 
      (m.opponent1?.id === winnerParticipantId || m.opponent2?.id === winnerParticipantId)
    );

    return {
      hasDownstream: populated.length > 0,
      downstreamMatches: populated
    };
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
  async adminToggleByeReady(matchId: number, makeReady: boolean, clearDownstream: boolean = false): Promise<{
    matchId: number;
    status: number;
    statusName: string;
    message: string;
  }> {
    bracketLog(`Admin BYE toggle requested for match ${matchId}`, { makeReady, clearDownstream });

    try {
      const check = await this.isLosersByeMatch(matchId);
      const isCompletedMatch = check.meta?.status === 4;

      // If reopening a completed match
      if (isCompletedMatch && !makeReady) {
        // Check downstream population
        if (!clearDownstream) {
          const downstream = await this.checkDownstreamPopulation(matchId);
          
          if (downstream.hasDownstream) {
            throw new Error(
              'Cannot reopen completed match: downstream matches have been populated. ' +
              'Use "Reopen + Clear Downstream" option to cascade clear downstream matches.'
            );
          }
        }

        // If clearDownstream is requested, nullify downstream matches
        if (clearDownstream) {
          const downstream = await this.checkDownstreamPopulation(matchId);
          
          for (const downstreamMatch of downstream.downstreamMatches) {
            await supabase
              .from('match')
              .update({
                opponent1_id: null,
                opponent2_id: null,
                opponent1_result: null,
                opponent2_result: null,
                opponent1_score: null,
                opponent2_score: null,
                status: 1 // Reset to Waiting
              })
              .eq('id', downstreamMatch.id);
          }

          bracketLog('Cleared downstream matches', { 
            matchId, 
            clearedCount: downstream.downstreamMatches.length,
            clearedIds: downstream.downstreamMatches.map((m: any) => m.id)
          });
        }

        // Clear current match results and set to Ready for re-scoring
        await supabase
          .from('match')
          .update({
            opponent1_result: null,
            opponent2_result: null,
            opponent1_score: null,
            opponent2_score: null,
            status: 2 // Set to Ready for re-scoring
          })
          .eq('id', matchId);

        successLog(`Reopened completed BYE match ${matchId} to Ready`);

        return {
          matchId,
          status: 2,
          statusName: 'Ready',
          message: clearDownstream 
            ? 'Match reopened and downstream matches cleared'
            : 'Match reopened to Ready status'
        };
      }

      // Normal toggle between Waiting and Ready
      if (makeReady) {
        if (!check.ok) {
          throw new Error(
            `Cannot set to Ready: ${check.reason}. ` +
            `Match must be a Losers Bracket BYE match in Locked/Waiting status.`
          );
        }

        await supabase
          .from('match')
          .update({ status: 2 })
          .eq('id', matchId);

        successLog(`Admin unlocked BYE match ${matchId} to Ready`);

        return {
          matchId,
          status: 2,
          statusName: 'Ready',
          message: 'Match unlocked to Ready status. You can now enter scores and advance the bracket.'
        };
      } else {
        if (!check.meta) {
          throw new Error('Cannot revert: Match data unavailable');
        }

        if (check.meta.status >= 4) {
          throw new Error(
            `Cannot revert: Match is ${check.meta.currentStatusName}. ` +
            `Only Ready (2) or Running (3) matches can be reverted.`
          );
        }

        await supabase
          .from('match')
          .update({ status: 1 })
          .eq('id', matchId);

        successLog(`Admin reverted BYE match ${matchId} to Waiting`);

        return {
          matchId,
          status: 1,
          statusName: 'Waiting',
          message: 'Match reverted to Waiting status. Status toggle is available again.'
        };
      }
    } catch (error) {
      failureLog('Admin BYE toggle failed', error);
      throw new Error(
        `Failed to toggle BYE match status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const bracketManagerService = new BracketManagerService();
