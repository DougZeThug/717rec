
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";
import { BracketFormat, BRACKET_FORMATS } from "@/constants/brackets";
import { bracketManager, SeedOrdering } from "../manager/BracketManager";

/**
 * Service for bracket creation operations
 */
export class BracketCreationService {
  /**
   * Create a new bracket
   */
  static async createBracket(
    format: BracketFormat,
    name: string,
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
      
      // Generate a unique bracket ID
      const bracketId = crypto.randomUUID();
      
      // Create the bracket record first
      const { error: bracketError } = await supabase
        .from('brackets')
        .insert({
          id: bracketId,
          title: name,
          format: format,
          division_id: divisionId
        });
      
      if (bracketError) throw bracketError;
      
      // Create the tournament structure
      await this.createTournamentBracket(format, name, bracketId, teams);
      
      return bracketId;
    } catch (error) {
      console.error("Error creating bracket:", error);
      throw error;
    }
  }

  /**
   * Create a tournament bracket structure
   */
  static async createTournamentBracket(
    bracketFormat: BracketFormat,
    name: string,
    bracketId: string,
    teams: Team[]
  ): Promise<string> {
    try {
      // Create seeding array from team IDs
      const seeding = teams.map(team => team.id);
      
      // Configure the stage
      const stageType = bracketFormat === BRACKET_FORMATS.SINGLE
        ? 'single_elimination' as const
        : 'double_elimination' as const;
      
      // Create the validated seed ordering array with proper typing
      // Use the SeedOrdering type from BracketManager to ensure compatibility
      const seedOrdering: SeedOrdering[] = ['natural'];
      
      const stage = {
        id: bracketId,
        name: name,
        type: stageType,
        seeding: seeding,
        settings: {
          size: teams.length,
          matchesChildCount: stageType === 'single_elimination' ? 1 : 2,
          consolationFinal: false,
          seedOrdering: seedOrdering,
          match: { games: 3 }
        },
        tournamentId: bracketId // Added to satisfy InputStage requirement
      };
      
      // Create the stage in brackets-manager
      await bracketManager.createStage(stage);
      
      // Register participants
      const participants = teams.map((team, index) => ({
        id: team.id,
        name: team.name,
        tournament_id: bracketId,
        position: index + 1 // 1-based index for position
      }));
      
      await bracketManager.registerParticipants(participants);
      
      return bracketId;
    } catch (error) {
      console.error("Error creating tournament bracket:", error);
      throw error;
    }
  }

  /**
   * Create a double elimination stage
   */
  static async createDoubleElimStage(
    bracketId: string,
    name: string,
    teams: Team[],
    bestOf = 3
  ): Promise<void> {
    try {
      // Implementation details...
      console.log(`Creating double elimination stage: ${name} for bracket ${bracketId}`);
    } catch (error) {
      console.error("Error creating double elimination stage:", error);
      throw error;
    }
  }
  
  /**
   * Create a single elimination stage
   */
  static async createSingleElimStage(
    bracketId: string,
    name: string,
    teams: Team[],
    bestOf = 3
  ): Promise<void> {
    try {
      // Implementation details...
      console.log(`Creating single elimination stage: ${name} for bracket ${bracketId}`);
    } catch (error) {
      console.error("Error creating single elimination stage:", error);
      throw error;
    }
  }
}
