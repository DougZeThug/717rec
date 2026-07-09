import React from 'react';

import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

interface StatBlockProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
  icon?: React.ReactNode;
  gradient?: string;
}

export const StatBlock: React.FC<StatBlockProps> = ({
  label,
  value,
  className = '',
  orientation = 'vertical',
  icon,
  gradient,
}) => {
  const { isWinterTheme } = useSeasonalThemeBase();

  // Get gradient based on variant
  const getGradient = () => {
    if (gradient) return gradient;

    // Winter theme: Use dark ice-glass gradients
    if (isWinterTheme) {
      return 'bg-gradient-to-br from-[hsl(222,30%,18%)] via-[hsl(222,35%,15%)] to-[hsl(222,40%,12%)]';
    }

    return 'bg-gradient-to-br from-white via-blue-50/20 to-orange-50/30 dark:from-gray-800/80 dark:to-gray-900/80';
  };

  const baseClasses = cn(
    getGradient(),
    'p-3 sm:p-4 rounded-lg text-left transition-all duration-200 hover:shadow-md border',
    isWinterTheme
      ? 'border-[hsl(199,60%,50%,0.3)]'
      : 'border-gray-200 dark:border-gray-700/50'
  );

  const labelClasses = cn(
    'font-inter uppercase text-[10px] sm:text-xs tracking-widest',
    isWinterTheme ? 'text-[hsl(210,20%,65%)]' : 'text-gray-600 dark:text-gray-400'
  );

  // Apply gradient to the value text based on variant
  const valueClasses = cn(
    'font-mono text-base sm:text-lg font-medium',
    isWinterTheme ? 'text-[hsl(210,40%,96%)]' : 'text-gray-800 dark:text-white'
  );

  if (orientation === 'horizontal') {
    return (
      <div className={`${baseClasses} flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {icon && (
            <span className="text-muted-foreground dark:text-muted-foreground [&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">
              {icon}
            </span>
          )}
          <span className={labelClasses}>{label}</span>
        </div>
        <span className={valueClasses}>{value}</span>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} flex flex-col ${className}`}>
      <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-1.5">
        {icon && (
          <span className="text-muted-foreground dark:text-muted-foreground [&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">
            {icon}
          </span>
        )}
        <span className={labelClasses}>{label}</span>
      </div>
      <div className={`${valueClasses} text-center text-lg sm:text-xl`}>{value}</div>
    </div>
  );
};
