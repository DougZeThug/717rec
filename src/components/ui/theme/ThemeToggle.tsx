import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useEnabledThemeKeys } from '@/hooks/useThemeSettings';
import { SnowflakeSparkle } from '@/icons';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const themeOrder = ['light', 'dark', 'winter-frozen'] as const;

/** Button that cycles the app theme: light, dark, winter-frozen. */
const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  variant = 'outline',
  size = 'icon',
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { enabledKeys, isLoading } = useEnabledThemeKeys();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount detection for SSR-safe icon swap
    setMounted(true);
  }, []);

  // Filter to only enabled themes, excluding 'system'
  // eslint-disable-next-line react-hooks/exhaustive-deps -- enabledThemes stable within hook scope
  const enabledThemes =
    enabledKeys.length > 0 ? themeOrder.filter((t) => enabledKeys.includes(t)) : ['light', 'dark'];

  // Auto-switch if current theme is disabled
  useEffect(() => {
    if (!isLoading && enabledThemes.length > 0 && theme && !enabledThemes.includes(theme)) {
      setTheme('dark');
    }
  }, [enabledThemes, isLoading, theme, setTheme]);

  const cycleTheme = useCallback(() => {
    const currentIndex = enabledThemes.indexOf(theme ?? 'dark');
    /** Wraps around to the first enabled theme after the last one. */
    const nextIndex = (currentIndex + 1) % enabledThemes.length;
    const next = enabledThemes[nextIndex];
    setTheme(next);
    localStorage.setItem('theme', next);
  }, [enabledThemes, theme, setTheme]);

  if (!mounted) {
    return null;
  }

  /** Picks the button icon — snowflake, moon, or sun — to match the active theme. */
  const getCurrentIcon = () => {
    if (theme === 'winter-frozen') {
      return (
        <SnowflakeSparkle
          size={20}
          className="text-cyan-400 drop-shadow-[0_0_4px_hsla(199,90%,70%,0.6)]"
        />
      );
    }
    if (resolvedTheme === 'dark' || theme === 'dark') {
      return <Moon className="size-5" />;
    }
    return <Sun className="size-5" />;
  };

  /** Returns frosty glow styling for winter-frozen, plain neutral styling otherwise. */
  const getButtonClasses = () => {
    if (theme === 'winter-frozen') {
      return [
        'theme-toggle-winter',
        'bg-[hsla(222,35%,15%,0.9)]',
        'border-[hsla(199,70%,55%,0.5)]',
        'shadow-[inset_0_1px_0_hsla(199,80%,80%,0.15),0_0_12px_hsla(199,80%,60%,0.2)]',
        'hover:shadow-[inset_0_1px_0_hsla(199,80%,80%,0.2),0_0_20px_hsla(199,80%,60%,0.35)]',
        'hover:border-[hsla(199,70%,65%,0.6)]',
      ].join(' ');
    }
    return 'text-foreground hover:bg-muted border-border';
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn('rounded-full transition-all duration-300', getButtonClasses(), className)}
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={cycleTheme}
    >
      {getCurrentIcon()}
    </Button>
  );
};

export default ThemeToggle;
