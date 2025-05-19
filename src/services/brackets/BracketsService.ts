
import { bracketManager } from './manager/BracketManager';
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";
import { mapBracketsToAppFormat } from './utils/BracketConversionUtils';

/** Create a double-elimination stage (play-ins auto-handled) */
export async function createDoubleElimStage(
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
    // Add other properties like logo if needed
    tournament_id: bracketId
  }));
  
  // Stage definition
  const stage = {
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
  };
  
  // First register participants
  await bracketManager.registerParticipants(participants);
  
  // Then create the stage with seeding
  await bracketManager.createStage(stage);
}

/** Create a single-elimination stage */
export async function createSingleElimStage(
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
  const stage = {
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
  };
  
  // First register participants
  await bracketManager.registerParticipants(participants);
  
  // Then create the stage with seeding
  await bracketManager.createStage(stage);
}

/** Update a match result */
export async function updateMatchResult(
  matchId: string,
  winnerId: string,
  team1Score: number,
  team2Score: number
): Promise<void> {
  // Get the match first
  const matches = await bracketManager.getMatches({ id: matchId });
  if (!matches || matches.length === 0) {
    throw new Error(`Match with ID ${matchId} not found`);
  }
  
  const match = matches[0];
  // Determine which opponent is which team
  const team1IsOpponent1 = match.opponent1?.id === winnerId || match.opponent2?.id !== winnerId;
  
  // Prepare the result object
  const resultObject = {
    opponent1: {
      score: team1IsOpponent1 ? team1Score : team2Score,
      result: team1IsOpponent1 ? 'win' : 'loss'
    },
    opponent2: {
      score: team1IsOpponent1 ? team2Score : team1Score, 
      result: team1IsOpponent1 ? 'loss' : 'win'
    },
    status: 'completed',
  };
  
  // Update the match
  await bracketManager.updateMatchResult(matchId, resultObject);
}

/** Create a Tournament Bracket */
export async function createTournamentBracket(
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
    await createDoubleElimStage(bracketId, name, teams);
  } else {
    await createSingleElimStage(bracketId, name, teams);
  }
  
  return bracketId;
}

// Export for re-use
export { bracketManager };
export { mapBracketsToAppFormat };
