import { Monitor, Moon, Sun } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useThemeSettings, useUpdateThemeSetting } from '@/hooks/useThemeSettings';
import { SnowflakeSparkle } from '@/icons';
import { cn } from '@/lib/utils';

const themeIcons: Record<string, React.ElementType> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
  'winter-frozen': SnowflakeSparkle,
};

const ThemeManagementTab: React.FC = () => {
  const { data: settings, isLoading } = useThemeSettings();
  const updateMutation = useUpdateThemeSetting();

  const handleToggle = (themeKey: string, currentEnabled: boolean) => {
    // Prevent disabling all themes
    const enabledCount = settings?.filter((s) => s.is_enabled).length ?? 0;
    if (currentEnabled && enabledCount <= 1) {
      toast.error('At least one theme must remain enabled');
      return;
    }

    updateMutation.mutate(
      { themeKey, isEnabled: !currentEnabled },
      {
        onSuccess: () => {
          toast.success(`Theme ${!currentEnabled ? 'enabled' : 'disabled'}`);
        },
        onError: () => {
          toast.error('Failed to update theme setting');
        },
      }
    );
  };

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading theme settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Management</CardTitle>
        <CardDescription>
          Control which themes are available to users in the theme picker.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings?.map((setting) => {
          const Icon = themeIcons[setting.theme_key] ?? Sun;
          return (
            <div
              key={setting.id}
              className={cn(
                'flex items-center justify-between p-4 rounded-lg border border-border',
                setting.is_enabled ? 'bg-card' : 'bg-muted/50 opacity-75'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'h-5 w-5',
                    setting.theme_key === 'winter-frozen' && 'text-cyan-500'
                  )}
                />
                <div>
                  <p className="font-medium text-sm">{setting.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {setting.is_enabled ? 'Visible to users' : 'Hidden from users'}
                  </p>
                </div>
              </div>
              <Switch
                checked={setting.is_enabled}
                onCheckedChange={() => handleToggle(setting.theme_key, setting.is_enabled)}
                disabled={updateMutation.isPending}
                aria-label={`Toggle ${setting.label} theme`}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ThemeManagementTab;
