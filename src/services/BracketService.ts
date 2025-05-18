
import { supabase } from "@/integrations/supabase/client";
import { PlayoffBracket, PlayoffMatch, Team } from "@/types";
import { BracketGenerator } from "./brackets/BracketGenerator";
import { BRACKET_FORMATS, BRACKET_STATES } from "@/constants/brackets";

/**
 * Service for bracket-related operations
 */
export class BracketService {
  /**
   * Create a new bracket
   */
  static async createBracket(
    name: string,
    format: "Single Elimination" | "Double Elimination",
    divisionId: string,
    teamIds: string[]
  ): Promise<string> {
    try {
      // Create the bracket in the database
      const { data: bracketData, error: bracketError } = await supabase
        .from('brackets')
        .insert({
          title: name,
          format,
          division_id: divisionId,
          state: BRACKET_STATES.PENDING
        })
        .select('id')
        .single();
      
      if (bracketError) throw bracketError;
      
      const bracketId = bracketData.id;
      
      // Get the teams to include in the bracket
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, seed, image_url, logo_url')
        .in('id', teamIds);
      
      if (teamsError) throw teamsError;
      
      // Map the teams to the expected format
      const bracketTeams: Team[] = teams.map(team => ({
        id: team.id,
        name: team.name,
        seed: team.seed,
        imageUrl: team.image_url,
        logoUrl: team.logo_url
      }));
      
      // Generate bracket matches
      let matches: PlayoffMatch[];
      
      if (format === BRACKET_FORMATS.SINGLE) {
        // Add bestOf property to ensure type compatibility
        const singleEliminationMatches = BracketGenerator.generateSingleEliminationBracket(bracketId, bracketTeams);
        matches = singleEliminationMatches.map(match => ({
          ...match,
          bestOf: 3 // Default to best of 3
        })) as PlayoffMatch[];
      } else {
        // Add bestOf property to ensure type compatibility
        const doubleEliminationMatches = BracketGenerator.generateDoubleEliminationBracket(bracketId, bracketTeams);
        matches = doubleEliminationMatches.map(match => ({
          ...match,
          bestOf: 3 // Default to best of 3
        })) as PlayoffMatch[];
      }
      
      // Save the matches to the database
      await BracketGenerator.savePlayoffMatches(matches);
      
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
        .from('matches') // Changed from 'playoff_matches' to 'matches'
        .delete()
        .eq('bracket_id', bracketId);
      
      if (matchesError) throw matchesError;
      
      // Then delete the bracket
      const { error: bracketError } = await supabase
        .from('brackets') // Changed from 'playoff_brackets' to 'brackets'
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
        .from('brackets') // Changed from 'playoff_brackets' to 'brackets'
        .update({
          title: updates.name, // Changed to 'title' from 'name' to match the column name
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
      const winnerId = team1GameWins > team2GameWins ? "team1" : "team2";
      
      // For now, just update the match score
      // In a real implementation, we would create game records and handle advancement logic
      const { error } = await supabase
        .from('matches') // Changed from 'playoff_matches' to 'matches'
        .update({
          team1_score: team1Score,
          team2_score: team2Score,
          team1_game_wins: team1GameWins,
          team2_game_wins: team2GameWins,
          winner_id: winnerId
        })
        .eq('id', matchId);
      
      if (error) throw error;
      
      // TODO: Handle match advancement logic here
    } catch (error) {
      console.error("Error updating match score:", error);
      throw error;
    }
  }
}
