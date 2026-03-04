import { supabase } from '@/integrations/supabase/client';
import { HeroCard } from '@/types/heroCard';
import { handleDatabaseError } from '@/utils/errorHandler';

const HERO_CARD_SELECT =
  'id, slug, title, subtitle, body, cta_label, cta_url, background_color, text_color, accent_color, image_url, icon_name, is_visible, sort_order, target_type, target_id, card_type, metadata, created_at, updated_at';

interface TeamData {
  id: string;
  name: string;
  image_url: string | null;
}

interface TeamBasic {
  id: string;
  name: string;
}

export const HeroCardService = {
  fetchVisibleHeroCards: async (): Promise<HeroCard[]> => {
    const { data, error } = await supabase
      .from('hero_cards')
      .select(HERO_CARD_SELECT)
      .eq('is_visible', true)
      .order('sort_order', { ascending: true });

    if (error) handleDatabaseError(error, 'Failed to fetch hero cards');
    return (data ?? []) as HeroCard[];
  },

  fetchAllHeroCards: async (): Promise<HeroCard[]> => {
    const { data, error } = await supabase
      .from('hero_cards')
      .select(HERO_CARD_SELECT)
      .order('sort_order', { ascending: true });

    if (error) handleDatabaseError(error, 'Failed to fetch all hero cards');
    return (data ?? []) as HeroCard[];
  },

  fetchHeroCardById: async (id: string | null): Promise<HeroCard | null> => {
    if (!id) return null;
    const { data, error } = await supabase
      .from('hero_cards')
      .select(HERO_CARD_SELECT)
      .eq('id', id)
      .single();

    if (error) handleDatabaseError(error, 'Failed to fetch hero card');
    return data as HeroCard;
  },

  createHeroCard: async (formData: Omit<HeroCard, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('hero_cards')
      .insert([formData])
      .select()
      .single();

    if (error) handleDatabaseError(error, 'Failed to create hero card');
    return data;
  },

  updateHeroCard: async ({ id, ...formData }: Partial<HeroCard> & { id: string }) => {
    const { data, error } = await supabase
      .from('hero_cards')
      .update({ ...formData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) handleDatabaseError(error, 'Failed to update hero card');
    return data;
  },

  deleteHeroCard: async (id: string): Promise<void> => {
    const { error } = await supabase.from('hero_cards').delete().eq('id', id);

    if (error) handleDatabaseError(error, 'Failed to delete hero card');
  },

  toggleHeroCardVisibility: async ({
    id,
    is_visible,
  }: {
    id: string;
    is_visible: boolean;
  }): Promise<void> => {
    const { error } = await supabase
      .from('hero_cards')
      .update({ is_visible, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) handleDatabaseError(error, 'Failed to update hero card visibility');
  },

  fetchChampionTeams: async (championIds: string[]): Promise<TeamData[]> => {
    if (championIds.length === 0) return [];

    const { data, error } = await supabase
      .from('teams')
      .select('id, name, image_url')
      .in('id', championIds);

    if (error) handleDatabaseError(error, 'Failed to fetch champion teams');
    return (data ?? []) as TeamData[];
  },

  fetchTeamsForChampions: async (hiddenDivisionIds: string[]): Promise<TeamBasic[]> => {
    let query = supabase.from('teams').select('id, name').order('name');
    if (hiddenDivisionIds.length > 0) {
      for (const id of hiddenDivisionIds) {
        query = query.neq('division_id', id);
      }
    }
    const { data, error } = await query;

    if (error) handleDatabaseError(error, 'Failed to fetch teams for champions');
    return data || [];
  },
};
