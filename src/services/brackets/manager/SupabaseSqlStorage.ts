import { CrudInterface, DataTypes, OmitId } from 'brackets-manager';
import { supabase } from '@/integrations/supabase/client';

type Id = number | string;

/**
 * Supabase SQL Storage Adapter for brackets-manager
 * Implements the CrudInterface to work directly with Supabase SQL tables
 */
export class SupabaseSqlStorage implements CrudInterface {
  /**
   * Transform match data from brackets-manager format to SQL format
   * Flattens opponent1/opponent2 objects into separate columns
   */
  private transformMatchToDb(data: any): any {
    const transformed: any = { ...data };
    
    // Handle opponent1 - always transform, even if null/undefined
    if ('opponent1' in data) {
      if (data.opponent1 && typeof data.opponent1 === 'object') {
        transformed.opponent1_id = data.opponent1.id ?? null;
        transformed.opponent1_score = data.opponent1.score ?? null;
        transformed.opponent1_result = data.opponent1.result ?? null;
      } else {
        // opponent1 is null/undefined (BYE case) - set all fields to null
        transformed.opponent1_id = null;
        transformed.opponent1_score = null;
        transformed.opponent1_result = null;
      }
      delete transformed.opponent1; // Always delete the opponent1 field
    }
    
    // Handle opponent2 - always transform, even if null/undefined
    if ('opponent2' in data) {
      if (data.opponent2 && typeof data.opponent2 === 'object') {
        transformed.opponent2_id = data.opponent2.id ?? null;
        transformed.opponent2_score = data.opponent2.score ?? null;
        transformed.opponent2_result = data.opponent2.result ?? null;
      } else {
        // opponent2 is null/undefined (BYE case) - set all fields to null
        transformed.opponent2_id = null;
        transformed.opponent2_score = null;
        transformed.opponent2_result = null;
      }
      delete transformed.opponent2; // Always delete the opponent2 field
    }
    
    return transformed;
  }

  /**
   * Transform match data from SQL format to brackets-manager format
   * Re-inflates separate columns into opponent1/opponent2 objects
   */
  private transformMatchFromDb(data: any): any {
    const transformed: any = { ...data };
    
    // Re-inflate opponent1
    if ('opponent1_id' in data || 'opponent1_score' in data || 'opponent1_result' in data) {
      transformed.opponent1 = {
        id: data.opponent1_id ?? null,
        score: data.opponent1_score ?? null,
        result: data.opponent1_result ?? null
      };
      delete transformed.opponent1_id;
      delete transformed.opponent1_score;
      delete transformed.opponent1_result;
    }
    
    // Re-inflate opponent2
    if ('opponent2_id' in data || 'opponent2_score' in data || 'opponent2_result' in data) {
      transformed.opponent2 = {
        id: data.opponent2_id ?? null,
        score: data.opponent2_score ?? null,
        result: data.opponent2_result ?? null
      };
      delete transformed.opponent2_id;
      delete transformed.opponent2_score;
      delete transformed.opponent2_result;
    }
    
    return transformed;
  }

  /**
   * Transform data for database storage based on table type
   */
  private transformDataForDb<T extends keyof DataTypes>(table: T, data: any): any {
    if (table === 'match') {
      return this.transformMatchToDb(data);
    }
    return data;
  }

  // Select overloads
  async select<T extends keyof DataTypes>(table: T): Promise<DataTypes[T][]>;
  async select<T extends keyof DataTypes>(table: T, id: Id): Promise<DataTypes[T]>;
  async select<T extends keyof DataTypes>(table: T, filter: Partial<DataTypes[T]>): Promise<DataTypes[T][]>;
  
  async select<T extends keyof DataTypes>(table: T, filter?: Partial<DataTypes[T]> | Id): Promise<DataTypes[T][] | DataTypes[T]> {
    const client = supabase as any;
    let query = client.from(table).select('*');
    
    console.log(`🔵 SupabaseSqlStorage.select() - Table: ${table}`, { filter });
    
    if (filter !== undefined) {
      if (typeof filter === 'number' || typeof filter === 'string') {
        // Single ID lookup
        query = query.eq('id', filter);
        const { data, error } = await query.single();
        
        if (error) {
          console.error(`❌ SupabaseSqlStorage.select() FAILED - Table: ${table}`, {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            filter
          });
          throw error;
        }
        
    console.log(`✅ SupabaseSqlStorage.select() SUCCESS - Table: ${table}, Single record found`);
        const transformedData = table === 'match' ? this.transformMatchFromDb(data) : data;
        return transformedData as DataTypes[T];
      } else {
        // Filter object
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`❌ SupabaseSqlStorage.select() FAILED - Table: ${table}`, {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        filter
      });
      throw error;
    }
    
    console.log(`✅ SupabaseSqlStorage.select() SUCCESS - Table: ${table}, Rows: ${data?.length || 0}`);
    const transformedData = table === 'match' ? (data || []).map(item => this.transformMatchFromDb(item)) : (data || []);
    return transformedData as DataTypes[T][];
  }

  // Insert overloads - single returns number (ID), array returns boolean
  async insert<T extends keyof DataTypes>(table: T, value: OmitId<DataTypes[T]>): Promise<number>;
  async insert<T extends keyof DataTypes>(table: T, values: OmitId<DataTypes[T]>[]): Promise<boolean>;
  
  async insert<T extends keyof DataTypes>(table: T, values: OmitId<DataTypes[T]> | OmitId<DataTypes[T]>[]): Promise<number | boolean> {
    const client = supabase as any;
    const isArray = Array.isArray(values);
    const items = isArray ? values : [values];
    
    console.log(`🔵 SupabaseSqlStorage.insert() - Table: ${table}, Count: ${items.length}`, {
      table,
      itemCount: items.length,
      firstItem: items[0]
    });
    
    // Transform data for database storage
    const transformedItems = items.map(item => this.transformDataForDb(table, item));
    
    if (table === 'match') {
      console.log(`🔄 SupabaseSqlStorage.insert() - MATCH TRANSFORMATION`, {
        before: items[0],
        after: transformedItems[0]
      });
    }
    
    const { data, error } = await client
      .from(table)
      .insert(transformedItems)
      .select('id');
    
    if (error) {
      console.error(`❌ SupabaseSqlStorage.insert() FAILED - Table: ${table}`, {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        statusCode: error.statusCode,
        items
      });
      throw error;
    }
    
    console.log(`✅ SupabaseSqlStorage.insert() SUCCESS - Table: ${table}`, {
      insertedCount: data?.length || 0,
      returnedIds: data?.map(d => d.id)
    });
    
    // Single insert returns the ID, array insert returns true
    if (isArray) {
      return true;
    } else {
      return (data && data[0]) ? data[0].id : 0;
    }
  }

  // Update overloads
  async update<T extends keyof DataTypes>(table: T, id: Id, value: DataTypes[T]): Promise<boolean>;
  async update<T extends keyof DataTypes>(table: T, filter: Partial<DataTypes[T]>, value: Partial<DataTypes[T]>): Promise<boolean>;
  
  async update<T extends keyof DataTypes>(
    table: T,
    filter: Partial<DataTypes[T]> | Id,
    values: Partial<DataTypes[T]>
  ): Promise<boolean> {
    const client = supabase as any;
    
    // Transform data for database storage
    const transformedValues = this.transformDataForDb(table, values);
    
    console.log(`🔵 SupabaseSqlStorage.update() - Table: ${table}`, { filter, values });
    
    if (table === 'match') {
      console.log(`🔄 SupabaseSqlStorage.update() - MATCH TRANSFORMATION`, {
        before: values,
        after: transformedValues,
        matchId: typeof filter === 'number' || typeof filter === 'string' ? filter : filter
      });
      
      // ⭐ Fetch current state BEFORE update
      if ('opponent1' in values || 'opponent2' in values) {
        const matchId = typeof filter === 'number' || typeof filter === 'string' ? filter : (filter as any).id;
        const { data: currentMatch } = await client
          .from('match')
          .select('id, opponent1_id, opponent2_id, opponent1_result, opponent2_result, round_id, group_id, number')
          .eq('id', matchId)
          .single();
        
        console.log(`📊 BEFORE UPDATE - Match ${matchId} current state:`, currentMatch);
        console.log(`📊 AFTER TRANSFORM - Will write to Match ${matchId}:`, {
          opponent1_id: transformedValues.opponent1_id,
          opponent2_id: transformedValues.opponent2_id,
          opponent1_result: transformedValues.opponent1_result,
          opponent2_result: transformedValues.opponent2_result
        });
      }
    }
    
    let query = client.from(table).update(transformedValues);
    
    if (typeof filter === 'number' || typeof filter === 'string') {
      query = query.eq('id', filter);
    } else {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { error } = await query;
    
    if (error) {
      console.error(`❌ SupabaseSqlStorage.update() FAILED - Table: ${table}`, {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        filter,
        values
      });
      throw error;
    }
    
    console.log(`✅ SupabaseSqlStorage.update() SUCCESS - Table: ${table}`);
    
    // ⭐ Fetch and log final state AFTER update for match opponent changes
    if (table === 'match' && ('opponent1' in values || 'opponent2' in values)) {
      const matchId = typeof filter === 'number' || typeof filter === 'string' ? filter : (filter as any).id;
      const { data: finalMatch } = await client
        .from('match')
        .select('id, opponent1_id, opponent2_id, opponent1_result, opponent2_result, round_id, group_id, number')
        .eq('id', matchId)
        .single();
      
      console.log(`📊 AFTER UPDATE - Match ${matchId} final state:`, finalMatch);
    }
    
    return true;
  }

  // Delete overloads  
  async delete<T extends keyof DataTypes>(table: T): Promise<boolean>;
  async delete<T extends keyof DataTypes>(table: T, filter: Partial<DataTypes[T]>): Promise<boolean>;
  
  async delete<T extends keyof DataTypes>(table: T, filter?: Partial<DataTypes[T]>): Promise<boolean> {
    const client = supabase as any;
    let query = client.from(table).delete();
    
    console.log(`🔵 SupabaseSqlStorage.delete() - Table: ${table}`, { filter });
    
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { error } = await query;
    
    if (error) {
      console.error(`❌ SupabaseSqlStorage.delete() FAILED - Table: ${table}`, {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        filter
      });
      throw error;
    }
    
    console.log(`✅ SupabaseSqlStorage.delete() SUCCESS - Table: ${table}`);
    return true;
  }
}
