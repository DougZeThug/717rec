import { InMemoryDatabase } from "brackets-memory-db";
import { supabase } from "@/integrations/supabase/client";

/**
 * JSONB Storage Adapter for brackets-manager
 * Stores the entire in-memory database as JSONB in the brackets table
 * This eliminates transformation bugs and preserves bracket structure natively
 */
export class JsonbSupabaseStorage extends InMemoryDatabase {
  private bracketId: string | null = null;

  constructor() {
    super();
  }

  /**
   * Load bracket state from JSONB column
   */
  async load(bracketId: string): Promise<void> {
    this.bracketId = bracketId;
    
    const { data, error } = await supabase
      .from('brackets')
      .select('bracket_data')
      .eq('id', bracketId)
      .single();

    if (error) throw error;
    
    if (data?.bracket_data) {
      // Restore entire in-memory database from JSONB
      this.data = data.bracket_data as any;
      console.log('✅ Loaded bracket state from JSONB:', {
        stages: this.data.stage?.length,
        groups: this.data.group?.length,
        rounds: this.data.round?.length,
        matches: this.data.match?.length,
        participants: this.data.participant?.length
      });
    }
  }

  /**
   * Save bracket state to JSONB column
   */
  async save(): Promise<void> {
    if (!this.bracketId) throw new Error('No bracket ID set');

    // Log what we're trying to save
    console.log('🔍 Attempting to save bracket state:', {
      bracketId: this.bracketId,
      dataKeys: Object.keys(this.data),
      stageCount: this.data.stage?.length,
      matchCount: this.data.match?.length,
      participantCount: this.data.participant?.length,
      dataSize: JSON.stringify(this.data).length
    });

    // Verify JSON serializability
    try {
      const serialized = JSON.stringify(this.data);
      JSON.parse(serialized);
      console.log('✅ Data is JSON-serializable');
    } catch (jsonError) {
      console.error('🔴 Data is NOT JSON-serializable:', jsonError);
      throw new Error(`Bracket data cannot be serialized to JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
    }

    try {
      const { data, error } = await supabase
        .from('brackets')
        .update({ 
          bracket_data: this.data as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.bracketId)
        .select();

      if (error) {
        console.error('🔴 Supabase update error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Failed to save bracket data to Supabase: ${error.message} (code: ${error.code})`);
      }

      if (!data || data.length === 0) {
        throw new Error(`No rows updated - bracket ${this.bracketId} may not exist`);
      }
      
      console.log('✅ Saved bracket state to JSONB');
    } catch (error) {
      console.error('🔴 Exception during save:', error);
      throw error;
    }
  }

  /**
   * Set bracket ID for save operations
   */
  setBracketId(bracketId: string): void {
    this.bracketId = bracketId;
  }

  /**
   * Reset for new bracket creation
   */
  reset(): void {
    super.reset();
    this.bracketId = null;
  }
}
