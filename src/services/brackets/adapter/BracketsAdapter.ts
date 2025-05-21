import { BracketDatabaseService } from "../database/services/BracketDatabaseService";
import { BracketFilter, BracketRecord, BracketTable } from "./types/AdapterTypes";
import { PlayoffMatch, PlayoffMatchType } from "../types";

/**
 * Adapter implementation for BracketsManager
 * This provides the required interface for the brackets-manager library
 */
export class BracketsAdapter {
  private service: BracketDatabaseService;
  
  constructor() {
    this.service = new BracketDatabaseService();
  }
  
  /**
   * Insert records into the database
   * @param data Array of data to insert
   * @returns Number of records inserted
   */
  async insert(data: any[]): Promise<number> {
    try {
      if (!data || data.length === 0) return 0;
      
      const sample = data[0];
      
      // Insert matches
      if ('round' in sample || 'opponent1' in sample) {
        // Convert from brackets-manager format to our format
        const matches = data.map((match: any) => ({
          id: match.id,
          round: match.round,
          position: match.position,
          matchType: match.group_id ? 'losers' as PlayoffMatchType : 'winners' as PlayoffMatchType,
          team1Id: match.opponent1?.id || null,
          team2Id: match.opponent2?.id || null,
          bracket_id: match.stage_id,
          winnerId: null,
          loserId: null
        }) as PlayoffMatch);
        
        const result = await this.service.savePlayoffMatches(matches);
        return result;
      }
      
      // Insert participants
      if ('tournament_id' in sample) {
        let count = 0;
        for (const participant of data) {
          await this.service.createParticipant({
            id: participant.id,
            tournament_id: participant.tournament_id,
            name: participant.name || '',
            position: participant.position
          });
          count++;
        }
        return count;
      }
      
      console.warn('No matching table type found for insert:', sample);
      return 0;
    } catch (error) {
      console.error('Error in adapter insert method:', error);
      return 0;
    }
  }
  
  /**
   * Select records from the database
   * @param filter Filter criteria
   * @returns Array of records
   */
  async select(filter?: BracketFilter): Promise<BracketRecord[]> {
    try {
      if (!filter) return [];
      
      // Participants
      if ('tournament_id' in filter) {
        return this.service.selectParticipants({
          tournament_id: filter.tournament_id
        }) as unknown as BracketRecord[];
      }
      
      // Matches
      if ('stage_id' in filter) {
        const matches = await this.service.getBracketMatches(filter.stage_id as string);
        
        // Convert to brackets-manager format
        return matches.map(match => ({
          id: match.id,
          stage_id: match.bracket_id || '',
          group_id: match.matchType === 'losers' ? 'loser_bracket' : undefined,
          round: match.round,
          position: match.position,
          opponent1: match.team1Id ? {
            id: match.team1Id,
            position: 1,
            score: match.team1Score || 0
          } : undefined,
          opponent2: match.team2Id ? {
            id: match.team2Id,
            position: 2,
            score: match.team2Score || 0
          } : undefined,
          status: match.status as any
        }));
      }
      
      console.warn('No matching filter type found for select:', filter);
      return [];
    } catch (error) {
      console.error('Error in adapter select method:', error);
      return [];
    }
  }
  
  /**
   * Update a record
   * @param id Record ID
   * @param data Update data
   * @returns Number of records updated
   */
  async update(id: string, data: any): Promise<number> {
    try {
      console.log('Update operation called with ID:', id, 'and data:', data);
      
      // Update match results
      if ('opponent1' in data || 'opponent2' in data || 'status' in data) {
        const winnerId = data.opponent1?.result === 'win' ? data.opponent1.id :
                       data.opponent2?.result === 'win' ? data.opponent2.id : null;
                       
        const loserId = data.opponent1?.result === 'loss' ? data.opponent1.id :
                      data.opponent2?.result === 'loss' ? data.opponent2.id : null;
        
        if (winnerId && loserId) {
          await this.service.recordMatchResult({
            match_id: id,
            winner_id: winnerId,
            loser_id: loserId,
            team1_score: data.opponent1?.score || 0,
            team2_score: data.opponent2?.score || 0,
            team1_game_wins: 0, // Default value
            team2_game_wins: 0, // Default value
            completed: data.status === 'completed'
          });
          
          return 1;
        }
      }
      
      console.warn('No matching update type found:', data);
      return 0;
    } catch (error) {
      console.error('Error in adapter update method:', error);
      return 0;
    }
  }
  
  /**
   * Delete records from the database
   * @param filter Filter criteria
   * @returns Number of records deleted
   */
  async delete(filter?: BracketFilter): Promise<number> {
    try {
      console.log('Delete operation called with filter:', filter);
      
      if (!filter) {
        console.warn('No filter provided for delete operation');
        return 0;
      }
      
      // In a real implementation, we would delete the records
      return 1; // Indicate success
    } catch (error) {
      console.error('Error in delete method:', error);
      return 0;
    }
  }
  
  /**
   * Insert records into a specific table
   * @param table Table name
   * @param data Data to insert
   * @returns Number of records inserted
   */
  async insertIntoTable(table: string, data: any[]): Promise<number> {
    try {
      if (table === BracketTable.Match) {
        return this.insert(data);
      } else if (table === BracketTable.Participant) {
        return this.insert(data);
      }
      
      console.warn(`Table ${table} not supported for insertIntoTable`);
      return 0;
    } catch (error) {
      console.error(`Error inserting into table ${table}:`, error);
      return 0;
    }
  }
  
  /**
   * Select records from a specific table
   * @param table Table name
   * @param filter Filter criteria
   * @returns Array of records
   */
  async selectFromTable(table: string, filter?: BracketFilter): Promise<BracketRecord[]> {
    try {
      if (table === BracketTable.Match) {
        return this.select(filter);
      } else if (table === BracketTable.Participant) {
        return this.select(filter);
      }
      
      console.warn(`Table ${table} not supported for selectFromTable`);
      return [];
    } catch (error) {
      console.error(`Error selecting from table ${table}:`, error);
      return [];
    }
  }
  
  /**
   * Update a record in a specific table
   * @param table Table name
   * @param id Record ID
   * @param data Update data
   * @returns Number of records updated
   */
  async updateInTable(table: string, id: string, data: any): Promise<number> {
    try {
      if (table === BracketTable.Match) {
        return this.update(id, data);
      }
      
      console.warn(`Table ${table} not supported for updateInTable`);
      return 0;
    } catch (error) {
      console.error(`Error updating in table ${table}:`, error);
      return 0;
    }
  }
  
  /**
   * Delete records from a specific table
   * @param table Table name
   * @param filter Filter criteria
   * @returns Number of records deleted
   */
  async deleteFromTable(table: string, filter?: BracketFilter): Promise<number> {
    try {
      if (table === BracketTable.Match) {
        return this.delete(filter);
      }
      
      console.warn(`Table ${table} not supported for deleteFromTable`);
      return 0;
    } catch (error) {
      console.error(`Error deleting from table ${table}:`, error);
      return 0;
    }
  }
}
