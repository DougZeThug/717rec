import { InMemoryDatabase } from "brackets-memory-db";

/**
 * Supabase Storage Adapter for brackets-manager
 * Currently uses in-memory storage with future Supabase persistence planned
 * 
 * Phase 1: In-memory only (this implementation)
 * Phase 2: Sync to Supabase after operations
 * Phase 3: Direct Supabase storage
 */
export class SupabaseStorage extends InMemoryDatabase {
  constructor() {
    super();
  }

  // Future: Add Supabase sync methods here
  // async syncToSupabase(bracketId: string) { ... }
  // async loadFromSupabase(bracketId: string) { ... }
}
