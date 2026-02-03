import type { SupabaseClient } from '@supabase/supabase-js';
import { CrudInterface, DataTypes, OmitId } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog } from '@/utils/logger';

type Id = number | string;

/**
 * Opponent slot in brackets-manager format
 */
interface BmOpponentSlot {
  id: number | null;
  position?: number;
  score?: number | null;
  result?: 'win' | 'loss' | 'draw' | null;
}

/**
 * Match in brackets-manager format (nested opponent objects)
 */
interface BmMatch {
  id?: number;
  number?: number;
  stage_id?: number;
  group_id?: number;
  round_id?: number;
  child_count?: number;
  status?: number;
  opponent1?: BmOpponentSlot | null;
  opponent2?: BmOpponentSlot | null;
}

/**
 * Match in database format (flattened columns)
 */
interface DbMatch {
  id?: number;
  number?: number;
  stage_id?: number;
  group_id?: number;
  round_id?: number;
  child_count?: number;
  status?: number;
  opponent1_id?: number | null;
  opponent1_score?: number | null;
  opponent1_result?: string | null;
  opponent2_id?: number | null;
  opponent2_score?: number | null;
  opponent2_result?: string | null;
}

/**
 * Participant cache entry
 */
interface ParticipantCacheEntry {
  position: number;
  name: string;
}

/**
 * Helper: Extract specific fields from object for logging
 */
function pick<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  keys: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  keys.forEach((k) => {
    result[k] = obj?.[k as keyof T];
  });
  return result;
}

/**
 * Helper: Defensive merge to prevent null from overwriting filled opponent slots
 */
function mergeOpponentSlots(prev: DbMatch | null, patch: DbMatch): DbMatch {
  const out = { ...patch };

  // Only protect completed matches (status >= 4) from null overwrites.
  // Incomplete matches (Locked/Waiting/Ready/Running) should allow brackets-manager
  // to freely modify opponent slots as part of normal BYE propagation.
  if (prev?.status != null && prev.status >= 4) {
    for (const slot of ['opponent1_id', 'opponent2_id'] as const) {
      if (slot in patch) {
        const incoming = patch[slot];
        if (incoming === null && prev?.[slot] != null) {
          bracketLog(`Defensive merge: Prevented null overwrite of ${slot} (completed match)`);
          delete out[slot];
        }
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
  private participantCache: Map<number, ParticipantCacheEntry> = new Map();
  /**
   * Cache mapping group_id → group_number
   * Used to determine if a match is in Losers Bracket (number=2)
   * Critical for BYE vs TBD detection
   */
  private groupCache: Map<number, number> = new Map();

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
   * Load groups into cache for a stage
   * Call this before bracket operations to enable BYE vs TBD detection
   */
  async loadGroupsForStage(stageId: number): Promise<void> {
    const groups = await this.internalSelect('group', { stage_id: stageId } as any);
    const groupsArray = Array.isArray(groups) ? groups : groups ? [groups] : [];

    bracketLog(`Loading ${groupsArray.length} groups into cache for stage ${stageId}`);

    for (const g of groupsArray) {
      const group = g as { id: number; number: number };
      if (group.id && typeof group.number === 'number') {
        this.groupCache.set(group.id, group.number);
      }
    }

    bracketLog(`Group cache loaded: ${this.groupCache.size} entries`);
  }

  /**
   * Clear group cache
   */
  clearGroupCache(): void {
    this.groupCache.clear();
    bracketLog('Group cache cleared');
  }

  /**
   * Check if a group_id is Losers Bracket (group number 2)
   */
  private isLosersBracket(groupId: number | undefined): boolean {
    if (groupId === undefined) return false;
    const groupNumber = this.groupCache.get(groupId);
    return groupNumber === 2;
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
  private async internalSelect<T extends keyof DataTypes>(
    table: T,
    filter?: Partial<DataTypes[T]> | Id
  ): Promise<DataTypes[T][] | DataTypes[T] | null> {
    const client = this.getClient();
    let query = client.from(table).select('*');

    if (filter !== undefined) {
      if (typeof filter === 'number' || typeof filter === 'string') {
        query = query.eq('id', filter);
        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        if (!data) return null;
        
        // For match table, transform from DB format; cast to DataTypes[T] since TypeScript can't infer the conditional
        return (
          table === 'match' ? this.transformMatchFromDb(data as DbMatch) : data
        ) as DataTypes[T];
      } else {
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const rawData = (data || []) as DbMatch[];
    const transformedData =
      table === 'match' ? rawData.map((item) => this.transformMatchFromDb(item)) : data || [];
    return transformedData as DataTypes[T][];
  }

  /**
   * Transform match data from brackets-manager format to SQL format
   * Flattens opponent1/opponent2 objects into separate columns
   */
  private transformMatchToDb(data: BmMatch): DbMatch {
    const transformed: DbMatch = { ...data };

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
      delete (transformed as BmMatch).opponent1; // Always delete the opponent1 field
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
      delete (transformed as BmMatch).opponent2; // Always delete the opponent2 field
    }

    return transformed;
  }

  /**
   * Transform match data from SQL format to brackets-manager format
   * Re-inflates separate columns into opponent1/opponent2 objects
   * Includes position field from participant cache for proper bracket routing
   *
   * CRITICAL: Handles BYE vs TBD detection based on bracket group:
   * - Winners Bracket (group 1): Empty slots return null → library auto-completes BYEs
   * - Losers Bracket (group 2): Empty slots return {id: null} → TBD, NO auto-completion
   * - Finals (group 3): Empty slots return {id: null} → TBD, NO auto-completion
   *
   * This prevents the cascading auto-advancement bug where teams advance through
   * the entire LB because empty TBD slots were incorrectly treated as BYEs.
   */
  private transformMatchFromDb(data: DbMatch): BmMatch {
    const transformed: BmMatch & DbMatch = { ...data };

    // Check if this match is in Losers Bracket (group number 2)
    // LB matches should NEVER have null opponents (which triggers hasBye())
    // because LB empty slots are TBD, not BYEs
    const isLB = this.isLosersBracket(data.group_id);

    // Re-inflate opponent1 with position from cache
    if ('opponent1_id' in data || 'opponent1_score' in data || 'opponent1_result' in data) {
      const opponentId = data.opponent1_id;

      // Empty slot detection: no participant, no score, no result
      const isEmpty = opponentId == null && !data.opponent1_score && !data.opponent1_result;

      if (isEmpty) {
        // LB matches: return TBD object so hasBye() returns false, preventing auto-completion
        // WB/GF matches: return null so hasBye() returns true, allowing BYE handling
        transformed.opponent1 = isLB ? { id: null, score: null, result: null } : null;
      } else {
        const cached = opponentId ? this.participantCache.get(opponentId) : null;
        transformed.opponent1 = {
          id: opponentId ?? null,
          position: cached?.position ?? undefined,
          score: data.opponent1_score ?? null,
          result: (data.opponent1_result as BmOpponentSlot['result']) ?? null,
        };
      }
      delete transformed.opponent1_id;
      delete transformed.opponent1_score;
      delete transformed.opponent1_result;
    }

    // Re-inflate opponent2 with position from cache
    if ('opponent2_id' in data || 'opponent2_score' in data || 'opponent2_result' in data) {
      const opponentId = data.opponent2_id;

      // Empty slot detection: no participant, no score, no result
      const isEmpty = opponentId == null && !data.opponent2_score && !data.opponent2_result;

      if (isEmpty) {
        // LB matches: return TBD object so hasBye() returns false, preventing auto-completion
        // WB/GF matches: return null so hasBye() returns true, allowing BYE handling
        transformed.opponent2 = isLB ? { id: null, score: null, result: null } : null;
      } else {
        const cached = opponentId ? this.participantCache.get(opponentId) : null;
        transformed.opponent2 = {
          id: opponentId ?? null,
          position: cached?.position ?? undefined,
          score: data.opponent2_score ?? null,
          result: (data.opponent2_result as BmOpponentSlot['result']) ?? null,
        };
      }
      delete transformed.opponent2_id;
      delete transformed.opponent2_score;
      delete transformed.opponent2_result;
    }

    return transformed;
  }

  /**
   * Transform data for database storage based on table type
   */
  private transformDataForDb<T extends keyof DataTypes>(
    table: T,
    data: Partial<DataTypes[T]>
  ): Partial<DataTypes[T]> | DbMatch {
    if (table === 'match') {
      return this.transformMatchToDb(data as unknown as BmMatch);
    }
    return data;
  }

  // Select overloads
  async select<T extends keyof DataTypes>(table: T): Promise<DataTypes[T][]>;
  async select<T extends keyof DataTypes>(table: T, id: Id): Promise<DataTypes[T] | null>;
  async select<T extends keyof DataTypes>(
    table: T,
    filter: Partial<DataTypes[T]>
  ): Promise<DataTypes[T][]>;

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
      this.transformDataForDb(table, item as Partial<DataTypes[T]>)
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
      return insertedData && insertedData[0] ? insertedData[0].id : 0;
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
    let transformedValues = this.transformDataForDb(table, values);

    bracketLog(`Update ${table}`, { filter });

    // ⭐ DEFENSIVE MERGE: Prevent null from overwriting filled opponent slots
    if (table === 'match' && ('opponent1' in values || 'opponent2' in values)) {
      const matchId =
        typeof filter === 'number' || typeof filter === 'string'
          ? filter
          : (filter as { id?: Id }).id;
      const { data: currentMatch } = await client
        .from('match')
        .select(
          'id, opponent1_id, opponent2_id, opponent1_result, opponent2_result, round_id, group_id, number, status'
        )
        .eq('id', matchId as number)
        .single();

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
