import { supabase } from "@/integrations/supabase/client";
import type { Storage } from "brackets-manager";

/**
 * Supabase Storage Adapter for brackets-manager
 * Maps brackets-manager's numeric ID expectations to Supabase UUIDs
 */
export class SupabaseStorage implements Storage {
  private idMap = new Map<number, string>(); // numeric ID -> UUID
  private reverseIdMap = new Map<string, number>(); // UUID -> numeric ID
  private nextId = 1;

  /**
   * Get numeric ID for a UUID (create if doesn't exist)
   */
  private getNumericId(uuid: string): number {
    if (this.reverseIdMap.has(uuid)) {
      return this.reverseIdMap.get(uuid)!;
    }
    const numericId = this.nextId++;
    this.idMap.set(numericId, uuid);
    this.reverseIdMap.set(uuid, numericId);
    return numericId;
  }

  /**
   * Get UUID for a numeric ID
   */
  private getUuid(numericId: number): string | undefined {
    return this.idMap.get(numericId);
  }

  /**
   * Convert playoff_match to brackets-manager format
   */
  private toManagerFormat(match: any): any {
    return {
      id: this.getNumericId(match.id),
      stage_id: match.bracket_id ? this.getNumericId(match.bracket_id) : 0,
      group_id: this.getGroupId(match.match_type),
      round_id: match.round,
      number: match.position,
      opponent1: match.team1_id ? {
        id: this.getNumericId(match.team1_id),
        position: match.team1_seed,
        score: match.team1_score,
        result: match.winner_id === match.team1_id ? 'win' : (match.winner_id ? 'loss' : undefined)
      } : null,
      opponent2: match.team2_id ? {
        id: this.getNumericId(match.team2_id),
        position: match.team2_seed,
        score: match.team2_score,
        result: match.winner_id === match.team2_id ? 'win' : (match.winner_id ? 'loss' : undefined)
      } : null,
      status: match.status || 'pending'
    };
  }

  /**
   * Convert brackets-manager format to playoff_match
   */
  private fromManagerFormat(match: any, bracketId: string): any {
    return {
      bracket_id: bracketId,
      round: match.round_id,
      position: match.number,
      match_type: this.getMatchType(match.group_id),
      team1_id: match.opponent1?.id ? this.getUuid(match.opponent1.id) : null,
      team2_id: match.opponent2?.id ? this.getUuid(match.opponent2.id) : null,
      team1_seed: match.opponent1?.position || null,
      team2_seed: match.opponent2?.position || null,
      team1_score: match.opponent1?.score || null,
      team2_score: match.opponent2?.score || null,
      winner_id: match.opponent1?.result === 'win' ? this.getUuid(match.opponent1.id) :
                  (match.opponent2?.result === 'win' ? this.getUuid(match.opponent2.id) : null),
      loser_id: match.opponent1?.result === 'loss' ? this.getUuid(match.opponent1.id) :
                (match.opponent2?.result === 'loss' ? this.getUuid(match.opponent2.id) : null),
      status: match.status || 'pending',
      best_of: 3
    };
  }

  private getGroupId(matchType: string): number {
    switch (matchType) {
      case 'winners': return 1;
      case 'losers': return 2;
      case 'finals': return 3;
      default: return 1;
    }
  }

  private getMatchType(groupId: number): string {
    switch (groupId) {
      case 1: return 'winners';
      case 2: return 'losers';
      case 3: return 'finals';
      default: return 'winners';
    }
  }

  async select<T>(table: string, filter?: Partial<T>): Promise<T[] | null> {
    try {
      let query = supabase.from(table).select('*');

      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data, error } = await query;
      if (error) throw error;

      if (table === 'playoff_matches') {
        return data?.map(m => this.toManagerFormat(m)) as T[] || null;
      }

      return data as T[] || null;
    } catch (error) {
      console.error(`Storage select error on ${table}:`, error);
      throw error;
    }
  }

  async insert<T>(table: string, value: T): Promise<number> {
    try {
      if (table === 'playoff_matches') {
        const bracketId = (value as any).stage_id ? this.getUuid((value as any).stage_id) : '';
        const matchData = this.fromManagerFormat(value, bracketId);
        
        const { data, error } = await supabase
          .from('playoff_matches')
          .insert(matchData)
          .select()
          .single();

        if (error) throw error;
        return this.getNumericId(data.id);
      }

      const { data, error } = await supabase
        .from(table)
        .insert(value as any)
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error(`Storage insert error on ${table}:`, error);
      throw error;
    }
  }

  async update<T>(table: string, id: number, value: Partial<T>): Promise<number> {
    try {
      const uuid = this.getUuid(id);
      if (!uuid) throw new Error(`No UUID found for numeric ID ${id}`);

      if (table === 'playoff_matches') {
        const bracketId = (value as any).stage_id ? this.getUuid((value as any).stage_id) : '';
        const matchData = this.fromManagerFormat(value, bracketId);

        const { error } = await supabase
          .from('playoff_matches')
          .update(matchData)
          .eq('id', uuid);

        if (error) throw error;
        return 1;
      }

      const { error } = await supabase
        .from(table)
        .update(value as any)
        .eq('id', uuid);

      if (error) throw error;
      return 1;
    } catch (error) {
      console.error(`Storage update error on ${table}:`, error);
      throw error;
    }
  }

  async delete<T>(table: string, filter: Partial<T>): Promise<number> {
    try {
      let query = supabase.from(table).delete();

      Object.entries(filter).forEach(([key, value]) => {
        if (key === 'id' && typeof value === 'number') {
          const uuid = this.getUuid(value);
          if (uuid) {
            query = query.eq(key, uuid);
          }
        } else {
          query = query.eq(key, value);
        }
      });

      const { error } = await query;
      if (error) throw error;
      return 1;
    } catch (error) {
      console.error(`Storage delete error on ${table}:`, error);
      throw error;
    }
  }

  selectFirst: Storage['selectFirst'] = async (table, filter) => {
    const results = await this.select(table, filter);
    return results?.[0] || null;
  };

  selectLast: Storage['selectLast'] = async (table, filter) => {
    const results = await this.select(table, filter);
    return results?.[results.length - 1] || null;
  };
}
