import { BracketsManager } from "brackets-manager";
import { JsonbSupabaseStorage } from "./JsonbSupabaseStorage";
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
  private storage: JsonbSupabaseStorage;
  private manager: BracketsManager;

  constructor() {
    this.storage = new JsonbSupabaseStorage();
    this.manager = new BracketsManager(this.storage);
  }

  /**
   * Create a new bracket using brackets-manager and save to JSONB
   */
  async createBracket(options: CreateBracketOptions): Promise<void> {
    const { bracketId, format, teams } = options;

    bracketLog("Creating bracket with JSONB storage:", {
      bracketId,
      format,
      teamCount: teams.length
    });

    try {
      // Reset storage for clean slate
      this.storage.reset();
      this.storage.setBracketId(bracketId);

      // Sort teams by seed and create seeding array
      const teamsBySeed = [...teams].sort((a, b) => a.seed - b.seed);
      const seeding = teamsBySeed.map(t => t.name);

      bracketLog("Team seeding:", { seeding });

      // Create bracket using brackets-manager
      bracketLog("Calling brackets-manager create.stage()...");
      await this.manager.create.stage({
        name: bracketId,
        tournamentId: 0,
        type: format,
        seeding,
        settings: {
          seedOrdering: ['natural'],
          grandFinal: format === "double_elimination" 
            ? (options.grandFinalType || "simple")
            : "none"
        }
      });

      bracketLog("Stage created successfully, saving to JSONB...");

      // Save entire state to JSONB
      await this.storage.save();

      successLog("Bracket created and saved to JSONB", bracketId);
    } catch (error) {
      // Preserve full error details
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
      
      // Throw with preserved error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Bracket creation failed: ${errorMessage}`);
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

    bracketLog("Updating match:", { matchId, team1GameWins, team2GameWins });

    try {
      // Get match and bracket info
      const { data: match, error: matchError } = await supabase
        .from('playoff_matches')
        .select('bracket_id, position')
        .eq('id', matchId)
        .single();

      if (matchError || !match) {
        throw new Error(`Match not found: ${matchError?.message || 'Unknown'}`);
      }

      // Load bracket state from JSONB
      await this.storage.load(match.bracket_id);

      // Determine winner
      const winnerId = team1GameWins > team2GameWins ? 1 : 2;

      // Update match using brackets-manager
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

      // Save updated state back to JSONB
      await this.storage.save();

      successLog("Match updated", matchId);
    } catch (error) {
      failureLog("Failed to update match", error);
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
      await this.storage.load(bracketId);

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
  getStorage(): JsonbSupabaseStorage {
    return this.storage;
  }
}

// Export singleton instance
export const bracketManagerService = new BracketManagerService();
