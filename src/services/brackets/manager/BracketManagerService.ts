import { BracketsManager } from "brackets-manager";
import { SupabaseStorage } from "./SupabaseStorage";
import { supabase } from "@/integrations/supabase/client";
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

    bracketLog("Creating bracket with brackets-manager:", {
      bracketId,
      format,
      teamCount: teams.length
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
          grandFinal: format === "double_elimination" ? "simple" : "none",
          skipFirstRound: false
        }
      });

      // Get generated matches from memory storage
      const matches = await this.storage.select("match");
      
      // Map teams to their IDs for persistence
      const teamMap = new Map(teams.map(t => [t.name, t.id]));

      // Persist matches to Supabase
      const matchRecords = matches.map((match: any) => ({
        bracket_id: bracketId,
        round: match.round_id,
        position: match.number,
        match_type: this.getMatchType(match.group_id),
        team1_id: match.opponent1?.id ? teamMap.get(seeding[match.opponent1.id - 1]) || null : null,
        team2_id: match.opponent2?.id ? teamMap.get(seeding[match.opponent2.id - 1]) || null : null,
        team1_seed: match.opponent1?.position || null,
        team2_seed: match.opponent2?.position || null,
        best_of: 3,
        status: 'pending'
      }));

      if (matchRecords.length > 0) {
        const { error } = await supabase
          .from('playoff_matches')
          .insert(matchRecords);

        if (error) throw error;
      }

      successLog("Bracket created and persisted to Supabase", bracketId);
    } catch (error) {
      failureLog("Failed to create bracket with brackets-manager", error);
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
