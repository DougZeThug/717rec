import React from 'react';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { cn } from '@/lib/utils';

interface TeamDisplayProps {
  team: {
    name?: string;
    logoUrl?: string;
  };
  align?: 'left' | 'right' | 'center';
  className?: string;
}

const TeamDisplay: React.FC<TeamDisplayProps> = ({ team, align = 'left', className }) => {
  const containerClassName = cn(
    'flex items-center gap-2 min-w-0',
    align === 'right' && 'flex-row-reverse justify-end',
    align === 'center' && 'justify-center',
    className
  );

  return (
    <div className={containerClassName}>
      <TeamLogo imageUrl={team.logoUrl} teamName={team.name || 'TBD'} size="sm" rounded />
      <span
        className={cn(
          'font-medium text-sm leading-tight',
          align === 'right' && 'text-right',
          align === 'center' && 'text-center'
        )}
      >
        {team.name || 'TBD'}
      </span>
    </div>
  );
};

export default TeamDisplay;
