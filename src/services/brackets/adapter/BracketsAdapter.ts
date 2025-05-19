
import { StorageAdapter } from './interfaces/StorageAdapter';
import { ParticipantAdapter } from './adapters/ParticipantAdapter';
import { StageAdapter } from './adapters/StageAdapter';
import { MatchAdapter } from './adapters/MatchAdapter';

/**
 * Adapter for Supabase storage to work with brackets-manager
 * Implements the StorageAdapter interface
 */
export class BracketsAdapter implements StorageAdapter {
  private participantAdapter = new ParticipantAdapter();
  private stageAdapter = new StageAdapter();
  // We need to initialize the MatchAdapter if it exists
  private matchAdapter: any = {};

  /**
   * Insert data into the appropriate table
   */
  async insert<T>(table: string, data: T | T[]): Promise<boolean> {
    try {
      switch (table) {
        case 'participant':
          await this.participantAdapter.insertParticipants(Array.isArray(data) ? data : [data]);
          break;
        case 'stage':
          if (!Array.isArray(data)) {
            await this.stageAdapter.insertStage(data);
          } else {
            for (const stage of data) {
              await this.stageAdapter.insertStage(stage);
            }
          }
          break;
        // Add other cases as needed
        default:
          console.warn(`Table ${table} not implemented for insert`);
          return false;
      }
      return true;
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error);
      throw error;
    }
  }

  /**
   * Select data from the appropriate table
   */
  async select<T>(table: string, filter?: Record<string, any>): Promise<T[]> {
    try {
      switch (table) {
        case 'participant':
          return (await this.participantAdapter.selectParticipants(filter)) as unknown as T[];
        case 'stage':
          return (await this.stageAdapter.selectStages(filter)) as unknown as T[];
        // Handle other tables
        default:
          console.warn(`Table ${table} not implemented for select`);
          return [];
      }
    } catch (error) {
      console.error(`Error selecting from ${table}:`, error);
      throw error;
    }
  }

  /**
   * Update data in the appropriate table
   */
  async update<T>(table: string, id: string, data: T): Promise<boolean> {
    try {
      // Implementation for each table's update logic
      console.warn(`Update for table ${table} not yet implemented`);
      return true;
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      throw error;
    }
  }

  /**
   * Delete data from the appropriate table
   */
  async delete(table: string, filter?: Record<string, any>): Promise<boolean> {
    try {
      // Implementation for each table's delete logic
      console.warn(`Delete for table ${table} not yet implemented`);
      return true;
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      throw error;
    }
  }

  /**
   * Select the first item from a table
   */
  async selectFirst<T>(table: string): Promise<T | null> {
    try {
      const results = await this.select<T>(table);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Error in selectFirst for ${table}:`, error);
      throw error;
    }
  }

  /**
   * Select the last item from a table
   */
  async selectLast<T>(table: string): Promise<T | null> {
    try {
      const results = await this.select<T>(table);
      return results.length > 0 ? results[results.length - 1] : null;
    } catch (error) {
      console.error(`Error in selectLast for ${table}:`, error);
      throw error;
    }
  }
}
