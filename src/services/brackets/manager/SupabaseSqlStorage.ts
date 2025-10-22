import { CrudInterface, DataTypes, OmitId } from 'brackets-manager';
import { supabase } from '@/integrations/supabase/client';

type Id = number | string;

/**
 * Supabase SQL Storage Adapter for brackets-manager
 * Implements the CrudInterface to work directly with Supabase SQL tables
 */
export class SupabaseSqlStorage implements CrudInterface {
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
        return data as DataTypes[T];
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
    return (data || []) as DataTypes[T][];
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
    
    const { data, error } = await client
      .from(table)
      .insert(items)
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
    let query = client.from(table).update(values);
    
    console.log(`🔵 SupabaseSqlStorage.update() - Table: ${table}`, { filter, values });
    
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
