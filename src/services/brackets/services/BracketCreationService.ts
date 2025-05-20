
import { v4 as uuidv4 } from 'uuid';
import { bracketManager } from '../manager/BracketManager';
import { BracketFormat } from '@/constants/brackets';
import { Team } from '@/types';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';

export class BracketCreationService {
  /**
   * Create a tournament bracket
   */
  static async createBracket(
    format: BracketFormat,
    name: string,
    divisionId: string | null,
    teamIds: string[]
  ): Promise<string> {
    try {
      console.log(`Creating bracket: name=${name}, format=${format}, divisionId=${divisionId}, teams=${teamIds.length}`);
      
      // Validate inputs
      if (!name || name.trim() === '') {
        throw new Error('Bracket name is required');
      }
      
      // Validate division ID more strictly
      if (!divisionId || divisionId === 'undefined') {
        console.error('divisionId missing or invalid:', divisionId);
        throw new Error('Valid division ID is required');
      }
      
      if (teamIds.length === 0) {
        throw new Error('At least one team is required');
      }
      
      // Validate that no team IDs are undefined
      if (teamIds.some(id => !id || id === 'undefined')) {
        console.error('One or more teams missing IDs');
        throw new Error('One or more teams missing IDs');
      }
      
      // Filter out any invalid team IDs
      const validTeamIds = teamIds.filter(id => id && typeof id === 'string' && id.trim() !== '' && id !== 'undefined');
      
      if (validTeamIds.length === 0) {
        throw new Error('No valid team IDs provided');
      }
      
      // Generate a unique ID for the bracket
      const bracketId = uuidv4();
      console.log(`Generated bracketId: ${bracketId}`);
      
      // Create bracket record in database
      const { error } = await PlayoffDatabaseAdapter.createBracket({
        id: bracketId,
        name,
        format,
        divisionId
      });
      
      if (error) {
        console.error('Failed to create bracket in database:', error);
        throw new Error(`Failed to create bracket: ${error.message}`);
      }
      
      // Create the stage based on the format
      if (format === 'Single Elimination') {
        await this.createSingleElimStage(bracketId, name, validTeamIds);
      } else {
        await this.createDoubleElimStage(bracketId, name, validTeamIds);
      }
      
      return bracketId;
    } catch (error) {
      console.error("Bracket creation failed:", error);
      throw error;
    }
  }
  
  /**
   * Create a single elimination stage
   */
  static async createSingleElimStage(
    bracketId: string,
    name: string,
    teams: Team[] | string[],
    bestOf: number = 3
  ): Promise<void> {
    try {
      console.log(`Creating single elimination stage: id=${bracketId}, teams=${Array.isArray(teams) ? teams.length : 'unknown'}`);
      
      // Convert teams to participants if they're not already
      const participants = Array.isArray(teams) && typeof teams[0] === 'string'
        ? this.convertTeamIdsToParticipants(teams as string[])
        : this.convertTeamsToParticipants(teams as Team[]);
      
      console.log(`Participants prepared: ${participants.length}`);
      
      // Register the participants
      await bracketManager.registerParticipants(participants);
      
      // Create the stage with the brackets-manager
      await bracketManager.createStage({
        id: bracketId,
        name: name,
        type: 'single_elimination',
        seeding: participants.map(p => p.id), // Use IDs for seeding instead of names
        settings: {
          size: participants.length,
          seedOrdering: ['natural'],
          match: { games: bestOf }
        },
        tournamentId: bracketId // Use bracketId as tournamentId too
      });
      
      console.log(`Single elimination stage created successfully: ${bracketId}`);
    } catch (error) {
      console.error(`Error creating single elimination stage: ${error}`);
      throw error;
    }
  }
  
  /**
   * Create a double elimination stage
   */
  static async createDoubleElimStage(
    bracketId: string,
    name: string,
    teams: Team[] | string[],
    bestOf: number = 3
  ): Promise<void> {
    try {
      console.log(`Creating double elimination stage: id=${bracketId}, teams=${Array.isArray(teams) ? teams.length : 'unknown'}`);
      
      // Convert teams to participants if they're not already
      const participants = Array.isArray(teams) && typeof teams[0] === 'string'
        ? this.convertTeamIdsToParticipants(teams as string[])
        : this.convertTeamsToParticipants(teams as Team[]);
      
      console.log(`Participants prepared: ${participants.length}`);
      
      // Debug log the participants
      participants.forEach((p, i) => {
        console.log(`Participant ${i+1}: id=${p.id}, name=${p.name}, position=${p.position}`);
      });
      
      // Register the participants
      await bracketManager.registerParticipants(participants);
      
      // Create the stage with the brackets-manager
      await bracketManager.createStage({
        id: bracketId,
        name: name,
        type: 'double_elimination',
        seeding: participants.map(p => p.id), // Use IDs for seeding instead of names
        settings: {
          size: participants.length,
          seedOrdering: ['natural'],
          grandFinal: 'simple',
          match: { games: bestOf }
        },
        tournamentId: bracketId // Use bracketId as tournamentId too
      });
      
      console.log(`Double elimination stage created successfully: ${bracketId}`);
    } catch (error) {
      console.error(`Error creating double elimination stage: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Convert team IDs to participants format
   */
  private static convertTeamIdsToParticipants(teamIds: string[]): any[] {
    // Filter out any invalid team IDs
    const validTeamIds = teamIds.filter(id => 
      id && typeof id === 'string' && id.trim() !== '' && id !== 'undefined'
    );
    
    console.log(`Converting ${validTeamIds.length} valid team IDs to participants`);
    
    return validTeamIds.map((teamId, index) => {
      if (!teamId || teamId === 'undefined') {
        console.error(`Invalid team ID at index ${index}`);
      }
      
      return {
        id: teamId,
        tournament_id: null, // Will be set by brackets-manager
        name: teamId, // Using teamId as name for now
        position: index + 1
      };
    });
  }
  
  /**
   * Convert Team objects to participants format
   */
  private static convertTeamsToParticipants(teams: Team[]): any[] {
    // Filter out any invalid team objects
    const validTeams = teams.filter(team => team && team.id && team.id !== 'undefined');
    
    console.log(`Converting ${validTeams.length} valid team objects to participants`);
    
    return validTeams.map((team, index) => {
      if (!team.id || team.id === 'undefined') {
        console.error(`Invalid team object at index ${index}:`, team);
      }
      
      return {
        id: team.id,
        tournament_id: null, // Will be set by brackets-manager
        name: team.name || `Team ${index + 1}`,
        position: index + 1
      };
    });
  }
}
