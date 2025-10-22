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

    const { error } = await supabase
      .from('brackets')
      .update({ 
        bracket_data: this.data as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.bracketId);

    if (error) throw error;
    
    console.log('✅ Saved bracket state to JSONB');
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
