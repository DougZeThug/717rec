import { LucideIcon } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  activeClassName?: string;
}

export interface ToggleButtonGroupProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: 'pills' | 'segmented';
  className?: string;
}

export function ToggleButtonGroup<T extends string>({
  options,
  value,
  onChange,
  variant = 'pills',
  className,
}: ToggleButtonGroupProps<T>) {
  if (variant === 'segmented') {
    return (
      <div className={cn('inline-flex rounded-lg bg-muted p-0.5 shadow-sm', className)}>
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = value === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-all',
                Icon && 'flex items-center gap-1.5',
                isActive
                  ? option.activeClassName || 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted-foreground/10'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Pills variant (default)
  return (
    <div className={cn('flex gap-2', className)}>
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors',
              'flex items-center justify-center gap-1.5',
              isActive
                ? option.activeClassName || 'bg-primary/10 text-primary dark:bg-primary/20'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default ToggleButtonGroup;
