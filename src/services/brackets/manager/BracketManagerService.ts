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

    // CRITICAL: Reset in-memory storage to prevent contamination from previous brackets
    this.storage.reset();

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
      // Prepare seeding
      const seeding = teams
        .sort((a, b) => a.seed - b.seed)
        .map(team => team.name);

      // Create tournament stage in memory
      await this.manager.create({
        name: bracketId,
        tournamentId: 0,
        type: format,
        seeding,
        settings: {
          seedOrdering: ["natural"],
          grandFinal: format === "double_elimination" 
            ? (options.grandFinalType || "simple")
            : "none",
          skipFirstRound: false
        }
      });

      // Get generated matches from memory storage
      const rawMatches = await this.storage.select("match");
      
      // Deduplicate matches by group_id, round_id, and number
      const matches = Array.from(
        new Map(
          rawMatches.map((m: any) => [
            `${m.group_id}-${m.round_id}-${m.number}`,
            m
          ])
        ).values()
      );

      bracketLog("Match deduplication:", {
        originalCount: rawMatches.length,
        uniqueCount: matches.length,
        duplicatesRemoved: rawMatches.length - matches.length
      });

      // Log raw brackets-manager structure for debugging
      bracketLog("Raw brackets-manager matches:", {
        totalMatches: matches.length,
        byGroup: {
          winners: matches.filter((m: any) => m.group_id === 1).length,
          losers: matches.filter((m: any) => m.group_id === 2).length,
          finals: matches.filter((m: any) => m.group_id === 3).length
        },
        roundRange: {
          winners: {
            min: Math.min(...matches.filter((m: any) => m.group_id === 1).map((m: any) => m.round_id)),
            max: Math.max(...matches.filter((m: any) => m.group_id === 1).map((m: any) => m.round_id))
          },
          losers: matches.filter((m: any) => m.group_id === 2).length > 0 ? {
            min: Math.min(...matches.filter((m: any) => m.group_id === 2).map((m: any) => m.round_id)),
            max: Math.max(...matches.filter((m: any) => m.group_id === 2).map((m: any) => m.round_id))
          } : null
        },
        sampleMatches: matches.slice(0, 3).map((m: any) => ({
          group_id: m.group_id,
          round_id: m.round_id,
          number: m.number,
          opponent1: m.opponent1,
          opponent2: m.opponent2
        }))
      });
      
      // Map teams to their IDs for persistence (by name and by seed)
      const teamMap = new Map(teams.map(t => [t.name, t.id]));
      const seedToTeamId = new Map(teams.map(t => [t.seed, t.id]));

      // Calculate minimum round_id per group for round normalization
      const groupMinRounds = new Map<number, number>();
      matches.forEach((match: any) => {
        const currentMin = groupMinRounds.get(match.group_id) ?? Infinity;
        groupMinRounds.set(match.group_id, Math.min(currentMin, match.round_id));
      });

      bracketLog("Round normalization map:", {
        groupMinRounds: Array.from(groupMinRounds.entries())
      });

      // First pass: Create match records with UUIDs and normalized rounds
      const matchRecords = matches.map((match: any) => {
        const uuid = crypto.randomUUID();
        const minRound = groupMinRounds.get(match.group_id) ?? 0;
        const normalizedRound = match.round_id - minRound; // Normalize to 0-indexed per group
        
        return {
          id: uuid,
          bracket_id: bracketId,
          round: normalizedRound, // Store normalized round (0-indexed per bracket type)
          position: match.number,
          match_type: this.getMatchType(match.group_id),
          // Use seed position mapping for more reliable team ID lookup
          team1_id: match.opponent1?.position ? seedToTeamId.get(match.opponent1.position) || null : null,
          team2_id: match.opponent2?.position ? seedToTeamId.get(match.opponent2.position) || null : null,
          team1_seed: match.opponent1?.position || null,
          team2_seed: match.opponent2?.position || null,
          best_of: 3,
          status: 'pending',
          next_win_match_id: null,
          next_lose_match_id: null
        };
      });

      // Build mapping: brackets-manager position -> Supabase UUID
      const positionToUuid = new Map(
        matchRecords.map(record => [record.position, record.id])
      );

      // Second pass: Populate match connections
      matches.forEach((bmMatch: any, index: number) => {
        const record = matchRecords[index];
        
        // Find where winner of this match goes (child_count tells us if this match feeds another)
        if (bmMatch.child_count && bmMatch.child_count > 0) {
          // Winners advance: find the next match in the same group or finals
          const nextRoundMatches = matches.filter((m: any) => 
            m.round_id === bmMatch.round_id + 1 && 
            (m.group_id === bmMatch.group_id || m.group_id === 3) // Same bracket or finals
          );
          
          // Calculate which next match this feeds into
          // In brackets-manager, matches are numbered sequentially
          // Two matches feed into one in the next round
          const nextMatchIndex = Math.floor((bmMatch.number - 1) / 2);
          const nextMatch = nextRoundMatches[nextMatchIndex];
          
          if (nextMatch && typeof nextMatch === 'object' && 'number' in nextMatch) {
            record.next_win_match_id = positionToUuid.get((nextMatch as any).number) || null;
          }
        }
        
        // For double elimination: losers drop to losers bracket
        if (format === 'double_elimination' && bmMatch.group_id === 1) {
          // Winners bracket losers go to losers bracket
          const losersRoundMatches = matches.filter((m: any) => 
            m.group_id === 2 // Losers bracket
          );
          
          // Complex mapping logic for WB -> LB drops
          // This depends on the round structure
          const loserDestination = this.findLoserDestination(bmMatch, losersRoundMatches);
          if (loserDestination && typeof loserDestination === 'object' && 'number' in loserDestination) {
            record.next_lose_match_id = positionToUuid.get((loserDestination as any).number) || null;
          }
        }
      });

      bracketLog("Match records with connections:", {
        count: matchRecords.length,
        sample: matchRecords[0],
        connectionsCount: matchRecords.filter(m => m.next_win_match_id).length
      });

      if (matchRecords.length > 0) {
        bracketLog("Attempting to insert playoff matches:", {
          count: matchRecords.length,
          bracketId,
          sample: matchRecords[0] // Log first record for structure verification
        });
        
        const { error } = await supabase
          .from('playoff_matches')
          .insert(matchRecords);

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
