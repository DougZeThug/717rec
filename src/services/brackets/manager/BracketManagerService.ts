import { BracketsManager } from "brackets-manager";
import { SupabaseStorage } from "./SupabaseStorage";
import { supabase } from "@/integrations/supabase/client";
import { bracketLog, successLog, failureLog } from "@/utils/logger";

export interface CreateBracketOptions {
  bracketId: string;
  format: "single_elimination" | "double_elimination";
  teams: Array<{ id: string; name: string; seed: number }>;
  grandFinalType?: "simple" | "double";
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
 * Phase 1: Uses in-memory storage with Supabase persistence after operations
 * Handles bracket creation and match updates using brackets-manager
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
   * Then persist matches to Supabase
   */
  async createBracket(options: CreateBracketOptions): Promise<void> {
    const { bracketId, format, teams } = options;

    // ✅ IDEMPOTENCY CHECK: Prevent double execution
    const { data: existingMatches, error: checkError } = await supabase
      .from('playoff_matches')
      .select('id')
      .eq('bracket_id', bracketId)
      .limit(1);

    if (existingMatches && existingMatches.length > 0) {
      bracketLog("⚠️ Bracket already has matches - skipping creation", bracketId);
      throw new Error(`Bracket ${bracketId} already has matches. Delete them first to recreate.`);
    }

    // ✅ CRITICAL: Reset in-memory storage to prevent contamination from previous brackets
    console.log("🧹 Resetting bracket storage before creation");
    
    // Get counts before reset for all tables
    const preResetCounts = {
      matches: (await this.storage.select("match")).length,
      stages: (await this.storage.select("stage")).length,
      groups: (await this.storage.select("group")).length,
      participants: (await this.storage.select("participant")).length
    };
    
    // Reset storage
    this.storage.reset();
    
    // Verify ALL tables are empty
    const postResetCounts = {
      matches: (await this.storage.select("match")).length,
      stages: (await this.storage.select("stage")).length,
      groups: (await this.storage.select("group")).length,
      participants: (await this.storage.select("participant")).length
    };
    
    bracketLog("Storage reset verification:", {
      before: preResetCounts,
      after: postResetCounts,
      resetSuccessful: Object.values(postResetCounts).every(count => count === 0)
    });

    if (Object.values(postResetCounts).some(count => count > 0)) {
      throw new Error("Storage reset failed - contaminated data detected");
    }

      const isPowerOf2 = (teams.length & (teams.length - 1)) === 0;
      bracketLog("Creating bracket with brackets-manager:", {
        bracketId,
        format,
        teamCount: teams.length,
        isPowerOf2,
        willUseByes: !isPowerOf2,
        message: !isPowerOf2 ? `BYE slots will be auto-inserted for ${teams.length} teams` : 'No BYEs needed'
      });

    try {
      // Sort teams by seed to get rankings
      const teamsBySeed = [...teams].sort((a, b) => a.seed - b.seed);

      // Standard bracket seeding positions for 8 teams: [1,8,4,5,2,7,3,6]
      // Generalized formula for any power of 2
      const teamCount = teams.length;
      const seedingOrder = this.generateStandardSeeding(teamCount);
      
      // Map bracket positions to team names (brackets-manager expects names in position order)
      const seeding = seedingOrder.map(seedIdx => 
        seedIdx < teamsBySeed.length ? teamsBySeed[seedIdx].name : null
      );

      // Create position -> teamId mapping (position is 1-indexed for brackets-manager)
      const positionToTeamId = new Map(
        seedingOrder.map((seedIdx, position) => [
          position + 1,
          seedIdx < teamsBySeed.length ? teamsBySeed[seedIdx].id : null
        ])
      );

      bracketLog("Bracket seeding configuration:", {
        teamCount,
        seedingOrder,
        seeding,
        positionToTeamIdSample: Array.from(positionToTeamId.entries()).slice(0, 4)
      });

      // ✅ Use manager.create.stage() - the correct API method
      await this.manager.create.stage({
        name: bracketId,
        tournamentId: 0,
        type: format,
        seeding,
        settings: {
          grandFinal: format === "double_elimination" 
            ? (options.grandFinalType || "simple")
            : "none"
        }
      });

      // Get generated matches from memory storage
      const rawMatches = await this.storage.select("match");

      bracketLog("Raw matches from brackets-manager:", {
        count: rawMatches.length,
        sample: rawMatches.slice(0, 3).map((m: any) => ({
          id: m.id,
          group_id: m.group_id,
          round_id: m.round_id,
          number: m.number
        }))
      });

      // Log raw brackets-manager structure for debugging
      bracketLog("Match generation analysis:", {
        totalMatches: rawMatches.length,
        byGroup: {
          winners: rawMatches.filter((m: any) => m.group_id === 1).length,
          losers: rawMatches.filter((m: any) => m.group_id === 2).length,
          finals: rawMatches.filter((m: any) => m.group_id === 3).length
        },
        roundRange: {
          winners: {
            min: Math.min(...rawMatches.filter((m: any) => m.group_id === 1).map((m: any) => m.round_id)),
            max: Math.max(...rawMatches.filter((m: any) => m.group_id === 1).map((m: any) => m.round_id))
          },
          losers: rawMatches.filter((m: any) => m.group_id === 2).length > 0 ? {
            min: Math.min(...rawMatches.filter((m: any) => m.group_id === 2).map((m: any) => m.round_id)),
            max: Math.max(...rawMatches.filter((m: any) => m.group_id === 2).map((m: any) => m.round_id))
          } : null
        },
        finalsMatches: rawMatches
          .filter((m: any) => m.group_id === 3)
          .map((m: any) => ({
            id: m.id,
            round_id: m.round_id,
            number: m.number,
            opponent1: m.opponent1,
            opponent2: m.opponent2
          })),
        sampleMatches: rawMatches.slice(0, 3).map((m: any) => ({
          group_id: m.group_id,
          round_id: m.round_id,
          number: m.number,
          opponent1: m.opponent1,
          opponent2: m.opponent2
        }))
      });
      
      // Use the position mapping we created earlier (already defined above)

      // Calculate minimum round_id per group for round normalization
      const groupMinRounds = new Map<number, number>();
      rawMatches.forEach((match: any) => {
        const currentMin = groupMinRounds.get(match.group_id) ?? Infinity;
        groupMinRounds.set(match.group_id, Math.min(currentMin, match.round_id));
      });

      bracketLog("Round normalization map:", {
        groupMinRounds: Array.from(groupMinRounds.entries())
      });

      // Create match records with UUIDs and normalized rounds
      const matchRecords = rawMatches.map((match: any) => {
        const uuid = crypto.randomUUID();
        const minRound = groupMinRounds.get(match.group_id) ?? 0;
        const normalizedRound = match.round_id - minRound;
        const matchType = this.getMatchType(match.group_id);
        
        // Use position mapping to get team IDs
        const team1Id = match.opponent1?.position ? positionToTeamId.get(match.opponent1.position) || null : null;
        const team2Id = match.opponent2?.position ? positionToTeamId.get(match.opponent2.position) || null : null;
        
        // Validation warnings for missing team mappings
        if (match.opponent1?.position && !team1Id) {
          console.warn(`⚠️ Position ${match.opponent1.position} not found in position map`);
        }
        if (match.opponent2?.position && !team2Id) {
          console.warn(`⚠️ Position ${match.opponent2.position} not found in position map`);
        }
        
        return {
          id: uuid,
          bracket_id: bracketId,
          round: normalizedRound,
          position: match.number,
          match_type: matchType,
          team1_id: team1Id,
          team2_id: team2Id,
          team1_seed: match.opponent1?.position || null,
          team2_seed: match.opponent2?.position || null,
          best_of: 3,
          status: 'pending',
          next_win_match_id: null,
          next_lose_match_id: null,
          // Store original match and compound key for connection mapping
          _bmMatch: match,
          _compoundKey: `${matchType}-${normalizedRound}-${match.number}`
        };
      });

      bracketLog("Match records created:", {
        count: matchRecords.length,
        byType: {
          winners: matchRecords.filter(m => m.match_type === 'winners').length,
          losers: matchRecords.filter(m => m.match_type === 'losers').length,
          finals: matchRecords.filter(m => m.match_type === 'finals').length
        },
        sampleRecord: matchRecords[0]
      });

      // Extract brackets-manager matches for connection mapping
      const matches = matchRecords.map(r => r._bmMatch);

      // Build mapping: compound key (match_type-round-position) -> Supabase UUID
      const keyToUuid = new Map(
        matchRecords.map(record => [record._compoundKey, record.id])
      );

      // Second pass: Populate match connections using compound keys
      matches.forEach((bmMatch: any, index: number) => {
        const record = matchRecords[index];
        const currentType = this.getMatchType(bmMatch.group_id);
        const minRound = groupMinRounds.get(bmMatch.group_id) ?? 0;
        const currentRound = bmMatch.round_id - minRound;
        
        // Find where winner of this match goes
        if (bmMatch.child_count && bmMatch.child_count > 0) {
          // Winners advance to next round in same bracket or finals
          const nextRoundMatches = matches.filter((m: any) => 
            m.round_id === bmMatch.round_id + 1 && 
            (m.group_id === bmMatch.group_id || m.group_id === 3)
          );
          
          const nextMatchIndex = Math.floor((bmMatch.number - 1) / 2);
          const nextMatch = nextRoundMatches[nextMatchIndex];
          
          if (nextMatch) {
            const nextType = this.getMatchType(nextMatch.group_id);
            const nextMinRound = groupMinRounds.get(nextMatch.group_id) ?? 0;
            const nextRound = nextMatch.round_id - nextMinRound;
            const nextKey = `${nextType}-${nextRound}-${nextMatch.number}`;
            record.next_win_match_id = keyToUuid.get(nextKey) || null;
          }
        }
        
        // For double elimination: losers drop to losers bracket
        if (format === 'double_elimination' && bmMatch.group_id === 1) {
          const losersRoundMatches = matches.filter((m: any) => m.group_id === 2);
          const loserDestination = this.findLoserDestination(bmMatch, losersRoundMatches);
          
          if (loserDestination) {
            const loserMinRound = groupMinRounds.get(2) ?? 0;
            const loserRound = loserDestination.round_id - loserMinRound;
            const loserKey = `losers-${loserRound}-${loserDestination.number}`;
            record.next_lose_match_id = keyToUuid.get(loserKey) || null;
          }
        }
      });

      bracketLog("Match records with connections:", {
        count: matchRecords.length,
        sample: matchRecords[0],
        connectionsCount: matchRecords.filter(m => m.next_win_match_id).length
      });

      if (matchRecords.length > 0) {
        // ✅ Remove internal properties before database insertion
        const dbRecords = matchRecords.map(({ _bmMatch, _compoundKey, ...dbRecord }) => dbRecord);
        
        bracketLog("Attempting to insert playoff matches:", {
          count: dbRecords.length,
          bracketId,
          sample: dbRecords[0], // Log first record for structure verification
          hasInternalProps: '_bmMatch' in matchRecords[0], // Should be true
          cleanedForDb: !('_bmMatch' in dbRecords[0]) // Should be true
        });
        
        const { error } = await supabase
          .from('playoff_matches')
          .insert(dbRecords);

        if (error) {
          // Log the FULL error object with all Supabase properties
          console.error("🔴 Supabase INSERT failed on playoff_matches:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            fullError: error
          });
          throw error; // Throw original error, not wrapped
        }
      }

      successLog("Bracket created and persisted to Supabase", bracketId);
    } catch (error) {
      // Log detailed error context
      console.error("🔴 Bracket creation error - full context:", {
        error,
        errorType: error?.constructor?.name,
        errorKeys: error ? Object.keys(error) : [],
        isSupabaseError: error && typeof error === 'object' && 'code' in error,
        supabaseCode: (error as any)?.code,
        supabaseDetails: (error as any)?.details,
        supabaseHint: (error as any)?.hint
      });
      
      failureLog("Failed to create bracket with brackets-manager", error);
      
      // If it's a Supabase error, preserve all properties
      if (error && typeof error === 'object' && 'code' in error) {
        const supabaseError = error as any;
        throw new Error(
          `Supabase Error [${supabaseError.code}]: ${supabaseError.message}\n` +
          `Details: ${supabaseError.details || 'none'}\n` +
          `Hint: ${supabaseError.hint || 'none'}`
        );
      }
      
      throw new Error(
        `Bracket creation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private getMatchType(groupId: number): "winners" | "losers" | "finals" {
    switch (groupId) {
      case 1: return 'winners';
      case 2: return 'losers';
      case 3: return 'finals';
      default: return 'winners';
    }
  }

  /**
   * Generate standard bracket seeding order for any power of 2
   * Returns array of seed indices (0-based) in bracket position order
   * Example for 8 teams: [0,7,3,4,1,6,2,5] means position 1 gets seed 1 (index 0), position 2 gets seed 8 (index 7), etc.
   */
  private generateStandardSeeding(teamCount: number): number[] {
    if (teamCount === 2) return [0, 1];
    if (teamCount === 4) return [0, 3, 1, 2];
    if (teamCount === 8) return [0, 7, 3, 4, 1, 6, 2, 5];
    if (teamCount === 16) return [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
    
    // Fallback to sequential for non-standard sizes
    return Array.from({ length: teamCount }, (_, i) => i);
  }

  /**
   * Find where a loser from winners bracket should go in losers bracket
   * This is a simplified mapping - brackets-manager handles the complex logic
   */
  private findLoserDestination(winnersMatch: any, losersMatches: any[]): any | null {
    // For now, return null - the viewer will handle progression
    // Full implementation would map WB round/position to LB round/position
    // This is complex and varies by bracket size
    return null;
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
      // 1. Query Supabase to get match details
      const { data: match, error: matchError } = await supabase
        .from('playoff_matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError || !match) {
        throw new Error(`Failed to fetch match: ${matchError?.message || 'Match not found'}`);
      }

      // 2. Load bracket state into memory
      await this.storage.loadFromSupabase(match.bracket_id);

      // 3. Determine winner
      const winnerId = team1GameWins > team2GameWins ? 1 : 2;

      // 4. Update match in brackets-manager (uses position as ID)
      await this.manager.update.match({
        id: match.position,
        opponent1: {
          score: team1GameWins,
          result: winnerId === 1 ? "win" : "loss"
        },
        opponent2: {
          score: team2GameWins,
          result: winnerId === 2 ? "win" : "loss"
        }
      });

      // 5. Sync all changes back to Supabase (includes winner progression)
      await this.storage.syncToSupabase(match.bracket_id);

      successLog("Match updated with automatic progression", matchId);
    } catch (error) {
      failureLog("Failed to update match with brackets-manager", error);
      throw new Error(
        `Match update failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Calculate and store final standings for a completed bracket
   * Uses brackets-manager's finalStandings calculation
   */
  async calculateFinalStandings(bracketId: string): Promise<void> {
    bracketLog("Calculating final standings for bracket:", bracketId);

    try {
      // 1. Load bracket state into memory
      await this.storage.loadFromSupabase(bracketId);

      // 2. Get all stages for this bracket (should be 1 stage)
      const stages = await this.storage.select("stage") as any[];
      
      if (!stages || stages.length === 0) {
        throw new Error("No stages found for bracket");
      }

      const stageId = stages[0].id;

      // 3. Use brackets-manager to calculate final standings
      const standings = await this.manager.get.finalStandings(stageId);
      
      bracketLog("Final standings calculated:", standings);

      // 4. Get bracket details to map participant IDs to team IDs
      const { data: bracket, error: bracketError } = await supabase
        .from('brackets')
        .select('id, division_id')
        .eq('id', bracketId)
        .single();

      if (bracketError || !bracket) {
        throw new Error(`Failed to fetch bracket: ${bracketError?.message}`);
      }

      // 5. Get team mappings
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('division_id', bracket.division_id);

      if (teamsError) {
        throw new Error(`Failed to fetch teams: ${teamsError.message}`);
      }

      const teamMap = new Map(teams?.map(t => [t.name, t.id]) || []);

      // 6. Get participants to map positions to team IDs
      const participants = await this.storage.select("participant");
      const participantIdToTeamId = new Map(
        participants.map((p: any) => [p.id, teamMap.get(p.name)])
      );

      // 7. Update playoff_team_records with placements
      const updates = standings.map((standing: any, index: number) => {
        const teamId = participantIdToTeamId.get((standing as any).id);
        const placement = index + 1; // 1st place, 2nd place, etc.

        return {
          team_id: teamId,
          bracket_id: bracketId,
          placement: placement
        };
      });

      // 8. Upsert placements into playoff_team_records
      const { error: upsertError } = await supabase
        .from('playoff_team_records')
        .upsert(
          updates.map(u => ({
            team_id: u.team_id,
            bracket_id: u.bracket_id,
            placement: u.placement,
          })),
          {
            onConflict: 'team_id,bracket_id',
            ignoreDuplicates: false
          }
        );

      if (upsertError) {
        throw new Error(`Failed to update placements: ${upsertError.message}`);
      }

      successLog("Final standings calculated and stored", bracketId);
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
  getStorage(): SupabaseStorage {
    return this.storage;
  }
}

// Export singleton instance
export const bracketManagerService = new BracketManagerService();
