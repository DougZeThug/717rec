import { InMemoryDatabase } from "brackets-memory-db";
import { supabase } from "@/integrations/supabase/client";

/**
 * Supabase Storage Adapter for brackets-manager
 * Provides bidirectional sync between in-memory storage and Supabase
 */
export class SupabaseStorage extends InMemoryDatabase {
  private teamNameToIdMap: Map<string, string> = new Map();
  private teamIdToNameMap: Map<string, string> = new Map();

  constructor() {
    super();
  }

  /**
   * Clear all in-memory storage
   * MUST be called before creating a new bracket to avoid data contamination
   */
  public reset(): void {
    // Clear all in-memory data tables
    this.data = {
      stage: [],
      group: [],
      round: [],
      match: [],
      match_game: [],
      participant: []
    };
    
    // Clear team mappings
    this.teamNameToIdMap.clear();
    this.teamIdToNameMap.clear();
  }

  /**
   * Load all matches for a bracket from Supabase into memory
   */
  async loadFromSupabase(bracketId: string): Promise<void> {
    const { data: matches, error } = await supabase
      .from('playoff_matches')
      .select(`
        *,
        team1:teams!playoff_matches_team1_id_fkey(id, name),
        team2:teams!playoff_matches_team2_id_fkey(id, name)
      `)
      .eq('bracket_id', bracketId)
      .order('round', { ascending: true })
      .order('position', { ascending: true });

    if (error) throw error;
    if (!matches) return;

    // Build team mapping
    matches.forEach((match: any) => {
      if (match.team1) {
        this.teamIdToNameMap.set(match.team1.id, match.team1.name);
        this.teamNameToIdMap.set(match.team1.name, match.team1.id);
      }
      if (match.team2) {
        this.teamIdToNameMap.set(match.team2.id, match.team2.name);
        this.teamNameToIdMap.set(match.team2.name, match.team2.id);
      }
    });

    // Convert Supabase matches to brackets-manager format
    const memoryMatches = matches.map((match: any) => ({
      id: match.position,
      stage_id: 0,
      group_id: this.getGroupIdFromMatchType(match.match_type),
      round_id: match.round,
      number: match.position,
      child_count: 0,
      opponent1: match.team1_id ? {
        id: match.team1_seed || match.position * 2 - 1,
        position: match.team1_seed,
        score: match.team1_score,
        result: match.winner_id === match.team1_id ? 'win' : match.winner_id ? 'loss' : undefined
      } : null,
      opponent2: match.team2_id ? {
        id: match.team2_seed || match.position * 2,
        position: match.team2_seed,
        score: match.team2_score,
        result: match.winner_id === match.team2_id ? 'win' : match.winner_id ? 'loss' : undefined
      } : null,
      status: match.status === 'completed' ? 3 : match.status === 'in_progress' ? 2 : 1
    }));

    // Clear and repopulate in-memory storage
    this.data.match = memoryMatches as any;
  }

  /**
   * Sync all in-memory changes back to Supabase
   */
  async syncToSupabase(bracketId: string): Promise<void> {
    const memoryMatches = await this.select('match') as any[];

    for (const match of memoryMatches) {
      const team1Name = match.opponent1?.id ? this.getTeamNameBySeed(match.opponent1.id) : null;
      const team2Name = match.opponent2?.id ? this.getTeamNameBySeed(match.opponent2.id) : null;
      
      const team1Id = team1Name ? this.teamNameToIdMap.get(team1Name) : null;
      const team2Id = team2Name ? this.teamNameToIdMap.get(team2Name) : null;

      let winnerId = null;
      let loserId = null;

      if (match.opponent1?.result === 'win') {
        winnerId = team1Id;
        loserId = team2Id;
      } else if (match.opponent2?.result === 'win') {
        winnerId = team2Id;
        loserId = team1Id;
      }

      await supabase
        .from('playoff_matches')
        .update({
          team1_id: team1Id,
          team2_id: team2Id,
          team1_score: match.opponent1?.score || null,
          team2_score: match.opponent2?.score || null,
          winner_id: winnerId,
          loser_id: loserId,
          status: match.status === 3 ? 'completed' : match.status === 2 ? 'in_progress' : 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('bracket_id', bracketId)
        .eq('position', match.number);
    }
  }

  private getGroupIdFromMatchType(matchType: string): number {
    switch (matchType) {
      case 'winners': return 1;
      case 'losers': return 2;
      case 'finals': return 3;
      default: return 1;
    }
  }

  private getTeamNameBySeed(seedId: number): string | null {
    // This is a simplified lookup - in production, you'd maintain a seed-to-name mapping
    for (const [name] of this.teamNameToIdMap) {
      return name;
    }
    return null;
  }
}
