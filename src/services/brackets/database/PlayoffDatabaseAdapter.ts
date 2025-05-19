import { PlayoffDatabaseFacade } from './PlayoffDatabaseFacade';
import { PlayoffMatch, PlayoffGame } from '../types';
import { DatabasePlayoffMatch, MatchResultDTO, DatabaseMatchResult, BracketCreationParams } from './types';
import { supabase } from "@/integrations/supabase/client";

/**
 * Adapter to convert between application model and database model
 */
export class PlayoffDatabaseAdapter {
  private static facade = new PlayoffDatabaseFacade();
  private static PLACEHOLDER_PREFIX = 'play-in-';

  /**
   * Create a new bracket in the database
   */
  static async createBracket(params: BracketCreationParams): Promise<{ error?: Error }> {
    try {
      console.log(`Creating bracket in database: id=${params.id}, name=${params.name}, format=${params.format}, divisionId=${params.divisionId || 'none'}`);
      
      // Validate required parameters
      if (!params.id || params.id === 'undefined') {
        throw new Error('Invalid bracket ID');
      }
      
      if (!params.name || params.name.trim() === '') {
        throw new Error('Bracket name is required');
      }
      
      // Insert bracket record
      const { error } = await supabase
        .from('brackets')
        .insert({
          id: params.id,
          title: params.name,
          format: params.format,
          division_id: params.divisionId || null, // Ensure null instead of 'undefined'
          created_at: new Date().toISOString(),
          state: 'pending'
        });
      
      if (error) {
        console.error('Error creating bracket:', error);
        throw error;
      }
      
      console.log(`Bracket ${params.id} created successfully`);
      return {};
    } catch (error) {
      console.error('Error creating bracket:', error);
      return { error: error as Error };
    }
  }

  /**
   * Save playoff matches to the database
   */
  static async savePlayoffMatches(matches: PlayoffMatch[]): Promise<void> {
    if (!matches || matches.length === 0) {
      console.log("No matches to save");
      return;
    }
    
    console.log(`Saving ${matches.length} playoff matches`);
    
    // Convert matches to database model
    const dbMatches = matches.map(match => {
      // Validate match ID
      if (!match.id) {
        console.error("Match is missing ID:", match);
        throw new Error("Match ID is required");
      }
      
      // Validate bracket_id
      if (!match.bracket_id || match.bracket_id === 'undefined') {
        console.error(`Match ${match.id} is missing bracket_id:`, match);
        throw new Error(`Match ${match.id} is missing bracket_id`);
      }
      
      return {
        id: match.id,
        bracket_id: match.bracket_id,
        round: match.round,
        position: match.position,
        match_type: match.matchType,
        // Replace placeholder IDs with null before saving to database
        team1_id: match.team1Id?.startsWith(this.PLACEHOLDER_PREFIX) ? null : match.team1Id,
        team2_id: match.team2Id?.startsWith(this.PLACEHOLDER_PREFIX) ? null : match.team2Id,
        team1_score: match.team1Score || null,
        team2_score: match.team2Score || null,
        team1_game_wins: match.team1GameWins || null,
        team2_game_wins: match.team2GameWins || null,
        team1_seed: match.team1Seed,
        team2_seed: match.team2Seed,
        winner_id: match.winnerId || null,
        loser_id: match.loserId || null,
        next_win_match_id: match.nextWinMatchId || null,
        next_lose_match_id: match.nextLoseMatchId || null,
        best_of: match.bestOf || 3,
        status: match.status || 'pending'
      };
    });

    await this.facade.savePlayoffMatches(dbMatches);
    console.log(`${matches.length} playoff matches saved successfully`);
  }

  /**
   * Get bracket matches from the database
   */
  static async getBracketMatches(bracketId: string): Promise<DatabasePlayoffMatch[]> {
    return await this.facade.getBracketMatches(bracketId);
  }

  /**
   * Save playoff games to the database
   */
  static async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    await this.facade.savePlayoffGames(games);
  }

  /**
   * Get match games from the database
   */
  static async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    return await this.facade.getMatchGames(matchId);
  }

  /**
   * Record match result in the database
   */
  static async recordMatchResult(matchId: string, result: MatchResultDTO): Promise<void> {
    // Convert to DatabaseMatchResult format expected by the facade
    const dbResult: DatabaseMatchResult = {
      match_id: matchId,
      winner_id: result.winnerId,
      loser_id: result.loserId,
      team1_score: result.team1Score,
      team2_score: result.team2Score,
      team1_game_wins: result.team1GameWins,
      team2_game_wins: result.team2GameWins,
      completed: true,
      games: result.games
    };
    
    await this.facade.recordMatchResult(dbResult);
  }

  /**
   * Advance team to the next match
   */
  static async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    await this.facade.advanceTeam(nextMatchId, teamId, isWinner);
  }

  /**
   * Mark winners bracket champion
   */
  static async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    await this.facade.markWinnersBracketChampion(bracketId, teamId);
  }

  /**
   * Set reset match needed
   */
  static async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    await this.facade.setResetMatchNeeded(bracketId, needed);
  }

  /**
   * Mark tournament complete
   */
  static async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    await this.facade.markTournamentComplete(bracketId, championId);
  }

  /**
   * Create reset match
   */
  static async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<PlayoffMatch> {
    return await this.facade.createResetMatch(bracketId, team1Id, team2Id);
  }

  /**
   * Get bracket state
   */
  static async getBracketState(bracketId: string): Promise<any> {
    return await this.facade.getBracketState(bracketId);
  }
}
