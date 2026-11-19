import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
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

  /**
   * Turn one theme on or off in the theme picker.
   * @throws {DatabaseError} When the database operation fails
   * @throws {BusinessLogicError} When no row was updated (admin access was
   *   removed, so row-level security filtered it out without an error)
   */
  updateEnabled: async (themeKey: string, isEnabled: boolean): Promise<void> => {
    const { data: updated, error } = await supabase
      .from('theme_settings')
      .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
      .eq('theme_key', themeKey)
      .select('id')
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to update theme setting');
    if (!updated) {
      throw new BusinessLogicError(
        'Nothing was saved. Your admin access may have changed. Refresh the page and try again.'
      );
    }
  },
};
