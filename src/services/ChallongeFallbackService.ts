import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';

export type ChallongeFallbackConfig = Tables<'challonge_fallback_config'>;
export type ChallongeFallbackBracket = Tables<'challonge_fallback_brackets'>;

export type ChallongeFallbackBracketInput = {
  title: string;
  slug: string;
  sort_order: number;
};

export const ChallongeFallbackService = {
  fetchConfig: async (): Promise<ChallongeFallbackConfig> => {
    const { data, error } = await supabase
      .from('challonge_fallback_config')
      .select('id, enabled, header_title, header_subtitle, created_at, updated_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) handleDatabaseError(error, 'Failed to fetch Challonge fallback config');
    return ensureFound(data, 'ChallongeFallbackConfig', 'singleton');
  },

  updateConfig: async (input: {
    id: string;
    enabled?: boolean;
    header_title?: string;
    header_subtitle?: string;
  }): Promise<ChallongeFallbackConfig> => {
    const { id, ...patch } = input;
    const { data, error } = await supabase
      .from('challonge_fallback_config')
      .update(patch)
      .eq('id', id)
      .select('id, enabled, header_title, header_subtitle, created_at, updated_at')
      .maybeSingle();
    if (error) handleDatabaseError(error, 'Failed to update Challonge fallback config');
    return ensureFound(data, 'ChallongeFallbackConfig', id);
  },

  fetchBrackets: async (): Promise<ChallongeFallbackBracket[]> => {
    const { data, error } = await supabase
      .from('challonge_fallback_brackets')
      .select('id, title, slug, sort_order, created_at, updated_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) handleDatabaseError(error, 'Failed to fetch Challonge fallback brackets');
    return data ?? [];
  },

  createBracket: async (
    input: ChallongeFallbackBracketInput
  ): Promise<ChallongeFallbackBracket> => {
    const { data, error } = await supabase
      .from('challonge_fallback_brackets')
      .insert(input)
      .select('id, title, slug, sort_order, created_at, updated_at')
      .maybeSingle();
    if (error) handleDatabaseError(error, 'Failed to create Challonge fallback bracket');
    return ensureFound(data, 'ChallongeFallbackBracket', 'new');
  },

  updateBracket: async (
    input: { id: string } & Partial<ChallongeFallbackBracketInput>
  ): Promise<ChallongeFallbackBracket> => {
    const { id, ...patch } = input;
    const { data, error } = await supabase
      .from('challonge_fallback_brackets')
      .update(patch)
      .eq('id', id)
      .select('id, title, slug, sort_order, created_at, updated_at')
      .maybeSingle();
    if (error) handleDatabaseError(error, 'Failed to update Challonge fallback bracket');
    return ensureFound(data, 'ChallongeFallbackBracket', id);
  },

  deleteBracket: async (id: string): Promise<void> => {
    const { error } = await supabase.from('challonge_fallback_brackets').delete().eq('id', id);
    if (error) handleDatabaseError(error, 'Failed to delete Challonge fallback bracket');
  },
};
