
import { bracketManager } from '../manager/BracketManager';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { v4 as uuidv4 } from 'uuid';
import { BracketFormat, BRACKET_FORMATS } from '@/constants/brackets';
import { Team } from "@/types";

export class BracketCreationService {
  /**
   * Create a new bracket
   * @param format 'Single Elimination' or 'Double Elimination'
   * @param name Bracket name
   * @param divisionId Division ID
   * @param teamIds Array of team IDs
   * @returns Bracket ID
   */
  static async createBracket(
    format: BracketFormat,
    name: string,
    divisionId: string,
    teamIds: string[]
  ): Promise<string> {
    // Validate inputs
    if (!divisionId || divisionId === 'undefined') {
      throw new Error('Valid division ID is required');
    }
    
    // Validate team IDs
    const validTeamIds = teamIds.filter(id => id && id !== 'undefined' && id !== '');
    if (validTeamIds.length !== teamIds.length) {
      throw new Error('One or more teams missing IDs');
    }

    // Generate bracket ID
    const bracketId = uuidv4();
    console.log(`Creating bracket with ID ${bracketId}, format: ${format}, teams: ${validTeamIds.length}`);
    
    // Create the bracket record
    const bracket = {
      id: bracketId,
      name,
      format,
      divisionId
    };
    
    const createResult = await PlayoffDatabaseAdapter.createBracket(bracket);
    
    if (createResult.error) {
      console.error('Failed to create bracket:', createResult.error);
      throw new Error(`Failed to create bracket: ${createResult.error.message}`);
    }
    
    // Register teams as participants
    const participants = validTeamIds.map((teamId, index) => ({
      id: teamId,
      name: `Team ${index + 1}`, // Use placeholder names
      tournament_id: bracketId,
      position: index + 1, // 1-based position for seeding
    }));
    
    console.log(`Registering ${participants.length} participants`);
    await bracketManager.registerParticipants(participants);
    
    // Create the stage (bracket structure)
    const stageId = uuidv4();
    await bracketManager.createStage({
      id: stageId,
      name: `${format} Bracket`,
      type: bracketManager.formatToStageType(format),
      seeding: validTeamIds,
      settings: {
        seedOrdering: ['natural'] // Use natural seeding order
      },
      tournamentId: bracketId,
      divisionId
    });
    
    return bracketId;
  }
  
  /**
   * Create a single-elimination stage
   */
  static async createSingleElimStage(
    bracketId: string,
    name: string,
    teams: Team[],
    bestOf = 3
  ): Promise<void> {
    console.log(`Creating single elimination stage for bracket ${bracketId}`);
    // Implementation would go here
    throw new Error("Method not implemented yet");
  }
  
  /**
   * Create a double-elimination stage
   */
  static async createDoubleElimStage(
    bracketId: string,
    name: string,
    teams: Team[],
    bestOf = 3
  ): Promise<void> {
    console.log(`Creating double elimination stage for bracket ${bracketId}`);
    // Implementation would go here
    throw new Error("Method not implemented yet");
  }
}
