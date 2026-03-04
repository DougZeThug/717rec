import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

export interface BlindDrawSettings {
  id: string;
  signup_confirmation_message: string;
  created_at: string;
  updated_at: string;
}

export interface BlindDrawSignup {
  id: string;
  event_date: string;
  first_name: string;
  last_initial: string;
  created_at: string;
}

export const BlindDrawService = {
  fetchBlindDrawSettings: async (): Promise<BlindDrawSettings> => {
    const { data, error } = await supabase
      .from('blind_draw_settings')
      .select('id, signup_confirmation_message, created_at, updated_at')
      .limit(1)
      .single();
    if (error) handleDatabaseError(error, 'Failed to fetch blind draw settings');
    return data as BlindDrawSettings;
  },

  updateBlindDrawSettings: async ({ id, message }: { id: string; message: string }): Promise<void> => {
    const { error } = await supabase
      .from('blind_draw_settings')
      .update({ signup_confirmation_message: message })
      .eq('id', id);
    if (error) handleDatabaseError(error, 'Failed to update blind draw settings');
  },

  fetchBlindDrawSignupCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('blind_draw_signups')
      .select('id', { count: 'exact', head: true });
    if (error) handleDatabaseError(error, 'Failed to fetch blind draw signup count');
    return count ?? 0;
  },

  fetchBlindDrawSignups: async (eventDate?: string): Promise<BlindDrawSignup[]> => {
    let query = supabase
      .from('blind_draw_signups')
      .select('id, event_date, first_name, last_initial, created_at')
      .order('created_at', { ascending: true });

    if (eventDate) {
      query = query.eq('event_date', eventDate);
    }

    const { data, error } = await query;
    if (error) handleDatabaseError(error, 'Failed to fetch blind draw signups');
    return data as BlindDrawSignup[];
  },

  createSignup: async ({
    eventDate,
    firstName,
    lastInitial,
  }: {
    eventDate: string;
    firstName: string;
    lastInitial: string;
  }): Promise<void> => {
    const { error } = await supabase.from('blind_draw_signups').insert({
      event_date: eventDate,
      first_name: firstName.trim(),
      last_initial: lastInitial.trim().toUpperCase(),
    });
    if (error) handleDatabaseError(error, 'Failed to create blind draw signup');
  },

  deleteSignup: async (id: string): Promise<void> => {
    const { error } = await supabase.from('blind_draw_signups').delete().eq('id', id);
    if (error) handleDatabaseError(error, 'Failed to delete blind draw signup');
  },

  clearSignups: async (): Promise<void> => {
    const { error } = await supabase
      .from('blind_draw_signups')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) handleDatabaseError(error, 'Failed to clear blind draw signups');
  },
};
