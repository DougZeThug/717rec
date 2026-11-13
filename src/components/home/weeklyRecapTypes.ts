import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';
import type { TeamStreakInfo, WeeklyUpset } from '@/types/weeklyRecap';

export interface UpsetRowProps {
  upset: WeeklyUpset;
  winter: boolean;
}

export interface StreakRowProps {
  team: TeamStreakInfo;
  winter: boolean;
}

export interface MoverRowProps {
  trend: WeeklyPowerScoreTrend;
  direction: 'up' | 'down';
  winter: boolean;
}
