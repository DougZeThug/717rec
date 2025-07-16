import { supabase } from "@/integrations/supabase/client";
import { ChallongeService } from "./ChallongeService";
import type { PlayoffGame } from "@/hooks/matches/types/matchSubmissionTypes";

export interface DualFlowMatchUpdate {
  matchId: string;
  challongeMatchId: string;
  challongeTournamentId: number;
  team1Score: number;
  team2Score: number;
  games: PlayoffGame[];
  team1GameWins: number;
  team2GameWins: number;
  winnerId: string;
  loserId: string;
  scoresCsv: string;
}

export interface ChallongeMatchMapping {
  supabaseMatchId: string;
  challongeMatchId: string;
  challongeTournamentId: number;
}

/**
 * Bidirectional sync service for Challonge and Supabase
 * Handles updating both systems simultaneously when match results are edited
 */
export class ChallongeBidirectionalSync {
  /**
   * Update match results in both Challonge and Supabase
   */
  static async updateMatchInBothSystems(update: DualFlowMatchUpdate): Promise<void> {
    console.log('🔄 Starting dual-flow match update:', update);
    
    const errors: string[] = [];
    
    try {
      // Update Challonge first (external system)
      await this.updateChallongeMatch(update);
      console.log('✅ Challonge match updated successfully');
    } catch (error) {
      console.error('❌ Failed to update Challonge match:', error);
      errors.push(`Challonge: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    try {
      // Update Supabase (local system)
      await this.updateSupabaseMatch(update);
      console.log('✅ Supabase match updated successfully');
    } catch (error) {
      console.error('❌ Failed to update Supabase match:', error);
      errors.push(`Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // If both failed, throw an error
    if (errors.length === 2) {
      throw new Error(`Both systems failed to update: ${errors.join(', ')}`);
    }
    
    // If only one failed, log a warning but don't throw
    if (errors.length === 1) {
      console.warn('⚠️ Partial update - one system failed:', errors[0]);
    }
  }

  /**
   * Update match in Challonge via edge function
   */
  private static async updateChallongeMatch(update: DualFlowMatchUpdate): Promise<void> {
    const { data, error } = await supabase.functions.invoke('challonge', {
      body: {
        action: 'updateMatch',
        args: {
          tournamentId: update.challongeTournamentId,
          matchId: update.challongeMatchId,
          scores_csv: update.scoresCsv,
          winner_id: update.winnerId
        }
      }
    });
    
    if (error) {
      throw new Error(`Challonge API error: ${error.message}`);
    }
    
    if (!data || data.error) {
      throw new Error(`Challonge update failed: ${data?.error || 'Unknown error'}`);
    }
  }

  /**
   * Update match in Supabase
   */
  private static async updateSupabaseMatch(update: DualFlowMatchUpdate): Promise<void> {
    // First, fetch the match to get the actual team IDs
    const { data: matchData, error: fetchError } = await supabase
      .from('playoff_matches')
      .select('team1_id, team2_id')
      .eq('id', update.matchId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch match data: ${fetchError.message}`);
    }

    if (!matchData || !matchData.team1_id || !matchData.team2_id) {
      throw new Error('Match data incomplete - missing team IDs');
    }

    // Update the playoff match
    const { error: matchError } = await supabase
      .from('playoff_matches')
      .update({
        team1_score: update.team1Score,
        team2_score: update.team2Score,
        winner_id: update.winnerId,
        loser_id: update.loserId,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', update.matchId);

    if (matchError) {
      throw new Error(`Failed to update playoff match: ${matchError.message}`);
    }

    // Save individual games if provided
    if (update.games && update.games.length > 0) {
      // Delete existing games first
      await supabase
        .from('playoff_games')
        .delete()
        .eq('match_id', update.matchId);

      // Insert new games with correct winner IDs
      const gameInserts = update.games.map((game, index) => {
        const gameWinnerId = game.team1Score > game.team2Score ? matchData.team1_id : matchData.team2_id;
        
        return {
          match_id: update.matchId,
          game_number: index + 1,
          team1_score: game.team1Score,
          team2_score: game.team2Score,
          winner_id: gameWinnerId
        };
      });

      const { error: gamesError } = await supabase
        .from('playoff_games')
        .insert(gameInserts);

      if (gamesError) {
        throw new Error(`Failed to save playoff games: ${gamesError.message}`);
      }
    }
  }

  /**
   * Get Challonge match mapping from Supabase match ID
   */
  static async getChallongeMapping(supabaseMatchId: string): Promise<ChallongeMatchMapping | null> {
    try {
      // First get the match and its bracket
      const { data: matchData, error: matchError } = await supabase
        .from('playoff_matches')
        .select('id, bracket_id')
        .eq('id', supabaseMatchId)
        .single();

      if (matchError || !matchData) {
        console.error('❌ Failed to get match data:', matchError);
        return null;
      }

      // Then get the bracket's Challonge tournament ID
      const { data: bracketData, error: bracketError } = await supabase
        .from('brackets')
        .select('challonge_tournament_id')
        .eq('id', matchData.bracket_id)
        .single();

      if (bracketError || !bracketData) {
        console.error('❌ Failed to get bracket data:', bracketError);
        return null;
      }

      const challongeTournamentId = bracketData.challonge_tournament_id;
      if (!challongeTournamentId) {
        console.log('⚠️ Match not associated with Challonge tournament');
        return null;
      }

      // TODO: Implement proper Challonge match ID mapping
      // For now, we'll use the Supabase match ID as Challonge match ID
      // In practice, you'd need to store this mapping during initial sync
      return {
        supabaseMatchId,
        challongeMatchId: supabaseMatchId, // This needs proper mapping
        challongeTournamentId
      };
    } catch (error) {
      console.error('❌ Error getting Challonge mapping:', error);
      return null;
    }
  }

  /**
   * Sync match results from Challonge to Supabase
   */
  static async syncFromChallonge(challongeTournamentId: number, bracketId: string): Promise<void> {
    // This would use the existing ChallongeMatchSync service
    // but enhanced to handle bidirectional updates
    console.log('🔄 Syncing from Challonge to Supabase:', { challongeTournamentId, bracketId });
    
    // Implementation would go here to pull latest results from Challonge
    // and update Supabase accordingly
  }
}