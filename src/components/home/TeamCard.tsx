import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import React from 'react';
import { Link } from 'react-router';

import TeamBadgeCollection from '@/components/badges/TeamBadgeCollection';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';
import { blueAmberHeading } from '@/styles/design-system/blueAmber';
import { Team } from '@/types';

import { TeamLogo } from './TeamLogo';
import { TeamStats } from './TeamStats';

interface TeamCardProps {
  team: Team;
  delay?: number;
  isWinter?: boolean;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, delay = 0, isWinter = false }) => {
  const { theme: _theme } = useTheme();
  const delayClass = delay ? `animation-delay-${delay * 100}` : '';

  return (
    <motion.div
      className={cn(
        'overflow-hidden rounded-xl shadow-md',
        'border border-border/50',
        isWinter
          ? 'frost-card frost-edge'
          : cn(
              'bg-gradient-to-br from-white via-white to-gray-50',
              'dark:from-[#1E1E1E] dark:via-gray-800/90 dark:to-gray-900'
            ),
        'border-t-[3px]',
        isWinter ? 'border-t-cyan-400' : 'border-t-blue-500 dark:border-t-blue-400',
        animations.fadeInSlideUp,
        delayClass
      )}
      whileHover={{
        scale: 1.03,
        y: -4,
        boxShadow: isWinter
          ? '0 12px 24px -8px rgba(0,0,0,0.3), 0 0 20px rgba(34,211,238,0.1)'
          : '0 12px 24px -8px rgba(0,0,0,0.15)',
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Link to={`/teams/${team.id}`} className="block">
        <div
          className={cn(
            'h-44 relative flex items-center justify-center p-4',
            isWinter
              ? 'bg-gradient-to-br from-slate-800/80 via-slate-800/50 to-slate-900/60'
              : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-800/80 dark:via-gray-800/50 dark:to-gray-900/60'
          )}
        >
          <div
            className={cn(
              'absolute inset-0',
              isWinter
                ? 'bg-gradient-to-br from-cyan-900/10 via-transparent to-violet-900/10'
                : 'bg-gradient-to-br from-blue-50/30 via-transparent to-amber-50/20 dark:from-blue-900/10 dark:to-amber-900/10'
            )}
          />
          <TeamLogo imageUrl={team.imageUrl} teamName={team.name} />

          <div className="absolute top-2 right-2">
            <TeamBadgeCollection teamId={team.id} size="sm" maxDisplay={3} orientation="vertical" />
          </div>
        </div>
        <div
          className={cn(
            'border-t',
            isWinter ? 'border-cyan-500/20' : 'border-border/30 dark:border-border/20'
          )}
        />
        <div
          className={cn(
            'p-4',
            isWinter
              ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/95'
              : 'bg-gradient-to-br from-white to-gray-50/70 dark:from-[#1E1E1E] dark:to-gray-900/90'
          )}
        >
          <h3
            className={cn(
              'font-bebas font-normal uppercase tracking-wide text-xl mb-2 truncate',
              isWinter ? 'heading-winter' : blueAmberHeading()
            )}
          >
            {team.name}
          </h3>
          <TeamStats team={team} isWinter={isWinter} />
        </div>
      </Link>
    </motion.div>
  );
};

export default TeamCard;
