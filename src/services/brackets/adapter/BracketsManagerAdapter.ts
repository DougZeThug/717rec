/**
 * Adapter that implements the CrudInterface for BracketsManager
 * This adapter conforms to the exact interface expected by BracketsManager
 */
import { supabase } from "@/integrations/supabase/client";
import { PlayoffMatch, PlayoffMatchType } from "@/types/playoffs";
import { isValidUUID } from '@/utils/validation';

// Define types to match brackets-manager's expectations
interface Id {
  id: string | number;
}

// Define the DataTypes interface that matches brackets-manager's expectations
interface DataTypes {
  match: any;
  participant: any;
  stage: any;
  [key: string]: any;
}

// Define Table type to match brackets-manager's expectations
type Table = keyof DataTypes;

// Define OmitId type to match brackets-manager's expectations
type OmitId<T> = Omit<T, 'id'>;

/**
 * Mapper functions for converting between camelCase and snake_case
 */
const toRow = (m: PlayoffMatch) => ({
  id: m.id,
  bracket_id: m.bracket_id,
  round: m.round,
  position: m.position,
  match_type: m.matchType,
  team1_id: m.team1Id,
  team2_id: m.team2Id,
  team1_score: m.team1Score,
  team2_score: m.team2Score,
  team1_game_wins: m.team1GameWins,
  team2_game_wins: m.team2GameWins,
  winner_id: m.winnerId,
  loser_id: m.loserId,
  next_win_match_id: m.nextWinMatchId,
  next_lose_match_id: m.nextLoseMatchId,
  best_of: m.bestOf || 3,
  status: m.status,
  iscompleted: m.status === 'completed'
});

const toRuntime = (r: any): Partial<PlayoffMatch> => ({
  id: r.id,
  bracket_id: r.bracket_id,
  round: r.round,
  position: r.position,
  matchType: r.match_type,
  team1Id: r.team1_id,
  team2Id: r.team2_id,
  team1Score: r.team1_score,
  team2Score: r.team2_score,
  team1GameWins: r.team1_game_wins,
  team2GameWins: r.team2_game_wins,
  winnerId: r.winner_id,
  loserId: r.loser_id,
  nextWinMatchId: r.next_win_match_id,
  nextLoseMatchId: r.next_lose_match_id,
  bestOf: r.best_of,
  status: r.iscompleted ? 'completed' : 'pending'
});

/**
 * Interface that matches brackets-manager's CrudInterface
 */
interface CrudInterface {
  insert<T extends Table>(table: T, value: OmitId<DataTypes[T]> | OmitId<DataTypes[T]>[]): Promise<number | string>;
  select<T extends Table>(table: T): Promise<DataTypes[T][]>;
  select<T extends Table>(table: T, id: string | number): Promise<DataTypes[T]>;
  select<T extends Table>(table: T, filter: Partial<DataTypes[T]>): Promise<DataTypes[T][]>;
  update<T extends Table>(table: T, id: string | number, value: Partial<DataTypes[T]>): Promise<number>;
  delete<T extends Table>(table: T): Promise<number>;
  delete<T extends Table>(table: T, filter: Partial<DataTypes[T]>): Promise<number>;
}

/**
 * Validates participant data before database insertion
 */
function validateParticipantData(participant: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  console.log('BracketsManagerAdapter: Validating participant:', participant);
  
  // Check if participant is null or undefined
  if (!participant) {
    errors.push('Participant is null or undefined');
    return { isValid: false, errors };
  }
  
  // Check if participant is an object
  if (typeof participant !== 'object') {
    errors.push(`Participant must be an object, got ${typeof participant}`);
    return { isValid: false, errors };
  }
  
  // Validate participant ID
  if (!participant.id) {
    errors.push('Participant ID is required');
  } else {
    const teamId = typeof participant.id === 'number' ? participant.id.toString() : participant.id;
    if (typeof teamId !== 'string') {
      errors.push(`Invalid participant ID type: ${typeof teamId}`);
    } else if (teamId.trim() === '' || teamId === 'undefined' || teamId === 'null') {
      errors.push(`Invalid participant ID value: "${teamId}"`);
    } else if (!isValidUUID(teamId)) {
      errors.push(`Invalid participant UUID format: "${teamId}"`);
    }
  }
  
  // Validate tournament ID
  if (!participant.tournament_id) {
    errors.push('Tournament ID is required');
  } else if (!isValidUUID(participant.tournament_id)) {
    errors.push(`Invalid tournament UUID format: "${participant.tournament_id}"`);
  }
  
  // Validate name
  if (!participant.name) {
    console.warn('Participant name is missing, will use ID as fallback');
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Adapter that implements the CrudInterface for BracketsManager
 * This adapter conforms to the exact interface expected by BracketsManager
 */
export class BracketsManagerAdapter implements CrudInterface {
  /**
   * Insert records into a specific table
   * Implementation to match CrudInterface
   */
  async insert<T extends Table>(table: T, value: OmitId<DataTypes[T]> | OmitId<DataTypes[T]>[]): Promise<number | string> {
    try {
      const isArray = Array.isArray(value);
      const dataArray = isArray ? value : [value];
      
      // Match table name to operation
      switch (table) {
        case 'match':
          const match = dataArray[0];
          const matchData = {
            id: match.id || undefined,
            round: match.round || 1,
            position: match.position || 0,
            match_type: match.group_id ? 'losers' as PlayoffMatchType : 'winners' as PlayoffMatchType,
            team1_id: match.opponent1?.id || null,
            team2_id: match.opponent2?.id || null,
            bracket_id: match.stage_id,
            winner_id: null,
            loser_id: null,
            best_of: match.best_of || 3,
            team1_score: null,
            team2_score: null,
            team1_game_wins: null,
            team2_game_wins: null,
            status: 'pending'
          };
          
          const matchResult = await supabase
            .from('playoff_matches')
            .insert(matchData)
            .select('id')
            .single();
          
          if (matchResult.error) throw matchResult.error;
          return matchResult.data.id as string;
          
        case 'participant':
          const participant = dataArray[0];
          
          console.log('BracketsManagerAdapter: Processing participant insert:', participant);
          
          // Validate participant data
          const validation = validateParticipantData(participant);
          if (!validation.isValid) {
            const errorMessage = `Participant validation failed: ${validation.errors.join(', ')}`;
            console.error('BracketsManagerAdapter:', errorMessage);
            throw new Error(errorMessage);
          }
          
          // Extract and validate team ID
          const teamId = typeof participant.id === 'number' ? participant.id.toString() : participant.id;
          const tournamentId = participant.tournament_id;
          
          const participantData = {
            bracket_id: tournamentId,
            team_id: teamId,
            tournament_id: tournamentId,
            name: participant.name || teamId,
            position: participant.position || 0,
            seeding: participant.seeding ?? null
          };
          
          console.log('BracketsManagerAdapter: Inserting participant with validated data:', participantData);
          
          const participantResult = await supabase
            .from('participants')
            .insert(participantData)
            .select('id')
            .single();
          
          if (participantResult.error) {
            console.error('BracketsManagerAdapter: Participant insert failed:', participantResult.error);
            throw participantResult.error;
          }
          
          console.log('BracketsManagerAdapter: Participant inserted successfully:', participantResult.data.id);
          return participantResult.data.id as string;
          
        case 'stage':
          // Note: This case might be duplicate with SimpleBracketCreationService
          // For now, we'll skip this to avoid conflicts since the bracket is already created
          console.log('BracketsManagerAdapter: Skipping stage insert to avoid duplicate bracket creation');
          return 'stage-skipped';
          
        default:
          console.warn(`Insert operation not implemented for table ${table}`);
          throw new Error(`Insert operation not implemented for table ${table}`);
      }
    } catch (error) {
      console.error(`Error in insert for table ${table}:`, error);
      throw error;
    }
  }
  
  /**
   * Select records from a table - implement all function signatures from CrudInterface
   */
  async select<T extends Table>(table: T): Promise<DataTypes[T][]>;
  async select<T extends Table>(table: T, id: string | number): Promise<DataTypes[T]>;
  async select<T extends Table>(table: T, filter: Partial<DataTypes[T]>): Promise<DataTypes[T][]>;
  async select<T extends Table>(table: T, idOrFilter?: string | number | Partial<DataTypes[T]>): Promise<DataTypes[T] | DataTypes[T][]> {
    try {
      // Handle single ID lookup
      if (typeof idOrFilter === 'number' || typeof idOrFilter === 'string') {
        const id = idOrFilter.toString(); // Convert number to string if needed
        switch (table) {
          case 'match':
            // Not implemented yet, return empty result
            return {} as DataTypes[T];
          default:
            console.warn(`Select by ID not implemented for table ${table}`);
            return {} as DataTypes[T];
        }
      }
      
      // Handle filter lookup or get all
      const filter = idOrFilter as Partial<DataTypes[T]> | undefined;
      
      switch (table) {
        case 'match':
          const tournamentId = filter && 'stage_id' in filter ? filter.stage_id : undefined;
          if (tournamentId) {
            const { data, error } = await supabase
              .from('playoff_matches')
              .select('*')
              .eq('bracket_id', tournamentId as string);
            
            if (error) throw error;
            
            return data.map(match => ({
              id: match.id,
              stage_id: match.bracket_id || '',
              group_id: match.match_type === 'losers' ? 'loser_bracket' : undefined,
              round: match.round,
              position: match.position,
              opponent1: match.team1_id ? {
                id: match.team1_id,
                position: 1,
                score: match.team1_score || 0
              } : undefined,
              opponent2: match.team2_id ? {
                id: match.team2_id,
                position: 2,
                score: match.team2_score || 0
              } : undefined,
              status: match.status as any
            })) as unknown as DataTypes[T][];
          }
          return [] as DataTypes[T][];
          
        case 'participant':
          const filterObj: { tournament_id?: string; name?: string } = {};
          if (filter && 'tournament_id' in filter) {
            filterObj.tournament_id = filter.tournament_id as string;
          }
          if (filter && 'name' in filter) {
            filterObj.name = filter.name as string;
          }
          
          const { data: participants, error } = await supabase
            .from('participants')
            .select('*')
            .eq('tournament_id', filterObj.tournament_id || '')
            .ilike('name', filterObj.name ? `%${filterObj.name}%` : '%');
          
          if (error) throw error;
          return participants as unknown as DataTypes[T][];
          
        default:
          console.warn(`Select operation not implemented for table ${table}`);
          return [] as DataTypes[T][];
      }
    } catch (error) {
      console.error(`Error in select for table ${table}:`, error);
      return [] as DataTypes[T][];
    }
  }
  
  /**
   * Update a record in a table
   */
  async update<T extends Table>(table: T, id: string | number, value: Partial<DataTypes[T]>): Promise<number> {
    try {
      const idStr = id.toString(); // Convert to string if it's a number
      
      switch (table) {
        case 'match':
          if ('opponent1' in value || 'opponent2' in value || 'status' in value) {
            const data = value as any;
            const winnerId = data.opponent1?.result === 'win' ? data.opponent1.id :
                           data.opponent2?.result === 'win' ? data.opponent2.id : null;
                           
            const loserId = data.opponent1?.result === 'loss' ? data.opponent1.id :
                          data.opponent2?.result === 'loss' ? data.opponent2.id : null;
            
            if (winnerId && loserId) {
              const updateData = {
                winner_id: winnerId,
                loser_id: loserId,
                team1_score: data.opponent1?.score || 0,
                team2_score: data.opponent2?.score || 0,
                status: data.status || 'completed'
              };
              
              const { error } = await supabase
                .from('playoff_matches')
                .update(updateData)
                .eq('id', idStr);
              
              if (error) throw error;
              return 1; // Return number of updated records
            }
          }
          return 0;
          
        default:
          console.warn(`Update operation not implemented for table ${table}`);
          return 0;
      }
    } catch (error) {
      console.error(`Error in update for table ${table}:`, error);
      return 0;
    }
  }
  
  /**
   * Delete records from a table
   */
  async delete<T extends Table>(table: T): Promise<number>;
  async delete<T extends Table>(table: T, filter: Partial<DataTypes[T]>): Promise<number>;
  async delete<T extends Table>(table: T, filter?: Partial<DataTypes[T]>): Promise<number> {
    try {
      console.log(`Delete operation called for table ${table} with filter:`, filter);
      return 0; // Return number of deleted records
    } catch (error) {
      console.error(`Error in delete for table ${table}:`, error);
      return 0;
    }
  }
}

// Create an instance of the adapter and export it
export const bracketsAdapter = new BracketsManagerAdapter();
