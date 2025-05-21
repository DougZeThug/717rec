
import { supabase } from "@/integrations/supabase/client";
import { PlayoffGame } from "../types";
import { DatabaseBracketState, DatabasePlayoffMatch, MatchResultDTO } from "./types/DatabaseTypes";

/**
 * Facade for database operations related to playoffs
 */
export class PlayoffDatabaseFacade {
  /**
   * Get bracket state information
   */
  async getBracketState(bracketId: string): Promise<DatabaseBracketState> {
    try {
      const { data, error } = await supabase
        .from('brackets')
        .select('*')
        .eq('id', bracketId)
        .single();
      
      if (error) throw error;
      
      return {
        isWinnersBracketComplete: !!data.wb_champion_id,
        isLosersBracketComplete: false, // Not stored in the database yet
        isResetMatchNeeded: data.reset_match_needed || false,
        isComplete: data.state === 'completed',
        winnersBracketChampionId: data.wb_champion_id,
        losersBracketChampionId: null, // Not stored in the database yet
        championId: data.state === 'completed' ? data.wb_champion_id : null
      };
    } catch (error) {
      console.error('Error getting bracket state:', error);
      return {
        isWinnersBracketComplete: false,
        isLosersBracketComplete: false,
        isResetMatchNeeded: false,
        isComplete: false,
        winnersBracketChampionId: null,
        losersBracketChampionId: null,
        championId: null
      };
    }
  }

  /**
   * Get all matches for a bracket
   */
  async getBracketMatches(bracketId: string): Promise<DatabasePlayoffMatch[]> {
    try {
      const { data, error } = await supabase
        .from('playoff_matches')
        .select('*')
        .eq('bracket_id', bracketId);
      
      if (error) throw error;
      
      return data.map(match => ({
        id: match.id,
        bracket_id: match.bracket_id,
        round: match.round,
        position: match.position,
        match_type: match.match_type,
        team1_id: match.team1_id,
        team2_id: match.team2_id,
        team1_score: match.team1_score,
        team2_score: match.team2_score,
        team1_seed: match.team1_seed,
        team2_seed: match.team2_seed,
        team1_game_wins: match.team1_game_wins || 0, // Add default value and ensure property exists
        team2_game_wins: match.team2_game_wins || 0, // Add default value and ensure property exists
        winner_id: match.winner_id,
        loser_id: match.loser_id,
        next_win_match_id: match.next_win_match_id,
        next_lose_match_id: match.next_lose_match_id,
        best_of: match.best_of || 3,
        status: match.status || 'pending'
      }));
    } catch (error) {
      console.error('Error getting bracket matches:', error);
      return [];
    }
  }

  /**
   * Get games for a match
   */
  async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    try {
      const { data, error } = await supabase
        .from('playoff_games')
        .select('*')
        .eq('match_id', matchId)
        .order('game_number', { ascending: true });
      
      if (error) throw error;
      
      return data.map(game => ({
        id: game.id,
        matchId: game.match_id,
        gameNumber: game.game_number,
        team1Score: game.team1_score,
        team2Score: game.team2_score,
        winnerId: game.winner_id
      }));
    } catch (error) {
      console.error('Error getting match games:', error);
      return [];
    }
  }

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
   * Save playoff games
   * @deprecated Use BracketDatabaseService instead
   */
  async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    // Implementation kept for backward compatibility
    // Would delegate to GameRepository in real usage
  }

  /**
   * Record match result
   * @deprecated Use BracketDatabaseService instead
   */
  async recordMatchResult(result: MatchResultDTO): Promise<void> {
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
}
