
import { LucideIcon, Trophy, Award, Medal, Zap, Target, TrendingUp, Flame, Snowflake, Swords, PartyPopper } from 'lucide-react';
import { BadgeConfig, BadgeType, TeamBadgeEvent } from '@/types/badges';

export const badgeConfigs: Record<BadgeType, BadgeConfig> = {
  // Championship badges
  recreational_champion: {
    type: 'recreational_champion',
    name: 'Recreational Champion',
    description: 'Winner of the Recreational Division',
    icon: Trophy,
    gradient: 'from-yellow-400 to-yellow-600',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    isPermanent: true,
    category: 'championship'
  },
  intermediate_champion: {
    type: 'intermediate_champion',
    name: 'Intermediate Champion',
    description: 'Winner of the Intermediate Division',
    icon: Trophy,
    gradient: 'from-orange-400 to-orange-600',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    isPermanent: true,
    category: 'championship'
  },
  competitive_champion: {
    type: 'competitive_champion',
    name: 'Competitive Champion',
    description: 'Winner of the Competitive Division',
    icon: Trophy,
    gradient: 'from-purple-400 to-purple-600',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    isPermanent: true,
    category: 'championship'
  },
  
  // Runner-up badges
  recreational_runner_up: {
    type: 'recreational_runner_up',
    name: 'Recreational Runner-Up',
    description: 'Second place in the Recreational Division',
    icon: Award,
    gradient: 'from-gray-400 to-gray-600',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    isPermanent: true,
    category: 'championship'
  },
  intermediate_runner_up: {
    type: 'intermediate_runner_up',
    name: 'Intermediate Runner-Up',
    description: 'Second place in the Intermediate Division',
    icon: Award,
    gradient: 'from-gray-400 to-gray-600',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    isPermanent: true,
    category: 'championship'
  },
  competitive_runner_up: {
    type: 'competitive_runner_up',
    name: 'Competitive Runner-Up',
    description: 'Second place in the Competitive Division',
    icon: Award,
    gradient: 'from-slate-300 to-slate-500',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-800',
    isPermanent: true,
    category: 'championship'
  },
  
  // Third place badges
  recreational_third_place: {
    type: 'recreational_third_place',
    name: 'Recreational Third Place',
    description: 'Third place in the Recreational Division',
    icon: Medal,
    gradient: 'from-amber-600 to-amber-800',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    isPermanent: true,
    category: 'championship'
  },
  intermediate_third_place: {
    type: 'intermediate_third_place',
    name: 'Intermediate Third Place',
    description: 'Third place in the Intermediate Division',
    icon: Medal,
    gradient: 'from-amber-600 to-amber-800',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    isPermanent: true,
    category: 'championship'
  },
  competitive_third_place: {
    type: 'competitive_third_place',
    name: 'Competitive Third Place',
    description: 'Third place in the Competitive Division',
    icon: Medal,
    gradient: 'from-amber-600 to-amber-800',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    isPermanent: true,
    category: 'championship'
  },
  
  // Performance badges
  king_slayer: {
    type: 'king_slayer',
    name: 'King Slayer',
    description: 'Defeated a team with significantly higher power score',
    icon: Swords,
    gradient: 'from-red-500 to-red-700',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    isPermanent: false,
    category: 'performance'
  },
  clutch_performer: {
    type: 'clutch_performer',
    name: 'Clutch Performer',
    description: 'Won 5+ close matches (2-1 scores) this season',
    icon: Target,
    gradient: 'from-green-500 to-green-700',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    isPermanent: false,
    category: 'performance'
  },
  consistent_performer: {
    type: 'consistent_performer',
    name: 'Consistent Performer',
    description: 'Beat 5+ different teams within the same division',
    icon: TrendingUp,
    gradient: 'from-blue-500 to-blue-700',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    isPermanent: false,
    category: 'performance'
  },
  
  // Streak badges
  hot_streak: {
    type: 'hot_streak',
    name: 'Hot Streak',
    description: 'Currently on a winning streak of 5+ matches',
    icon: Flame,
    gradient: 'from-orange-500 to-red-600',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    isPermanent: false,
    category: 'streak'
  },
  cold_streak: {
    type: 'cold_streak',
    name: 'Cold Streak',
    description: 'Currently on a losing streak of 3+ matches',
    icon: Snowflake,
    gradient: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    isPermanent: false,
    category: 'streak'
  },
  
  // Special badges
  cool_fun_team: {
    type: 'cool_fun_team',
    name: 'Cool Fun Team',
    description: 'Just vibing and having a good time',
    icon: PartyPopper,
    gradient: 'from-pink-400 to-purple-500',
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-800',
    isPermanent: true,
    category: 'performance'
  }
};

export const getBadgeConfig = (badgeType: BadgeType, badge?: TeamBadgeEvent): BadgeConfig => {
  const baseConfig = badgeConfigs[badgeType];
  
  // Enhanced color hierarchy for Intermediate division
  if (badgeType === 'intermediate_champion' && badge?.metadata) {
    const metadata = badge.metadata as any;
    const divisionName = metadata?.division || '';
    
    // Intermediate High gets cyan, Intermediate Low gets orange
    if (divisionName.toLowerCase().includes('high')) {
      return {
        ...baseConfig,
        name: 'Intermediate High Champion',
        description: 'Winner of the Intermediate High Division',
        gradient: 'from-cyan-400 to-cyan-600',
        bgColor: 'bg-cyan-100',
        textColor: 'text-cyan-800',
      };
    }
    
    if (divisionName.toLowerCase().includes('low')) {
      return {
        ...baseConfig,
        name: 'Intermediate Low Champion',
        description: 'Winner of the Intermediate Low Division',
      };
    }
  }
  
  if (badgeType === 'intermediate_runner_up' && badge?.metadata) {
    const metadata = badge.metadata as any;
    const divisionName = metadata?.division || '';
    
    // Intermediate High Runner-up gets bright silver, Low gets standard silver  
    if (divisionName.toLowerCase().includes('high')) {
      return {
        ...baseConfig,
        name: 'Intermediate High Runner-Up',
        description: 'Second place in the Intermediate High Division',
        gradient: 'from-gray-300 to-gray-500',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
      };
    }
    
    if (divisionName.toLowerCase().includes('low')) {
      return {
        ...baseConfig,
        name: 'Intermediate Low Runner-Up', 
        description: 'Second place in the Intermediate Low Division',
      };
    }
  }
  
  return baseConfig;
};

export const getBadgesByCategory = (category: BadgeConfig['category']): BadgeConfig[] => {
  return Object.values(badgeConfigs).filter(badge => badge.category === category);
};
