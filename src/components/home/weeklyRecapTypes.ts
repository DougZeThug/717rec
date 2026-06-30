import { TeamStreakInfo, WeeklyUpset } from '@/services/WeeklyRecapService';
import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';

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
