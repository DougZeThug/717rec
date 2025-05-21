
import { supabase } from "@/integrations/supabase/client";
import { DatabaseBracketState } from "../types/DatabaseTypes";

export class BracketRepository {
  async createBracket(params: {
    id: string;
    name: string;
    format: string;
    divisionId?: string;
  }): Promise<{ error?: Error }> {
    try {
      const { error } = await supabase
        .from('brackets')
        .insert({
          id: params.id,
          title: params.name,
          format: params.format,
          division_id: params.divisionId
        });
      
      if (error) return { error: new Error(error.message) };
      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  async getBracketState(bracketId: string): Promise<DatabaseBracketState> {
    try {
      const { data, error } = await supabase
        .from('brackets')
        .select('*')
        .eq('id', bracketId)
        .single();
      
      if (error) throw error;
      
      return {
        isWinnersBracketComplete: !!data.wb_champion_id,
        isLosersBracketComplete: false,
        isResetMatchNeeded: data.reset_match_needed || false,
        isComplete: data.state === 'completed',
        winnersBracketChampionId: data.wb_champion_id,
        losersBracketChampionId: null,
        championId: data.state === 'completed' ? data.wb_champion_id : null
      };
    } catch (error) {
      console.error('Error getting bracket state:', error);
      return {
        isWinnersBracketComplete: false,
        isLosersBracketComplete: false,
        isResetMatchNeeded: false,
        isComplete: false,
        winnersBracketChampionId: null,
        losersBracketChampionId: null,
        championId: null
      };
    }
  }

  async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')
        .update({ wb_champion_id: teamId })
        .eq('id', bracketId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking winners bracket champion:', error);
      throw error;
    }
  }

  async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')
        .update({ reset_match_needed: needed })
        .eq('id', bracketId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error setting reset match needed:', error);
      throw error;
    }
  }

  async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')
        .update({
          state: 'completed',
          wb_champion_id: championId
        })
        .eq('id', bracketId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking tournament complete:', error);
      throw error;
    }
  }
}
