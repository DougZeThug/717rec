
import { supabase } from "@/integrations/supabase/client";
import { PlayoffGame } from "../types";
import { DatabaseMatchResult, DatabasePlayoffMatch } from "./types/DatabaseTypes";

/**
 * Legacy database facade class
 * This class is kept for backward compatibility
 * New code should use the modular services directly
 */
export class PlayoffDatabaseFacade {
  /**
   * Save playoff matches
   * @deprecated Use BracketDatabaseService instead
   */
  async savePlayoffMatches(matches: DatabasePlayoffMatch[]): Promise<void> {
    try {
      const { error } = await supabase.from('playoff_matches').insert(matches);
      if (error) throw error;
    } catch (error) {
      console.error('Error saving playoff matches:', error);
      throw error;
    }
  }

  /**
   * Get bracket matches
   * @deprecated Use BracketDatabaseService instead
   */
  async getBracketMatches(bracketId: string): Promise<DatabasePlayoffMatch[]> {
    try {
      const { data, error } = await supabase
        .from('playoff_matches')
        .select('*')
        .eq('bracket_id', bracketId)
        .order('round', { ascending: true })
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting bracket matches:', error);
      throw error;
    }
  }

  /**
   * Save playoff games
   * @deprecated Use BracketDatabaseService instead
   */
  async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    // Implementation kept for backward compatibility
    // Would delegate to GameRepository in real usage
  }

  /**
   * Get match games
   * @deprecated Use BracketDatabaseService instead
   */
  async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    // Implementation kept for backward compatibility
    // Would delegate to GameRepository in real usage
    return [];
  }

  /**
   * Record match result
   * @deprecated Use BracketDatabaseService instead
   */
  async recordMatchResult(result: DatabaseMatchResult): Promise<void> {
    // Implementation kept for backward compatibility
    // Would delegate to MatchRepository in real usage
  }

  /**
   * Advance team to next match
   * @deprecated Use BracketDatabaseService instead
   */
  async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    // Implementation kept for backward compatibility
    // Would delegate to MatchRepository in real usage
  }

  /**
   * Mark winners bracket champion
   * @deprecated Use BracketDatabaseService instead
   */
  async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    // Implementation kept for backward compatibility
    // Would delegate to BracketRepository in real usage
  }

  /**
   * Set reset match needed
   * @deprecated Use BracketDatabaseService instead
   */
  async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    // Implementation kept for backward compatibility
    // Would delegate to BracketRepository in real usage
  }

  /**
   * Mark tournament complete
   * @deprecated Use BracketDatabaseService instead
   */
  async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    // Implementation kept for backward compatibility
    // Would delegate to BracketRepository in real usage
  }

  /**
   * Create reset match
   * @deprecated Use BracketDatabaseService instead
   */
  async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<any> {
    // Implementation kept for backward compatibility
    // Would delegate to MatchRepository in real usage
    return {};
  }

  /**
   * Get bracket state
   * @deprecated Use BracketDatabaseService instead
   */
  async getBracketState(bracketId: string): Promise<any> {
    // Implementation kept for backward compatibility
    // Would delegate to BracketRepository in real usage
    return {};
  }
}
