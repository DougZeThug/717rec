import { Calendar, Flower2, Leaf, LucideIcon, Snowflake, Sun } from 'lucide-react';
import { useMemo } from 'react';

import { useActiveSeason } from '@/hooks/useSeasons';

interface SeasonWeekInfo {
  seasonName: string;
  weekNumber: number | null;
  seasonIcon: LucideIcon;
  isLoading: boolean;
}

/**
 * Hook to calculate the current week of the active season
 * and determine the appropriate seasonal icon
 */
export const useSeasonWeek = (): SeasonWeekInfo => {
  const { data: season, isLoading } = useActiveSeason();

  return useMemo(() => {
    if (!season) {
      return {
        seasonName: '',
        weekNumber: null,
        seasonIcon: Calendar,
        isLoading,
      };
    }

    // Calculate week number from season start date
    const startDate = new Date(season.start_date);
    const now = new Date();
    const diffTime = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let weekNumber: number | null = null;
    if (diffDays >= 0) {
      weekNumber = Math.floor(diffDays / 7) + 1;
    }

    // Determine season icon based on season name
    const seasonNameLower = season.name.toLowerCase();
    let seasonIcon: LucideIcon = Calendar;

    if (seasonNameLower.includes('winter')) {
      seasonIcon = Snowflake;
    } else if (seasonNameLower.includes('spring')) {
      seasonIcon = Flower2;
    } else if (seasonNameLower.includes('summer')) {
      seasonIcon = Sun;
    } else if (seasonNameLower.includes('fall') || seasonNameLower.includes('autumn')) {
      seasonIcon = Leaf;
    }

    return {
      seasonName: season.name,
      weekNumber,
      seasonIcon,
      isLoading,
    };
  }, [season, isLoading]);
};
