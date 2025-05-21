
import { manager } from './BracketsManagerInstance';
import { PlayoffMatch, PlayoffGame } from '@/types/playoffs';
import { BracketService } from '../BracketService';
import { supabase } from '@/integrations/supabase/client';
import { Status } from 'brackets-model';   // same enum used by brackets-manager

/**
 * Updates a match score and advances winners through the bracket
 * 
 * @param matchId The ID of the match to update
 * @param winnerId The ID of the winning team
 * @param team1Score The final score for team 1
 * @param team2Score The final score for team 2
 * @param team1GameWins Number of games won by team 1
 * @param team2GameWins Number of games won by team 2
 * @param games Optional array of individual game scores
 */
export async function updateMatchScore(
  matchId: string,
  winnerId: string,
  team1Score: number,
  team2Score: number,
  team1GameWins?: number,
  team2GameWins?: number,
  games?: PlayoffGame[]
): Promise<void> {
  try {
    // First, fetch the match details
    const { data: match, error: matchError } = await supabase
      .from('playoff_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError) throw new Error(`Match fetch error: ${matchError.message}`);
    if (!match) throw new Error(`Match not found: ${matchId}`);

    // Determine which team is which
    const team1Id = match.team1_id;
    const team2Id = match.team2_id;
    
    if (!team1Id || !team2Id) {
      throw new Error('Cannot score a match without both teams assigned');
    }

    // Determine loser ID based on winner
    const loserId = winnerId === team1Id ? team2Id : team1Id;

    // Format match data for brackets-manager
    const matchData = {
      id: matchId,
      status: "completed" as Status,
      opponent1: {
        id: team1Id,
        score: team1Score,
        result: team1Id === winnerId ? "win" as const : "loss" as const
      },
      opponent2: {
        id: team2Id,
        score: team2Score,
        result: team2Id === winnerId ? "win" as const : "loss" as const
      }
    };

    console.log('Updating match with data:', matchData);
    
    // Update the match through brackets-manager
    await manager.update.match(matchData);
    
    // Update the playoff_matches record directly with additional details
    const { error: updateError } = await supabase
      .from('playoff_matches')
      .update({
        winner_id: winnerId,
        loser_id: loserId,
        team1_score: team1Score,
        team2_score: team2Score,
        team1_game_wins: team1GameWins || 0,
        team2_game_wins: team2GameWins || 0,
        status: 'completed'
      })
      .eq('id', matchId);

    if (updateError) throw new Error(`Match update error: ${updateError.message}`);

    // If we have individual game data, save those too
    if (games && games.length > 0) {
      // First delete any existing games
      await supabase
        .from('playoff_games')
        .delete()
        .eq('match_id', matchId);
      
      // Then insert the new games
      const gamesToInsert = games.map((game, index) => ({
        match_id: matchId,
        game_number: index + 1,
        team1_score: game.team1Score,
        team2_score: game.team2Score,
        winner_id: game.winnerId || winnerId // Use the game winner if available, otherwise use match winner
      }));
      
      const { error: gamesError } = await supabase
        .from('playoff_games')
        .insert(gamesToInsert);
        
      if (gamesError) {
        console.error('Failed to save game details:', gamesError);
      }
    }

    console.log(`Match ${matchId} updated successfully`);
  } catch (error) {
    console.error('Error updating match:', error);
    throw error;
  }
}
