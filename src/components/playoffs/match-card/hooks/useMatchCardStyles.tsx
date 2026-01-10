import { useTheme } from 'next-themes';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';

export const useMatchCardStyles = (
  matchType: string,
  onEditMatch: ((matchId: string) => void) | undefined,
  isUpdated: boolean,
  isPlayIn: boolean,
  isResetMatch: boolean,
  round: number
) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const getCardStyle = () => {
    switch (matchType) {
      case 'winners':
        return 'border-blue-300 dark:border-blue-800 shadow-blue-900/5 dark:shadow-blue-500/5';
      case 'losers':
        return 'border-amber-300 dark:border-amber-800 shadow-amber-900/5 dark:shadow-amber-500/5';
      case 'finals':
        return 'border-purple-300 dark:border-purple-800 shadow-purple-900/5 dark:shadow-purple-500/5';
      case 'play-in':
      case 'play-in-2':
        return 'border-teal-300 dark:border-teal-800 shadow-teal-900/5 dark:shadow-teal-500/5';
      default:
        return 'border-gray-300 dark:border-gray-700';
    }
  };

  return useMemo(() => {
    const cardBaseClasses = cn(
      'w-64 transition-shadow',
      getCardStyle(),
      onEditMatch ? 'cursor-pointer hover:shadow-md transition-shadow' : '',
      isUpdated && !isPlayIn && 'animate-pulse'
    );

    const cardClasses = cn(
      cardBaseClasses,
      isLight
        ? 'border hover:border-gray-300 shadow-sm'
        : 'border hover:border-gray-700 bg-gray-900/50 shadow-md',
      isPlayIn && 'border-l-4 border-l-teal-500',
      isResetMatch && 'border-l-4 border-l-amber-500',
      matchType === 'finals' && round === 1 && 'border-l-4 border-l-purple-500',
      matchType === 'winners' && 'border-l-4 border-l-blue-500',
      matchType === 'losers' && 'border-l-4 border-l-amber-500'
    );

    return {
      cardClasses,
    };
  }, [matchType, onEditMatch, isUpdated, isPlayIn, isResetMatch, round, isLight]);
};
