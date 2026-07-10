import type { SupabaseClient } from '@supabase/supabase-js';
import { CrudInterface, DataTypes, OmitId } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, errorLog } from '@/utils/logger';

import {
  mergeOpponentSlots,
  transformMatchFromDb,
  transformMatchToDb,
} from './SupabaseSqlStorage/matchTransforms';
import type { BmMatch, DbMatch, Id, ParticipantCacheEntry } from './SupabaseSqlStorage/types';

/**
 * Supabase SQL Storage Adapter for brackets-manager
 * Implements the CrudInterface to work directly with Supabase SQL tables
 */
export class SupabaseSqlStorage implements CrudInterface {
  private participantCache: Map<number, ParticipantCacheEntry> = new Map();

  /**
   * Load participants into cache for a tournament
   * Call this before bracket operations to ensure position data is available
   */
  async loadParticipantsForTournament(tournamentId: string): Promise<void> {
    const participants = await this.internalSelect('participant', {
      tournament_id: tournamentId,
    } as Partial<DataTypes['participant']>);

    const participantArray = Array.isArray(participants) ? participants : [participants];

    bracketLog(
      `Loading ${participantArray.length} participants into cache for tournament ${tournamentId}`
    );

    for (const p of participantArray) {
      // Cast to extended type that includes position from our database schema
      const participant = p as DataTypes['participant'] & { position?: number };
      if (participant.id && typeof participant.id === 'number') {
        this.participantCache.set(participant.id, {
          position: participant.position ?? 0,
          name: participant.name ?? '',
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
   * Get Supabase client with proper typing
   */
  private getClient(): SupabaseClient {
    return supabase;
  }

  /**
   * Internal select method that bypasses cache loading
   */
  private static readonly BRACKET_TABLE_COLUMNS: Record<string, string> = {
    participant: 'id, name, position, team_id, tournament_id',
    match:
      'id, number, stage_id, group_id, round_id, child_count, status, opponent1_id, opponent1_score, opponent1_result, opponent2_id, opponent2_score, opponent2_result',
    stage: 'id, name, number, settings, tournament_id, type',
    group: 'id, name, number, stage_id',
    round: 'id, group_id, name, number, stage_id',
  };

  private async internalSelect<T extends keyof DataTypes>(
    table: T,
    filter?: Partial<DataTypes[T]> | Id
  ): Promise<DataTypes[T][] | DataTypes[T] | null> {
    const client = this.getClient();
    const columns = SupabaseSqlStorage.BRACKET_TABLE_COLUMNS[table as string] ?? 'id';
    let query = client.from(table).select(columns);

    if (filter !== undefined) {
      if (typeof filter === 'number' || typeof filter === 'string') {
        query = query.eq('id', filter);
        const { data, error } = await query.maybeSingle();

        if (error) handleDatabaseError(error, 'Failed to select from bracket table');
        if (!data) return null;

        // For match table, transform from DB format; cast to DataTypes[T] since TypeScript can't infer the conditional
        return (
          table === 'match' ? transformMatchFromDb(data as DbMatch, this.participantCache) : data
        ) as DataTypes[T];
      } else {
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
    }

    const { data, error } = await query;
    if (error) handleDatabaseError(error, 'Failed to select from bracket table');

    const rawData = (data || []) as DbMatch[];
    const transformedData =
      table === 'match'
        ? rawData.map((item) => transformMatchFromDb(item, this.participantCache))
        : data || [];
    return transformedData as DataTypes[T][];
  }

  /**
   * Transform data for database storage based on table type
   */
  private static transformDataForDb<T extends keyof DataTypes>(
    table: T,
    data: Partial<DataTypes[T]>
  ): Partial<DataTypes[T]> | DbMatch {
    if (table === 'match') {
      return transformMatchToDb(data as unknown as BmMatch);
    }
    return data;
  }

  async select<T extends keyof DataTypes>(
    table: T,
    filter?: Partial<DataTypes[T]> | Id
  ): Promise<DataTypes[T][] | DataTypes[T] | null> {
    // Use the public select method which includes logging
    return this.internalSelect(table, filter);
  }

  // Insert overloads - single returns number (ID), array returns boolean
  async insert<T extends keyof DataTypes>(table: T, value: OmitId<DataTypes[T]>): Promise<number>;
  async insert<T extends keyof DataTypes>(
    table: T,
    values: OmitId<DataTypes[T]>[]
  ): Promise<boolean>;

  async insert<T extends keyof DataTypes>(
    table: T,
    values: OmitId<DataTypes[T]> | OmitId<DataTypes[T]>[]
  ): Promise<number | boolean> {
    const client = this.getClient();
    const isArray = Array.isArray(values);
    const items = isArray ? values : [values];

    bracketLog(`Insert ${items.length} row(s) into ${table}`);

    // Transform data for database storage
    const transformedItems = items.map((item) =>
      SupabaseSqlStorage.transformDataForDb(table, item as Partial<DataTypes[T]>)
    );

    const { data, error } = await client
      .from(table)
      .insert(transformedItems as Record<string, unknown>[])
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
      const insertedData = data as Array<{ id: number }> | null;
      return insertedData?.[0] ? insertedData[0].id : 0;
    }
  }

  // Update overloads
  async update<T extends keyof DataTypes>(table: T, id: Id, value: DataTypes[T]): Promise<boolean>;
  async update<T extends keyof DataTypes>(
    table: T,
    filter: Partial<DataTypes[T]>,
    value: Partial<DataTypes[T]>
  ): Promise<boolean>;

  async update<T extends keyof DataTypes>(
    table: T,
    filter: Partial<DataTypes[T]> | Id,
    values: Partial<DataTypes[T]>
  ): Promise<boolean> {
    const client = this.getClient();

    // Transform data for database storage
    let transformedValues = SupabaseSqlStorage.transformDataForDb(table, values);

    bracketLog(`Update ${table}`, { filter });

    // ⭐ DEFENSIVE MERGE: Prevent null from overwriting filled opponent slots
    if (table === 'match' && ('opponent1' in values || 'opponent2' in values)) {
      const matchId =
        typeof filter === 'number' || typeof filter === 'string'
          ? filter
          : (filter as { id?: Id }).id;
      const { data: currentMatch, error: fetchError } = await client
        .from('match')
        .select(
          'id, opponent1_id, opponent2_id, opponent1_result, opponent2_result, round_id, group_id, number, status'
        )
        .eq('id', matchId as number)
        .maybeSingle();

      if (fetchError) {
        handleDatabaseError(fetchError, 'Failed to fetch match for defensive merge');
      }

      // Apply defensive merge
      transformedValues = mergeOpponentSlots(
        currentMatch as DbMatch | null,
        transformedValues as DbMatch
      );
    }

    let query = client.from(table).update(transformedValues as Record<string, unknown>);

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
  async delete<T extends keyof DataTypes>(
    table: T,
    filter: Partial<DataTypes[T]>
  ): Promise<boolean>;

  async delete<T extends keyof DataTypes>(
    table: T,
    filter?: Partial<DataTypes[T]>
  ): Promise<boolean> {
    const client = this.getClient();
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
