import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

export interface ThemeSetting {
  id: string;
  theme_key: string;
  label: string;
  is_enabled: boolean;
  sort_order: number;
  updated_at: string;
}

export const ThemeSettingsService = {
  fetchAll: async (): Promise<ThemeSetting[]> => {
    const { data, error } = await supabase
      .from('theme_settings')
      .select('id, theme_key, label, is_enabled, sort_order, updated_at')
      .order('sort_order');

    if (error) handleDatabaseError(error, 'Failed to fetch theme settings');
    return (data as ThemeSetting[]) ?? [];
  },

  updateEnabled: async (themeKey: string, isEnabled: boolean): Promise<void> => {
    const { error } = await supabase
      .from('theme_settings')
      .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
      .eq('theme_key', themeKey);

    if (error) handleDatabaseError(error, 'Failed to update theme setting');
  },
};
