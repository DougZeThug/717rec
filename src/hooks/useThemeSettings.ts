import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ThemeSettingsService } from '@/services/ThemeSettingsService';

const THEME_SETTINGS_KEY = ['theme-settings'];

export const useThemeSettings = () => {
  return useQuery({
    queryKey: THEME_SETTINGS_KEY,
    queryFn: ThemeSettingsService.fetchAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useEnabledThemeKeys = () => {
  const { data: settings, isLoading } = useThemeSettings();
  const enabledKeys = settings?.filter((s) => s.is_enabled).map((s) => s.theme_key) ?? [];
  return { enabledKeys, isLoading };
};

export const useUpdateThemeSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ themeKey, isEnabled }: { themeKey: string; isEnabled: boolean }) =>
      ThemeSettingsService.updateEnabled(themeKey, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THEME_SETTINGS_KEY });
    },
  });
};
