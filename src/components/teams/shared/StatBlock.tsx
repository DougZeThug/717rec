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
  highlight?: boolean;
  variant?: 'default' | 'blue' | 'orange' | 'green' | 'amber';
}

export const StatBlock: React.FC<StatBlockProps> = ({
  label,
  value,
  className = '',
  orientation = 'vertical',
  icon,
  gradient,
  highlight = false,
  variant = 'default',
}) => {
  const { isWinterTheme, isDark } = useSeasonalThemeBase();

  // Get gradient based on variant
  const getGradient = () => {
    if (gradient) return gradient;

    // Winter theme: Use dark ice-glass gradients
    if (isWinterTheme) {
      return 'bg-gradient-to-br from-[hsl(222,30%,18%)] via-[hsl(222,35%,15%)] to-[hsl(222,40%,12%)]';
    }

    switch (variant) {
      case 'blue':
        return 'bg-gradient-to-br from-white via-blue-50/30 to-blue-50/50 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-blue-900/10';
      case 'orange':
        return 'bg-gradient-to-br from-white via-white to-orange-50/50 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-amber-900/10';
      case 'green':
        return 'bg-gradient-to-br from-white via-white to-green-50/50 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-green-900/10';
      case 'amber':
        return 'bg-gradient-to-br from-white via-white to-amber-50/50 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-amber-900/10';
      default:
        return 'bg-gradient-to-br from-white via-blue-50/20 to-orange-50/30 dark:from-gray-800/80 dark:to-gray-900/80';
    }
  };

  const baseClasses = cn(
    getGradient(),
    'p-2 sm:p-3 rounded-lg text-left transition-all duration-200 hover:shadow-md border',
    isWinterTheme
      ? 'border-[hsl(199,60%,50%,0.3)]'
      : highlight
        ? 'shadow-md border-blue-200 dark:border-blue-900/40'
        : 'border-gray-200 dark:border-gray-700/50'
  );

  const labelClasses = cn(
    'font-inter uppercase text-[10px] sm:text-xs tracking-widest',
    isWinterTheme ? 'text-[hsl(210,20%,65%)]' : 'text-gray-600 dark:text-gray-400'
  );

  // Apply gradient to the value text based on variant
  const valueClasses = cn(
    'font-mono text-sm sm:text-base font-medium',
    isWinterTheme
      ? 'text-[hsl(210,40%,96%)]'
      : highlight
        ? 'text-blue-700 dark:text-blue-300'
        : 'text-gray-800 dark:text-white'
  );

  if (orientation === 'horizontal') {
    return (
      <div className={`${baseClasses} flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {icon && (
            <span className="text-gray-600 dark:text-gray-300 [&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">
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
      <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
        {icon && (
          <span className="text-gray-600 dark:text-gray-300 [&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">
            {icon}
          </span>
        )}
        <span className={labelClasses}>{label}</span>
      </div>
      <div className={`${valueClasses} text-center text-base sm:text-lg`}>{value}</div>
    </div>
  );
};
