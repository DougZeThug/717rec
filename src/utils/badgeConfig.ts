
import { 
  Crown, 
  Medal, 
  Award, 
  Swords, 
  Crosshair, 
  Activity, 
  TrendingUp, 
  TrendingDown 
} from 'lucide-react';
import { BadgeConfig, BadgeType } from '@/types/badges';

export const BADGE_CONFIGS: Record<BadgeType, BadgeConfig> = {
  // Championship Badges - Recreational
  recreational_champion: {
    type: 'recreational_champion',
    name: 'Recreational Champion',
    description: 'Champion of the Recreational Division',
    icon: Crown,
    gradient: 'from-yellow-400 via-yellow-500 to-amber-600',
    bgColor: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    isPermanent: true,
    category: 'championship'
  },
  recreational_runner_up: {
    type: 'recreational_runner_up',
    name: 'Recreational Runner-Up',
    description: 'Runner-up in the Recreational Division',
    icon: Medal,
    gradient: 'from-gray-300 via-gray-400 to-gray-500',
    bgColor: 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/20 dark:to-slate-800/20',
    textColor: 'text-gray-600 dark:text-gray-400',
    isPermanent: true,
    category: 'championship'
  },
  recreational_third_place: {
    type: 'recreational_third_place',
    name: 'Recreational Third Place',
    description: 'Third place in the Recreational Division',
    icon: Award,
    gradient: 'from-amber-600 via-orange-500 to-amber-700',
    bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    isPermanent: true,
    category: 'championship'
  },

  // Championship Badges - Intermediate
  intermediate_champion: {
    type: 'intermediate_champion',
    name: 'Intermediate Champion',
    description: 'Champion of the Intermediate Division',
    icon: Crown,
    gradient: 'from-blue-400 via-blue-500 to-blue-600',
    bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
    textColor: 'text-blue-700 dark:text-blue-400',
    isPermanent: true,
    category: 'championship'
  },
  intermediate_runner_up: {
    type: 'intermediate_runner_up',
    name: 'Intermediate Runner-Up',
    description: 'Runner-up in the Intermediate Division',
    icon: Medal,
    gradient: 'from-slate-300 via-slate-400 to-slate-500',
    bgColor: 'bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800/20 dark:to-gray-800/20',
    textColor: 'text-slate-600 dark:text-slate-400',
    isPermanent: true,
    category: 'championship'
  },
  intermediate_third_place: {
    type: 'intermediate_third_place',
    name: 'Intermediate Third Place',
    description: 'Third place in the Intermediate Division',
    icon: Award,
    gradient: 'from-orange-500 via-red-500 to-orange-600',
    bgColor: 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
    textColor: 'text-orange-600 dark:text-orange-400',
    isPermanent: true,
    category: 'championship'
  },

  // Championship Badges - Competitive
  competitive_champion: {
    type: 'competitive_champion',
    name: 'Competitive Champion',
    description: 'Champion of the Competitive Division',
    icon: Crown,
    gradient: 'from-purple-400 via-purple-500 to-purple-600',
    bgColor: 'bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20',
    textColor: 'text-purple-700 dark:text-purple-400',
    isPermanent: true,
    category: 'championship'
  },
  competitive_runner_up: {
    type: 'competitive_runner_up',
    name: 'Competitive Runner-Up',
    description: 'Runner-up in the Competitive Division',
    icon: Medal,
    gradient: 'from-zinc-300 via-zinc-400 to-zinc-500',
    bgColor: 'bg-gradient-to-br from-zinc-50 to-slate-50 dark:from-zinc-800/20 dark:to-slate-800/20',
    textColor: 'text-zinc-600 dark:text-zinc-400',
    isPermanent: true,
    category: 'championship'
  },
  competitive_third_place: {
    type: 'competitive_third_place',
    name: 'Competitive Third Place',
    description: 'Third place in the Competitive Division',
    icon: Award,
    gradient: 'from-rose-500 via-pink-500 to-rose-600',
    bgColor: 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20',
    textColor: 'text-rose-600 dark:text-rose-400',
    isPermanent: true,
    category: 'championship'
  },

  // Performance Badges
  king_slayer: {
    type: 'king_slayer',
    name: 'King Slayer',
    description: 'Defeated a higher-ranked opponent',
    icon: Swords,
    gradient: 'from-red-500 via-red-600 to-red-700',
    bgColor: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
    textColor: 'text-red-700 dark:text-red-400',
    isPermanent: false,
    category: 'performance'
  },
  clutch_performer: {
    type: 'clutch_performer',
    name: 'Clutch Performer',
    description: 'Won multiple close matches',
    icon: Crosshair,
    gradient: 'from-green-500 via-green-600 to-green-700',
    bgColor: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
    textColor: 'text-green-700 dark:text-green-400',
    isPermanent: false,
    category: 'performance'
  },
  consistent_performer: {
    type: 'consistent_performer',
    name: 'Consistent Performer',
    description: 'Maintained steady performance',
    icon: Activity,
    gradient: 'from-blue-500 via-blue-600 to-blue-700',
    bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
    textColor: 'text-blue-700 dark:text-blue-400',
    isPermanent: false,
    category: 'performance'
  },

  // Streak Badges
  hot_streak: {
    type: 'hot_streak',
    name: 'Hot Streak',
    description: 'Currently on a winning streak',
    icon: TrendingUp,
    gradient: 'from-orange-500 via-red-500 to-orange-600',
    bgColor: 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
    textColor: 'text-orange-700 dark:text-orange-400',
    isPermanent: false,
    category: 'streak'
  },
  cold_streak: {
    type: 'cold_streak',
    name: 'Cold Streak',
    description: 'Currently on a losing streak',
    icon: TrendingDown,
    gradient: 'from-blue-400 via-blue-500 to-blue-600',
    bgColor: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
    textColor: 'text-blue-700 dark:text-blue-400',
    isPermanent: false,
    category: 'streak'
  }
};

export const getBadgeConfig = (badgeType: BadgeType): BadgeConfig => {
  return BADGE_CONFIGS[badgeType];
};

export const getChampionshipBadges = (): BadgeConfig[] => {
  return Object.values(BADGE_CONFIGS).filter(badge => badge.category === 'championship');
};

export const getPerformanceBadges = (): BadgeConfig[] => {
  return Object.values(BADGE_CONFIGS).filter(badge => badge.category === 'performance');
};

export const getStreakBadges = (): BadgeConfig[] => {
  return Object.values(BADGE_CONFIGS).filter(badge => badge.category === 'streak');
};
