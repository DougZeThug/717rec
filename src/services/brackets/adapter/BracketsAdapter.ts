import { Storage } from 'brackets-manager';
import { supabase } from "@/integrations/supabase/client";

/**
 * Adapter to connect Supabase with the brackets-manager library
 * Implements the Storage interface required by brackets-manager
 */
export class BracketsAdapter implements Storage {
  // ---- participants ----
  async insertParticipants(participants: any[]) {
    // Map participants to our team format if needed
    const { error } = await supabase.from('teams').insert(participants);
    if (error) throw error;
  }
  
  async selectParticipants(filter?: Record<string, any>) {
    const query = supabase.from('teams').select();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query.eq(key, value);
      });
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  // ---- matches ----
  async insertMatches(matches: any[]) {
    // Batch insert to keep rows ≤ 50
    for (let i = 0; i < matches.length; i += 50) {
      const slice = matches.slice(i, i + 50);
      
      // Convert to our match format
      const matchesForDb = slice.map(this.convertMatchToDbFormat);
      
      const { error } = await supabase.from('matches').insert(matchesForDb);
      if (error) throw error;
    }
  }
  
  async selectMatches(filter?: Record<string, any>) {
    const query = supabase.from('matches').select();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query.eq(key, value);
      });
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Convert back to brackets-manager format
    return data ? data.map(this.convertMatchFromDbFormat) : [];
  }
  
  async updateMatch(id: string, match: any) {
    const matchForDb = this.convertMatchToDbFormat(match);
    const { error } = await supabase
      .from('matches')
      .update(matchForDb)
      .eq('id', id);
    
    if (error) throw error;
  }
  
  async deleteMatches(filter?: Record<string, any>) {
    const query = supabase.from('matches').delete();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query.eq(key, value);
      });
    }
    const { error } = await query;
    if (error) throw error;
  }
  
  // ---- stages ----
  async insertStage(stage: any) {
    const { error } = await supabase.from('brackets').insert({
      id: stage.id,
      title: stage.name,
      format: stage.type === 'double_elimination' ? 'Double Elimination' : 'Single Elimination',
      division_id: stage.divisionId || null
    });
    
    if (error) throw error;
  }
  
  async selectStages(filter?: Record<string, any>) {
    const query = supabase.from('brackets').select();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query.eq(key, value);
      });
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Convert our bracket to stage format
    return data?.map(bracket => ({
      id: bracket.id,
      name: bracket.title,
      type: bracket.format === 'Double Elimination' ? 'double_elimination' : 'single_elimination',
      divisionId: bracket.division_id
    })) || [];
  }
  
  // Required by the Storage interface
  async insert(table: string, data: any): Promise<void> {
    if (table === 'participants') {
      await this.insertParticipants([data]);
    } else if (table === 'matches') {
      await this.insertMatches([data]);
    } else if (table === 'stages') {
      await this.insertStage(data);
    } else {
      throw new Error(`Unsupported table: ${table}`);
    }
  }
  
  async select(table: string, filter?: Record<string, any>): Promise<any[]> {
    if (table === 'participants') {
      return this.selectParticipants(filter);
    } else if (table === 'matches') {
      return this.selectMatches(filter);
    } else if (table === 'stages') {
      return this.selectStages(filter);
    }
    return [];
  }
  
  async update(table: string, id: string, data: any): Promise<void> {
    if (table === 'matches') {
      await this.updateMatch(id, data);
    } else {
      throw new Error(`Unsupported table update: ${table}`);
    }
  }
  
  async delete(table: string, filter?: Record<string, any>): Promise<void> {
    if (table === 'matches') {
      await this.deleteMatches(filter);
    } else {
      throw new Error(`Unsupported table delete: ${table}`);
    }
  }
  
  // These are required by the Storage interface
  async selectFirst(): Promise<any> {
    throw new Error('Method not implemented');
  }
  
  async selectLast(): Promise<any> {
    throw new Error('Method not implemented');
  }
  
  // ---- conversion utilities ----
  private convertMatchToDbFormat(match: any) {
    return {
      id: match.id,
      bracket_id: match.stage_id,
      round_number: match.round,
      position: match.position,
      match_type: match.group.toLowerCase(),
      team1_id: match.opponent1?.id || null,
      team2_id: match.opponent2?.id || null,
      winner_id: match.opponent1?.result === 'win' 
        ? match.opponent1.id 
        : (match.opponent2?.result === 'win' ? match.opponent2.id : null),
      next_match_id: match.child_count > 0 ? match.child_match_id : null,
      next_loser_match_id: match.child_count > 1 ? match.child_match_id_loser : null,
      best_of: match.best_of || 3,
      metadata: {
        team1_seed: match.opponent1?.position || null,
        team2_seed: match.opponent2?.position || null
      }
    };
  }
  
  private convertMatchFromDbFormat(dbMatch: any) {
    return {
      id: dbMatch.id,
      stage_id: dbMatch.bracket_id,
      round: dbMatch.round_number,
      position: dbMatch.position,
      group: dbMatch.match_type.toUpperCase(),
      status: dbMatch.iscompleted ? 'completed' : 'pending',
      opponent1: dbMatch.team1_id ? {
        id: dbMatch.team1_id,
        position: dbMatch.metadata?.team1_seed || null,
        result: dbMatch.team1_id === dbMatch.winner_id ? 'win' : 
                (dbMatch.winner_id ? 'loss' : null)
      } : null,
      opponent2: dbMatch.team2_id ? {
        id: dbMatch.team2_id,
        position: dbMatch.metadata?.team2_seed || null,
        result: dbMatch.team2_id === dbMatch.winner_id ? 'win' : 
                (dbMatch.winner_id ? 'loss' : null)
      } : null,
      child_count: (dbMatch.next_match_id ? 1 : 0) + (dbMatch.next_loser_match_id ? 1 : 0),
      child_match_id: dbMatch.next_match_id,
      child_match_id_loser: dbMatch.next_loser_match_id,
      best_of: dbMatch.best_of
    };
  }
}
