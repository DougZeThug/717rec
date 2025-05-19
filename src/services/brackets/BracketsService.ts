import { BracketsManager, Storage, Stage } from 'brackets-manager';
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

/** Supabase adapter implementing the Storage interface (minimal subset). */
export class SupabaseAdapter implements Storage {
  // ---- participants ----
  async insertParticipants(participants: any[]) {
    // Map participants to our team format if needed
    const { error } = await supabase.from('teams').insert(participants);
    if (error) throw error;
  }
  
  async selectParticipants(filter?: Record<string, any>) {
    const query = supabase.from('teams').select();
    if (filter) {
      query.match(filter);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  
  // ---- matches ----
  async insertMatches(matches: any[]) {
    // Batch insert to keep rows ≤ 50
    for (let i = 0; i < matches.length; i += 50) {
      const slice = matches.slice(i, i + 50);
      
      // Convert to our match format
      const matchesForDb = slice.map(this.convertMatchToDbFormat);
      
      const { error } = await supabase.from('matches').insert(matchesForDb);
      if (error) throw error;
    }
  }
  
  async selectMatches(filter?: Record<string, any>) {
    const query = supabase.from('matches').select();
    if (filter) {
      query.match(filter);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Convert back to brackets-manager format
    return data ? data.map(this.convertMatchFromDbFormat) : [];
  }
  
  async updateMatch(id: string | number, match: any) {
    const matchForDb = this.convertMatchToDbFormat(match);
    const { error } = await supabase
      .from('matches')
      .update(matchForDb)
      .eq('id', id);
    
    if (error) throw error;
  }
  
  async deleteMatches(filter?: Record<string, any>) {
    const query = supabase.from('matches').delete();
    if (filter) {
      query.match(filter);
    }
    const { error } = await query;
    if (error) throw error;
  }
  
  // ---- stages ----
  async insertStage(stage: any) {
    const { error } = await supabase.from('brackets').insert({
      id: stage.id,
      title: stage.name,
      format: stage.type === 'double_elimination' ? 'Double Elimination' : 'Single Elimination',
      division_id: stage.divisionId || null
    });
    
    if (error) throw error;
  }
  
  async selectStage(filter?: Record<string, any>) {
    const query = supabase.from('brackets').select();
    if (filter) {
      query.match(filter);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Convert our bracket to stage format
    return data?.map(bracket => ({
      id: bracket.id,
      name: bracket.title,
      type: bracket.format === 'Double Elimination' ? 'double_elimination' : 'single_elimination',
      divisionId: bracket.division_id
    })) || [];
  }
  
  // ---- conversion utilities ----
  private convertMatchToDbFormat(match: any) {
    return {
      id: match.id,
      bracket_id: match.stage_id,
      round_number: match.round,
      position: match.position,
      match_type: match.group.toLowerCase(),
      team1_id: match.opponent1?.id || null,
      team2_id: match.opponent2?.id || null,
      winner_id: match.opponent1?.result === 'win' 
        ? match.opponent1.id 
        : (match.opponent2?.result === 'win' ? match.opponent2.id : null),
      next_match_id: match.child_count > 0 ? match.child_match_id : null,
      next_loser_match_id: match.child_count > 1 ? match.child_match_id_loser : null,
      best_of: match.best_of || 3,
      metadata: {
        team1_seed: match.opponent1?.position || null,
        team2_seed: match.opponent2?.position || null
      }
    };
  }
  
  private convertMatchFromDbFormat(dbMatch: any) {
    return {
      id: dbMatch.id,
      stage_id: dbMatch.bracket_id,
      round: dbMatch.round_number,
      position: dbMatch.position,
      group: dbMatch.match_type.toUpperCase(),
      status: dbMatch.iscompleted ? 'completed' : 'pending',
      opponent1: dbMatch.team1_id ? {
        id: dbMatch.team1_id,
        position: dbMatch.metadata?.team1_seed || null,
        result: dbMatch.team1_id === dbMatch.winner_id ? 'win' : 
                (dbMatch.winner_id ? 'loss' : null)
      } : null,
      opponent2: dbMatch.team2_id ? {
        id: dbMatch.team2_id,
        position: dbMatch.metadata?.team2_seed || null,
        result: dbMatch.team2_id === dbMatch.winner_id ? 'win' : 
                (dbMatch.winner_id ? 'loss' : null)
      } : null,
      child_count: (dbMatch.next_match_id ? 1 : 0) + (dbMatch.next_loser_match_id ? 1 : 0),
      child_match_id: dbMatch.next_match_id,
      child_match_id_loser: dbMatch.next_loser_match_id,
      best_of: dbMatch.best_of
    };
  }
}

/** Singleton BracketsManager backed by Supabase. */
const storage = new SupabaseAdapter();
export const bracketsManager = new BracketsManager(storage);

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
  const stage: Stage = {
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
  await bracketsManager.participant.bulkInsert(participants);
  
  // Then create the stage with seeding
  await bracketsManager.create.stage(stage);
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
  const stage: Stage = {
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
  await bracketsManager.participant.bulkInsert(participants);
  
  // Then create the stage with seeding
  await bracketsManager.create.stage(stage);
}

/** Update a match result */
export async function updateMatchResult(
  matchId: string,
  winnerId: string,
  team1Score: number,
  team2Score: number
): Promise<void> {
  // Get the match first
  const matches = await bracketsManager.match.select({ id: matchId });
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
  await bracketsManager.match.update(matchId, resultObject);
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

/**
 * Map data from brackets-manager format to our app format
 */
export function mapBracketsToAppFormat(bracketId: string, matches: any[]): any {
  // Group matches by type and round
  const winnerMatches: any[][] = [];
  const loserMatches: any[][] = [];
  const finalsMatches: any[] = [];
  
  matches.forEach(match => {
    if (match.group === 'WINNER') {
      if (!winnerMatches[match.round - 1]) {
        winnerMatches[match.round - 1] = [];
      }
      winnerMatches[match.round - 1].push(convertToAppMatch(match, bracketId));
    } 
    else if (match.group === 'LOSER') {
      if (!loserMatches[match.round - 1]) {
        loserMatches[match.round - 1] = [];
      }
      loserMatches[match.round - 1].push(convertToAppMatch(match, bracketId));
    }
    else if (match.group === 'FINAL') {
      finalsMatches.push(convertToAppMatch(match, bracketId));
    }
  });
  
  return {
    winners: winnerMatches,
    losers: loserMatches,
    finals: finalsMatches
  };
}

/**
 * Convert a brackets-manager match to our app format
 */
function convertToAppMatch(match: any, bracketId: string): any {
  return {
    id: match.id,
    round: match.round,
    position: match.position,
    matchType: match.group.toLowerCase(),
    team1Id: match.opponent1?.id || null,
    team2Id: match.opponent2?.id || null,
    team1Seed: match.opponent1?.position || null,
    team2Seed: match.opponent2?.position || null,
    team1Score: match.opponent1?.score || null,
    team2Score: match.opponent2?.score || null,
    winnerId: match.opponent1?.result === 'win' 
      ? match.opponent1.id 
      : (match.opponent2?.result === 'win' ? match.opponent2.id : null),
    nextWinMatchId: match.child_match_id || null,
    nextLoseMatchId: match.child_match_id_loser || null,
    bestOf: match.best_of || 3,
    bracket_id: bracketId
  };
}
