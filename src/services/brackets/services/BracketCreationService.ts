
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
    divisionId: string,
    teamIds: string[]
  ): Promise<string> {
    // Generate a unique ID for the bracket
    const bracketId = uuidv4();
    
    // Create bracket record in database
    const { error } = await PlayoffDatabaseAdapter.createBracket({
      id: bracketId,
      name,
      format,
      divisionId
    });
    
    if (error) throw new Error(`Failed to create bracket: ${error.message}`);
    
    // Create the stage based on the format
    if (format === 'Single Elimination') {
      await this.createSingleElimStage(bracketId, name, teamIds);
    } else {
      await this.createDoubleElimStage(bracketId, name, teamIds);
    }
    
    return bracketId;
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
    // Convert teams to participants if they're not already
    const participants = Array.isArray(teams) && typeof teams[0] === 'string'
      ? this.convertTeamIdsToParticipants(teams as string[])
      : this.convertTeamsToParticipants(teams as Team[]);
    
    // Register the participants
    await bracketManager.registerParticipants(participants);
    
    // Create the stage with the brackets-manager
    await bracketManager.createStage({
      id: bracketId,
      name: name,
      type: 'single_elimination',
      seeding: participants.map(p => p.name), // Use names instead of IDs for seeding
      settings: {
        size: participants.length,
        seedOrdering: ['natural'],
        match: { games: bestOf }
      },
      tournamentId: bracketId // Use bracketId as tournamentId too
    });
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
    // Convert teams to participants if they're not already
    const participants = Array.isArray(teams) && typeof teams[0] === 'string'
      ? this.convertTeamIdsToParticipants(teams as string[])
      : this.convertTeamsToParticipants(teams as Team[]);
    
    // Register the participants
    await bracketManager.registerParticipants(participants);
    
    // Create the stage with the brackets-manager
    await bracketManager.createStage({
      id: bracketId,
      name: name,
      type: 'double_elimination',
      seeding: participants.map(p => p.name), // Use names instead of IDs for seeding
      settings: {
        size: participants.length,
        seedOrdering: ['natural'],
        grandFinal: 'simple',
        match: { games: bestOf }
      },
      tournamentId: bracketId // Use bracketId as tournamentId too
    });
  }
  
  /**
   * Convert team IDs to participants format
   */
  private static convertTeamIdsToParticipants(teamIds: string[]): any[] {
    return teamIds.map((teamId, index) => ({
      id: teamId,
      tournament_id: null, // Will be set by brackets-manager
      name: teamId, // Using teamId as name for now
      position: index + 1
    }));
  }
  
  /**
   * Convert Team objects to participants format
   */
  private static convertTeamsToParticipants(teams: Team[]): any[] {
    return teams.map((team, index) => ({
      id: team.id,
      tournament_id: null, // Will be set by brackets-manager
      name: team.name,
      position: index + 1
    }));
  }
}
