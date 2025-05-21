
/**
 * Adapter that implements the CrudInterface for BracketsManager
 * This adapter conforms to the exact interface expected by BracketsManager
 */
import { BracketDatabaseService } from "../database/services/BracketDatabaseService";
import { PlayoffMatchType } from "../types";

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
 * Interface that matches brackets-manager's CrudInterface
 */
interface CrudInterface {
  insert<T extends Table>(table: T, value: OmitId<DataTypes[T]> | OmitId<DataTypes[T]>[]): Promise<number>;
  select<T extends Table>(table: T): Promise<DataTypes[T][]>;
  select<T extends Table>(table: T, id: string | number): Promise<DataTypes[T]>;
  select<T extends Table>(table: T, filter: Partial<DataTypes[T]>): Promise<DataTypes[T][]>;
  update<T extends Table>(table: T, id: string | number, value: Partial<DataTypes[T]>): Promise<number>;
  delete<T extends Table>(table: T): Promise<number>;
  delete<T extends Table>(table: T, filter: Partial<DataTypes[T]>): Promise<number>;
}

/**
 * Adapter that implements the CrudInterface for BracketsManager
 * This adapter conforms to the exact interface expected by BracketsManager
 */
export class BracketsManagerAdapter implements CrudInterface {
  private service: BracketDatabaseService;
  
  constructor() {
    this.service = new BracketDatabaseService();
  }
  
  /**
   * Insert records into a specific table
   * Implementation to match CrudInterface
   */
  async insert<T extends Table>(table: T, value: OmitId<DataTypes[T]> | OmitId<DataTypes[T]>[]): Promise<number> {
    try {
      const isArray = Array.isArray(value);
      const dataArray = isArray ? value : [value];
      
      // Match table name to operation
      switch (table) {
        case 'match':
          const matches = dataArray.map((match: any) => ({
            id: match.id || undefined,
            round: match.round,
            position: match.position,
            matchType: match.group_id ? 'losers' as PlayoffMatchType : 'winners' as PlayoffMatchType,
            team1Id: match.opponent1?.id || null,
            team2Id: match.opponent2?.id || null,
            bracket_id: match.stage_id,
            winnerId: null,
            loserId: null,
            bestOf: match.best_of || 3 // Ensure bestOf has a default value
          }));
          await this.service.savePlayoffMatches(matches);
          return matches.length; // Return number of inserted matches
          
        case 'participant':
          let count = 0;
          for (const participant of dataArray) {
            await this.service.createParticipant({
              id: participant.id,
              tournament_id: participant.tournament_id,
              name: participant.name || '',
              position: participant.position
            });
            count++;
          }
          return count;
          
        default:
          console.warn(`Insert operation not implemented for table ${table}`);
          return 0;
      }
    } catch (error) {
      console.error(`Error in insert for table ${table}:`, error);
      return 0;
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
        const id = idOrFilter;
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
            const matches = await this.service.getBracketMatches(tournamentId as string);
            
            return matches.map(match => ({
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
          
          const participants = await this.service.selectParticipants(filterObj);
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
      switch (table) {
        case 'match':
          if ('opponent1' in value || 'opponent2' in value || 'status' in value) {
            const data = value as any;
            const winnerId = data.opponent1?.result === 'win' ? data.opponent1.id :
                           data.opponent2?.result === 'win' ? data.opponent2.id : null;
                           
            const loserId = data.opponent1?.result === 'loss' ? data.opponent1.id :
                          data.opponent2?.result === 'loss' ? data.opponent2.id : null;
            
            if (winnerId && loserId) {
              await this.service.recordMatchResult({
                match_id: id as string,
                winner_id: winnerId,
                loser_id: loserId,
                team1_score: data.opponent1?.score || 0,
                team2_score: data.opponent2?.score || 0,
                team1_game_wins: 0, // Default value
                team2_game_wins: 0, // Default value
                completed: data.status === 'completed'
              });
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
      // Not implemented yet
      return 0; // Return number of deleted records
    } catch (error) {
      console.error(`Error in delete for table ${table}:`, error);
      return 0;
    }
  }
}
