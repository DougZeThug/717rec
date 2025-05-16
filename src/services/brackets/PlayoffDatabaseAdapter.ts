
import { supabase } from "@/integrations/supabase/client";
import { BracketState, MatchResult, PlayoffGame, PlayoffMatch, PlayoffMatchType } from "./types";
import { nanoid } from "nanoid";

/**
 * Handles database operations for playoff brackets
 */
export class PlayoffDatabaseAdapter {
  /**
   * Save playoff matches to the database
   */
  static async savePlayoffMatches(matches: PlayoffMatch[]): Promise<void> {
    try {
      // Convert to database format
      const dbMatches = matches.map(match => ({
        id: match.id,
        round: match.round,
        position: match.position,
        match_type: match.matchType,
        team1_id: match.team1Id,
        team2_id: match.team2Id,
        team1_seed: match.team1Seed,
        team2_seed: match.team2Seed,
        next_win_match_id: match.nextWinMatchId,
        next_lose_match_id: match.nextLoseMatchId,
        winner_id: match.winnerId,
        loser_id: match.loserId,
        bracket_id: match.bracket_id,
        best_of: match.bestOf || 3,
        status: match.status || 'pending'
      }));

      const { error } = await supabase
        .from('playoff_matches')
        .insert(dbMatches);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving playoff matches:', error);
      throw error;
    }
  }

  /**
   * Save playoff games to the database
   */
  static async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    if (!games || games.length === 0) return;

    try {
      const dbGames = games.map(game => ({
        id: game.id || nanoid(),
        match_id: game.matchId,
        game_number: game.gameNumber,
        team1_score: game.team1Score,
        team2_score: game.team2Score,
        winner_id: game.winnerId
      }));

      const { error } = await supabase
        .from('playoff_games')
        .insert(dbGames);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving playoff games:', error);
      throw error;
    }
  }

  /**
   * Record match result and advance teams in bracket
   */
  static async recordMatchResult(matchResult: MatchResult): Promise<void> {
    try {
      // First, get the match details to determine bracket flow
      const { data: match, error: matchError } = await supabase
        .from('playoff_matches')
        .select('*')
        .eq('id', matchResult.matchId)
        .single();
      
      if (matchError) throw matchError;
      
      // 1. Update the current match with the result
      const { error: updateError } = await supabase
        .from('playoff_matches')
        .update({
          winner_id: matchResult.winnerId,
          loser_id: matchResult.loserId,
          team1_score: matchResult.team1Score,
          team2_score: matchResult.team2Score,
          status: 'completed'
        })
        .eq('id', matchResult.matchId);
      
      if (updateError) throw updateError;
      
      // 2. Save individual game results
      if (matchResult.games && matchResult.games.length > 0) {
        await this.savePlayoffGames(matchResult.games);
      }
      
      // 3. Handle winners bracket champion
      if (match.match_type === 'winners' && !match.next_win_match_id) {
        // This is the winners bracket final
        await this.markWinnersBracketChampion(match.bracket_id, matchResult.winnerId);
      }

      // 4. Advance winning team to next round
      if (match.next_win_match_id) {
        await this.advanceTeam(match.next_win_match_id, matchResult.winnerId, true);
      }
      
      // 5. Send loser to losers bracket if applicable
      if (match.match_type === 'winners' && match.next_lose_match_id) {
        await this.advanceTeam(match.next_lose_match_id, matchResult.loserId, false);
      }

      // 6. Handle finals logic
      if (match.match_type === 'finals') {
        // Check if we need a reset match
        const { data: bracketData } = await supabase
          .from('brackets')
          .select('wb_champion_id, reset_match_needed')
          .eq('id', match.bracket_id)
          .single();
        
        const isWinnerFromLosersBracket = matchResult.winnerId !== bracketData?.wb_champion_id;
        
        if (isWinnerFromLosersBracket) {
          // Loser's bracket champion won, need reset match
          await this.setResetMatchNeeded(match.bracket_id, true);
          // Create the reset match here if needed
        } else {
          // Winner's bracket champion won again, tournament complete
          await this.markTournamentComplete(match.bracket_id, matchResult.winnerId);
        }
      }
      
      // 7. Handle reset match if this is one
      if (match.match_type === 'finals' && match.bracket_id) {
        const { data: bracketData } = await supabase
          .from('brackets')
          .select('reset_match_needed')
          .eq('id', match.bracket_id)
          .single();
          
        if (bracketData?.reset_match_needed) {
          // This was a reset match, mark tournament complete
          await this.markTournamentComplete(match.bracket_id, matchResult.winnerId);
        }
      }
    } catch (error) {
      console.error('Error recording match result:', error);
      throw error;
    }
  }

  /**
   * Mark a team as the winners bracket champion
   */
  private static async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    const { error } = await supabase
      .from('brackets')
      .update({ 
        wb_champion_id: teamId 
      })
      .eq('id', bracketId);
    
    if (error) throw error;
  }

  /**
   * Set whether a reset match is needed
   */
  private static async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    const { error } = await supabase
      .from('brackets')
      .update({ 
        reset_match_needed: needed 
      })
      .eq('id', bracketId);
    
    if (error) throw error;
  }

  /**
   * Mark the tournament as complete with a champion
   */
  static async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    const { error } = await supabase
      .from('brackets')
      .update({ 
        state: 'completed',
        wb_champion_id: championId,
        reset_match_needed: false
      })
      .eq('id', bracketId);
    
    if (error) throw error;
  }

  /**
   * Advance a team to the next match
   */
  static async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    try {
      // Get the next match to determine which slot to fill
      const { data: nextMatch, error: nextMatchError } = await supabase
        .from('playoff_matches')
        .select('team1_id, team2_id')
        .eq('id', nextMatchId)
        .single();
      
      if (nextMatchError) throw nextMatchError;
      
      // For simplicity, always assign to team1 if empty, otherwise team2
      // In a more complex implementation, you might want to consider seeding or bracket position
      const updateData = !nextMatch.team1_id
        ? { team1_id: teamId }
        : { team2_id: teamId };
      
      const { error: updateError } = await supabase
        .from('playoff_matches')
        .update(updateData)
        .eq('id', nextMatchId);
      
      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error advancing team to next match:', error);
      throw error;
    }
  }

  /**
   * Get all matches for a bracket
   */
  static async getBracketMatches(bracketId: string): Promise<PlayoffMatch[]> {
    try {
      const { data, error } = await supabase
        .from('playoff_matches')
        .select('*')
        .eq('bracket_id', bracketId);
      
      if (error) throw error;
      
      // Convert database format to app format
      return data.map(match => ({
        id: match.id,
        round: match.round,
        position: match.position,
        matchType: match.match_type as PlayoffMatchType,
        bracket_id: match.bracket_id,
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        team1Seed: match.team1_seed,
        team2Seed: match.team2_seed, 
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        bestOf: match.best_of || 3,
        winnerId: match.winner_id,
        loserId: match.loser_id,
        nextWinMatchId: match.next_win_match_id,
        nextLoseMatchId: match.next_lose_match_id,
        status: match.status as "pending" | "in_progress" | "completed"
      }));
    } catch (error) {
      console.error('Error getting bracket matches:', error);
      throw error;
    }
  }

  /**
   * Get games for a specific match
   */
  static async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
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
      throw error;
    }
  }

  /**
   * Create reset match if needed
   */
  static async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<string> {
    try {
      const resetMatch: {
        bracket_id: string;
        round: number;
        position: number;
        match_type: PlayoffMatchType;
        team1_id: string;
        team2_id: string;
        status: "pending";
        best_of: number;
      } = {
        bracket_id: bracketId,
        round: 2, // Second finals round
        position: 1,
        match_type: 'finals',
        team1_id: team1Id,
        team2_id: team2Id,
        status: 'pending',
        best_of: 3
      };

      const { data, error } = await supabase
        .from('playoff_matches')
        .insert(resetMatch)
        .select()
        .single();
      
      if (error) throw error;
      
      return data.id;
    } catch (error) {
      console.error('Error creating reset match:', error);
      throw error;
    }
  }
  
  /**
   * Get bracket state information
   */
  static async getBracketState(bracketId: string): Promise<BracketState> {
    try {
      const { data, error } = await supabase
        .from('brackets')
        .select('wb_champion_id, reset_match_needed, state')
        .eq('id', bracketId)
        .single();
        
      if (error) throw error;
      
      // Get the finals matches to determine champions
      const { data: finalsMatches } = await supabase
        .from('playoff_matches')
        .select('winner_id, team1_id, team2_id')
        .eq('bracket_id', bracketId)
        .eq('match_type', 'finals');
        
      // Find losers bracket champion (team that's not the WB champion in the finals)
      let losersBracketChampionId: string | null = null;
      
      if (finalsMatches && finalsMatches.length > 0 && data.wb_champion_id) {
        const finalsMatch = finalsMatches[0];
        if (finalsMatch.team1_id && finalsMatch.team1_id !== data.wb_champion_id) {
          losersBracketChampionId = finalsMatch.team1_id;
        } else if (finalsMatch.team2_id && finalsMatch.team2_id !== data.wb_champion_id) {
          losersBracketChampionId = finalsMatch.team2_id;
        }
      }
      
      // Determine overall champion based on matches and bracket state
      let championId = null;
      if (data.state === 'completed') {
        // If there was a reset match, the winner of that is the champion
        if (finalsMatches.length > 1) {
          championId = finalsMatches[1].winner_id;
        } 
        // Otherwise if WB champion won the finals, they're the champion
        else if (finalsMatches.length > 0 && finalsMatches[0].winner_id === data.wb_champion_id) {
          championId = data.wb_champion_id;
        }
      }
      
      return {
        isWinnersBracketComplete: !!data.wb_champion_id,
        isLosersBracketComplete: !!losersBracketChampionId,
        isResetMatchNeeded: !!data.reset_match_needed,
        isComplete: data.state === 'completed',
        winnersBracketChampionId: data.wb_champion_id,
        losersBracketChampionId: losersBracketChampionId,
        championId: championId
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
}
