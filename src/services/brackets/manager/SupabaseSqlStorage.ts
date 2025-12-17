import { CrudInterface, DataTypes, OmitId } from 'brackets-manager';
import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog } from '@/utils/logger';

type Id = number | string;

/**
 * Helper: Extract specific fields from object for logging
 */
function pick(obj: any, keys: string[]): any {
  const result: any = {};
  keys.forEach(k => {
    result[k] = obj?.[k];
  });
  return result;
}

/**
 * Helper: Defensive merge to prevent null from overwriting filled opponent slots
 */
function mergeOpponentSlots(prev: any, patch: any): any {
  const out = { ...patch };
  
  for (const slot of ['opponent1_id', 'opponent2_id']) {
    if (slot in patch) {
      const incoming = patch[slot];
      // If incoming is null but previous slot has a value, don't overwrite
      if (incoming === null && prev?.[slot] != null) {
        bracketLog(`Defensive merge: Prevented null overwrite of ${slot}`);
        delete out[slot];
      }
    }
  }
  
  return out;
}

/**
 * Supabase SQL Storage Adapter for brackets-manager
 * Implements the CrudInterface to work directly with Supabase SQL tables
 */
export class SupabaseSqlStorage implements CrudInterface {
  private participantCache: Map<number, { position: number; name: string }> = new Map();
  /**
   * Load participants into cache for a tournament
   * Call this before bracket operations to ensure position data is available
   */
  async loadParticipantsForTournament(tournamentId: string): Promise<void> {
    const participants = await this.internalSelect('participant', { 
      tournament_id: tournamentId 
    } as any);
    
    const participantArray = Array.isArray(participants) ? participants : [participants];
    
    bracketLog(`Loading ${participantArray.length} participants into cache for tournament ${tournamentId}`);
    
    for (const p of participantArray) {
      const participant = p as any;
      if (participant.id && typeof participant.id === 'number') {
        this.participantCache.set(participant.id, {
          position: participant.position ?? 0,
          name: participant.name ?? ''
        });
      }
    }
    
    bracketLog(`Participant cache loaded: ${this.participantCache.size} entries`);
  }

  /**
   * Clear participant cache - call when bracket structure changes significantly
   */
  clearParticipantCache(): void {
    this.participantCache.clear();
    bracketLog('Participant cache cleared');
  }

  /**
   * Internal select method that bypasses cache loading
   */
  private async internalSelect<T extends keyof DataTypes>(
    table: T,
    filter?: Partial<DataTypes[T]> | Id
  ): Promise<DataTypes[T][] | DataTypes[T]> {
    const client = supabase as any;
    let query = client.from(table).select('*');
    
    if (filter !== undefined) {
      if (typeof filter === 'number' || typeof filter === 'string') {
        query = query.eq('id', filter);
        const { data, error } = await query.single();
        
        if (error) throw error;
        return table === 'match' ? this.transformMatchFromDb(data) : data;
      } else {
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const transformedData = table === 'match' ? (data || []).map(item => this.transformMatchFromDb(item)) : (data || []);
    return transformedData as DataTypes[T][];
  }

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
   * Includes position field from participant cache for proper bracket routing
   */
  private transformMatchFromDb(data: any): any {
    const transformed: any = { ...data };
    
    // Re-inflate opponent1 with position from cache
    if ('opponent1_id' in data || 'opponent1_score' in data || 'opponent1_result' in data) {
      const opponentId = data.opponent1_id;
      const cached = opponentId ? this.participantCache.get(opponentId) : null;
      
      transformed.opponent1 = {
        id: opponentId ?? null,
        position: cached?.position ?? undefined,
        score: data.opponent1_score ?? null,
        result: data.opponent1_result ?? null
      };
      delete transformed.opponent1_id;
      delete transformed.opponent1_score;
      delete transformed.opponent1_result;
    }
    
    // Re-inflate opponent2 with position from cache
    if ('opponent2_id' in data || 'opponent2_score' in data || 'opponent2_result' in data) {
      const opponentId = data.opponent2_id;
      const cached = opponentId ? this.participantCache.get(opponentId) : null;
      
      transformed.opponent2 = {
        id: opponentId ?? null,
        position: cached?.position ?? undefined,
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
    // Use the public select method which includes logging
    return this.internalSelect(table, filter);
    
  }

  // Insert overloads - single returns number (ID), array returns boolean
  async insert<T extends keyof DataTypes>(table: T, value: OmitId<DataTypes[T]>): Promise<number>;
  async insert<T extends keyof DataTypes>(table: T, values: OmitId<DataTypes[T]>[]): Promise<boolean>;
  
  async insert<T extends keyof DataTypes>(table: T, values: OmitId<DataTypes[T]> | OmitId<DataTypes[T]>[]): Promise<number | boolean> {
    const client = supabase as any;
    const isArray = Array.isArray(values);
    const items = isArray ? values : [values];
    
    bracketLog(`Insert ${items.length} row(s) into ${table}`);
    
    // Transform data for database storage
    const transformedItems = items.map(item => this.transformDataForDb(table, item));
    
    const { data, error } = await client
      .from(table)
      .insert(transformedItems)
      .select('id');
    
    if (error) {
      errorLog(`Insert failed for ${table}:`, error);
      throw error;
    }
    
    bracketLog(`Insert success: ${data?.length || 0} row(s) in ${table}`);
    
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
    let transformedValues = this.transformDataForDb(table, values);
    
    bracketLog(`Update ${table}`, { filter });
    
    // ⭐ DEFENSIVE MERGE: Prevent null from overwriting filled opponent slots
    if (table === 'match' && ('opponent1' in values || 'opponent2' in values)) {
      const matchId = typeof filter === 'number' || typeof filter === 'string' ? filter : (filter as any).id;
      const { data: currentMatch } = await client
        .from('match')
        .select('id, opponent1_id, opponent2_id, opponent1_result, opponent2_result, round_id, group_id, number, status')
        .eq('id', matchId)
        .single();
      
      // Apply defensive merge
      transformedValues = mergeOpponentSlots(currentMatch, transformedValues);
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
      errorLog(`Update failed for ${table}:`, error);
      throw error;
    }
    
    bracketLog(`Update success: ${table}`);
    
    return true;
  }

  // Delete overloads  
  async delete<T extends keyof DataTypes>(table: T): Promise<boolean>;
  async delete<T extends keyof DataTypes>(table: T, filter: Partial<DataTypes[T]>): Promise<boolean>;
  
  async delete<T extends keyof DataTypes>(table: T, filter?: Partial<DataTypes[T]>): Promise<boolean> {
    const client = supabase as any;
    let query = client.from(table).delete();
    
    bracketLog(`Delete from ${table}`, { filter });
    
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { error } = await query;
    
    if (error) {
      errorLog(`Delete failed for ${table}:`, error);
      throw error;
    }
    
    bracketLog(`Delete success: ${table}`);
    return true;
  }
}
