
import { 
  Crown, 
  Medal, 
  Trophy, 
  Swords, 
  Target, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Award
} from 'lucide-react';
import { BadgeConfig, BadgeType } from '@/types/badges';

export const getBadgeConfig = (badgeType: BadgeType): BadgeConfig => {
  const configs: Record<BadgeType, BadgeConfig> = {
    // Championship badges
    recreational_champion: {
      type: 'recreational_champion',
      name: 'Recreational Champion',
      description: 'Won the Recreational Division championship',
      icon: Trophy,
      gradient: 'from-green-400 to-green-600',
      bgColor: 'bg-green-500',
      textColor: 'text-green-700',
      isPermanent: true,
      category: 'championship'
    },
    intermediate_champion: {
      type: 'intermediate_champion',
      name: 'Intermediate Champion',
      description: 'Won the Intermediate Division championship',
      icon: Trophy,
      gradient: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-500',
      textColor: 'text-blue-700',
      isPermanent: true,
      category: 'championship'
    },
    competitive_champion: {
      type: 'competitive_champion',
      name: 'Competitive Champion',
      description: 'Won the Competitive Division championship',
      icon: Crown,
      gradient: 'from-yellow-400 to-amber-600',
      bgColor: 'bg-amber-500',
      textColor: 'text-amber-700',
      isPermanent: true,
      category: 'championship'
    },
    recreational_runner_up: {
      type: 'recreational_runner_up',
      name: 'Recreational Runner-up',
      description: 'Finished 2nd in Recreational Division',
      icon: Medal,
      gradient: 'from-gray-300 to-gray-500',
      bgColor: 'bg-gray-400',
      textColor: 'text-gray-600',
      isPermanent: true,
      category: 'championship'
    },
    intermediate_runner_up: {
      type: 'intermediate_runner_up',
      name: 'Intermediate Runner-up',
      description: 'Finished 2nd in Intermediate Division',
      icon: Medal,
      gradient: 'from-gray-300 to-gray-500',
      bgColor: 'bg-gray-400',
      textColor: 'text-gray-600',
      isPermanent: true,
      category: 'championship'
    },
    competitive_runner_up: {
      type: 'competitive_runner_up',
      name: 'Competitive Runner-up',
      description: 'Finished 2nd in Competitive Division',
      icon: Medal,
      gradient: 'from-gray-300 to-gray-500',
      bgColor: 'bg-gray-400',
      textColor: 'text-gray-600',
      isPermanent: true,
      category: 'championship'
    },
    recreational_third_place: {
      type: 'recreational_third_place',
      name: 'Recreational 3rd Place',
      description: 'Finished 3rd in Recreational Division',
      icon: Award,
      gradient: 'from-orange-300 to-orange-500',
      bgColor: 'bg-orange-400',
      textColor: 'text-orange-600',
      isPermanent: true,
      category: 'championship'
    },
    intermediate_third_place: {
      type: 'intermediate_third_place',
      name: 'Intermediate 3rd Place',
      description: 'Finished 3rd in Intermediate Division',
      icon: Award,
      gradient: 'from-orange-300 to-orange-500',
      bgColor: 'bg-orange-400',
      textColor: 'text-orange-600',
      isPermanent: true,
      category: 'championship'
    },
    competitive_third_place: {
      type: 'competitive_third_place',
      name: 'Competitive 3rd Place',
      description: 'Finished 3rd in Competitive Division',
      icon: Award,
      gradient: 'from-orange-300 to-orange-500',
      bgColor: 'bg-orange-400',
      textColor: 'text-orange-600',
      isPermanent: true,
      category: 'championship'
    },
    
    // Performance badges
    king_slayer: {
      type: 'king_slayer',
      name: 'King Slayer',
      description: 'Defeated a team with significantly higher power score',
      icon: Swords,
      gradient: 'from-red-400 to-red-600',
      bgColor: 'bg-red-500',
      textColor: 'text-red-700',
      isPermanent: false,
      category: 'performance'
    },
    clutch_performer: {
      type: 'clutch_performer',
      name: 'Clutch Performer',
      description: 'Consistently wins close matches',
      icon: Target,
      gradient: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-500',
      textColor: 'text-purple-700',
      isPermanent: false,
      category: 'performance'
    },
    consistent_performer: {
      type: 'consistent_performer',
      name: 'Consistent Performer',
      description: 'Maintains high win rate over many matches',
      icon: Activity,
      gradient: 'from-teal-400 to-teal-600',
      bgColor: 'bg-teal-500',
      textColor: 'text-teal-700',
      isPermanent: false,
      category: 'performance'
    },
    
    // Streak badges
    hot_streak: {
      type: 'hot_streak',
      name: 'Hot Streak',
      description: 'Multiple consecutive wins',
      icon: TrendingUp,
      gradient: 'from-orange-400 to-red-500',
      bgColor: 'bg-orange-500',
      textColor: 'text-orange-700',
      isPermanent: false,
      category: 'streak'
    },
    cold_streak: {
      type: 'cold_streak',
      name: 'Cold Streak',
      description: 'Multiple consecutive losses',
      icon: TrendingDown,
      gradient: 'from-blue-400 to-blue-700',
      bgColor: 'bg-blue-600',
      textColor: 'text-blue-700',
      isPermanent: false,
      category: 'streak'
    }
  };

  return configs[badgeType];
};

export const getBadgesByCategory = () => {
  const allBadges = Object.values(getBadgeConfig('recreational_champion').type ? 
    (['recreational_champion', 'intermediate_champion', 'competitive_champion',
      'recreational_runner_up', 'intermediate_runner_up', 'competitive_runner_up',
      'recreational_third_place', 'intermediate_third_place', 'competitive_third_place',
      'king_slayer', 'clutch_performer', 'consistent_performer', 'hot_streak', 'cold_streak'] as BadgeType[])
      .reduce((acc, type) => {
        acc[type] = getBadgeConfig(type);
        return acc;
      }, {} as Record<BadgeType, BadgeConfig>) : {}
  );

  return {
    championship: Object.values(allBadges).filter(badge => badge.category === 'championship'),
    performance: Object.values(allBadges).filter(badge => badge.category === 'performance'),
    streak: Object.values(allBadges).filter(badge => badge.category === 'streak')
  };
};
