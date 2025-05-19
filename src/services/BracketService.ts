
import { supabase } from "@/integrations/supabase/client";
import { PlayoffBracket, PlayoffMatch, Team } from "@/types";
import { 
  bracketManager,
  createTournamentBracket, 
  updateMatchResult,
  mapBracketsToAppFormat 
} from "./brackets/BracketsService";
import { BRACKET_FORMATS, BRACKET_STATES, BracketFormat } from "@/constants/brackets";

/**
 * Service for bracket-related operations
 */
export class BracketService {
  /**
   * Create a new bracket
   */
  static async createBracket(
    name: string,
    format: BracketFormat,
    divisionId: string,
    teamIds: string[]
  ): Promise<string> {
    try {
      // Get the teams to include in the bracket
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, seed, image_url, logo_url')
        .in('id', teamIds);
      
      if (teamsError) throw teamsError;
      
      // Create the tournament bracket using brackets-manager
      // Only support Single and Double Elimination formats (no Round Robin)
      if (format !== BRACKET_FORMATS.SINGLE && format !== BRACKET_FORMATS.DOUBLE) {
        throw new Error(`Unsupported bracket format: ${format}`);
      }
      
      const bracketId = await createTournamentBracket(
        format === BRACKET_FORMATS.SINGLE ? 'Single Elimination' : 'Double Elimination', 
        name, 
        divisionId, 
        teams
      );
      
      return bracketId;
    } catch (error) {
      console.error("Error creating bracket:", error);
      throw error;
    }
  }

  /**
   * Delete a bracket and its matches
   */
  static async deleteBracket(bracketId: string): Promise<void> {
    try {
      // Delete the matches first (due to foreign key constraint)
      const { error: matchesError } = await supabase
        .from('matches')
        .delete()
        .eq('bracket_id', bracketId);
      
      if (matchesError) throw matchesError;
      
      // Then delete the bracket
      const { error: bracketError } = await supabase
        .from('brackets')
        .delete()
        .eq('id', bracketId);
      
      if (bracketError) throw bracketError;
    } catch (error) {
      console.error("Error deleting bracket:", error);
      throw error;
    }
  }
  
  /**
   * Update a bracket's basic information
   */
  static async updateBracket(
    bracketId: string,
    updates: {
      name?: string;
      format?: "Single Elimination" | "Double Elimination";
      divisionId?: string;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')
        .update({
          title: updates.name,
          format: updates.format,
          division_id: updates.divisionId
        })
        .eq('id', bracketId);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error updating bracket:", error);
      throw error;
    }
  }

  /**
   * Update a match's score
   */
  static async updateMatchScore(
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ): Promise<void> {
    try {
      // Determine the winner based on game wins
      let winnerId: string | null = null;
      
      // Get the match first to identify team IDs
      const { data: matchData } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .single();
      
      if (!matchData) {
        throw new Error("Match not found");
      }
      
      // Now we can safely determine the winner
      winnerId = team1GameWins > team2GameWins 
        ? matchData.team1_id
        : matchData.team2_id;
      
      if (!winnerId) {
        throw new Error("Could not determine winner - team IDs not found");
      }
      
      // Update match using brackets-manager
      await updateMatchResult(matchId, winnerId, team1Score, team2Score);
      
      // Additionally store game-by-game results if needed
      if (games && games.length > 0) {
        for (let i = 0; i < games.length; i++) {
          await supabase.from('games').insert({
            match_id: matchId,
            game_number: i + 1,
            team1_score: games[i].team1Score,
            team2_score: games[i].team2Score
          });
        }
      }
    } catch (error) {
      console.error("Error updating match score:", error);
      throw error;
    }
  }
  
  /**
   * Get bracket details including matches
   */
  static async getBracketDetails(bracketId: string): Promise<PlayoffBracket | null> {
    try {
      // Get bracket info
      const { data: bracketData, error: bracketError } = await supabase
        .from('brackets')
        .select('id, title, format, division_id, division:divisions(name)')
        .eq('id', bracketId)
        .single();
      
      if (bracketError) throw bracketError;
      
      if (!bracketData) return null;
      
      // Get matches using brackets-manager
      const matches = await bracketManager.getMatches({ stage_id: bracketId });
      
      // Map to our format
      const organizedMatches = mapBracketsToAppFormat(bracketId, matches);
      
      // Flatten for the PlayoffBracket interface
      const allMatches = [
        ...(organizedMatches.winners.flat() || []),
        ...(organizedMatches.losers.flat() || []), 
        ...(organizedMatches.finals || [])
      ];
      
      return {
        id: bracketData.id,
        name: bracketData.title,
        division: bracketData.division?.name || '',
        format: bracketData.format as BracketFormat,
        matches: allMatches as PlayoffMatch[],
        state: BRACKET_STATES.PENDING
      };
    } catch (error) {
      console.error("Error fetching bracket details:", error);
      throw error;
    }
  }
}
