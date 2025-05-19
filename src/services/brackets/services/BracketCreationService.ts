
import { BracketStage, bracketManager } from '../manager/BracketManager';
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

/**
 * Service for creating different types of brackets
 */
export class BracketCreationService {
  /**
   * Create a double-elimination stage (play-ins auto-handled)
   */
  async createDoubleElimStage(
    bracketId: string,
    name: string,
    teams: Team[],
    bestOf = 3,
  ): Promise<void> {
    // Map teams to participant format (seeded)
    const participants = teams.map(team => ({
      id: team.id,
      name: team.name,
      position: team.seed || null,
      tournament_id: bracketId
    }));
    
    // Stage definition
    const stage: BracketStage = {
      id: bracketId,
      name,
      type: 'double_elimination',
      seeding: participants.map(p => p.id), // Just the IDs for seeding
      settings: {
        grandFinal: 'double', // GF reset (loser must win twice)
        matchesChildCount: 1, // How many matches a match can have as children
        size: participants.length, // Bracket size
        consolationFinal: false, // 3rd place match
        skipFirstRound: false, // Enables or disables the first round
        seedOrdering: ['natural'], // Can be 'natural', 'reverse', 'half_shift', etc.
        match: { 
          games: bestOf 
        },
      },
      tournamentId: bracketId
    };
    
    // First register participants
    await bracketManager.registerParticipants(participants);
    
    // Then create the stage with seeding
    await bracketManager.createStage(stage);
  }
  
  /**
   * Create a single-elimination stage
   */
  async createSingleElimStage(
    bracketId: string,
    name: string,
    teams: Team[],
    bestOf = 3,
  ): Promise<void> {
    // Map teams to participant format (seeded)
    const participants = teams.map(team => ({
      id: team.id,
      name: team.name,
      position: team.seed || null,
      tournament_id: bracketId
    }));
    
    // Stage definition
    const stage: BracketStage = {
      id: bracketId,
      name,
      type: 'single_elimination',
      seeding: participants.map(p => p.id),
      settings: {
        seedOrdering: ['natural'],
        size: participants.length,
        matchesChildCount: 1,
        consolationFinal: false,
        match: { 
          games: bestOf 
        },
      },
      tournamentId: bracketId
    };
    
    // First register participants
    await bracketManager.registerParticipants(participants);
    
    // Then create the stage with seeding
    await bracketManager.createStage(stage);
  }
  
  /**
   * Create a Tournament Bracket
   */
  async createTournamentBracket(
    bracketFormat: 'Single Elimination' | 'Double Elimination',
    name: string,
    divisionId: string,
    teams: Team[]
  ): Promise<string> {
    // Generate a unique ID for the bracket
    const bracketId = crypto.randomUUID();
    
    // Create the bracket record in the database first
    await supabase.from('brackets').insert({
      id: bracketId,
      title: name,
      format: bracketFormat,
      division_id: divisionId,
      state: 'PENDING'
    });
    
    // Then create the appropriate stage
    if (bracketFormat === 'Double Elimination') {
      await this.createDoubleElimStage(bracketId, name, teams);
    } else {
      await this.createSingleElimStage(bracketId, name, teams);
    }
    
    return bracketId;
  }
}

// Singleton instance
export const bracketCreationService = new BracketCreationService();
