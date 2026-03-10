import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEnabledThemeKeys } from '@/hooks/useThemeSettings';
import { SnowflakeSparkle } from '@/icons';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const allThemeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'winter-frozen', label: 'Winter', icon: SnowflakeSparkle },
] as const;

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  variant = 'outline',
  size = 'icon',
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { enabledKeys, isLoading } = useEnabledThemeKeys();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-switch if current theme is disabled
  useEffect(() => {
    if (!isLoading && enabledKeys.length > 0 && theme && !enabledKeys.includes(theme)) {
      setTheme(enabledKeys[0]);
    }
  }, [enabledKeys, isLoading, theme, setTheme]);

  if (!mounted) {
    return null;
  }

  const themeOptions = enabledKeys.length > 0
    ? allThemeOptions.filter((opt) => enabledKeys.includes(opt.value))
    : allThemeOptions.filter((opt) => opt.value !== 'winter-frozen'); // fallback

  const getCurrentIcon = () => {
    if (theme === 'winter-frozen') {
      return <SnowflakeSparkle size={20} className="text-cyan-400" />;
    }
    if (resolvedTheme === 'dark') {
      return <Moon className="h-5 w-5" />;
    }
    return <Sun className="h-5 w-5" />;
  };

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

  const getIconClasses = () => {
    if (theme === 'winter-frozen') {
      return 'h-5 w-5 text-cyan-400 drop-shadow-[0_0_4px_hsla(199,90%,70%,0.6)]';
    }
    return 'h-5 w-5';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('rounded-full transition-all duration-300', getButtonClasses(), className)}
          aria-label="Select theme"
          title="Select theme"
        >
          {theme === 'winter-frozen' ? (
            <SnowflakeSparkle size={20} className={getIconClasses()} />
          ) : (
            getCurrentIcon()
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => {
              setTheme(value);
              localStorage.setItem('theme', value);
            }}
            className={cn('flex items-center gap-2 cursor-pointer', theme === value && 'bg-accent')}
          >
            <Icon className={cn('h-4 w-4', value === 'winter-frozen' && 'text-cyan-500')} />
            <span>{label}</span>
            {value === 'winter-frozen' && (
              <span className="ml-auto text-[10px] text-cyan-500 font-medium">❄️</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
