import React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getPowerScoreColor } from '@/utils/colors';

interface TeamNameDisplayProps {
  username: string;
  teamName: string | null;
  powerScore?: number;
  className?: string;
  compact?: boolean;
}

const TeamNameDisplay: React.FC<TeamNameDisplayProps> = ({
  username,
  teamName,
  powerScore,
  className,
  compact = false,
}) => {
  // Get the appropriate color class based on the team's power score
  const scoreColorClass = getPowerScoreColor(powerScore);

  return (
    <div className={cn('font-medium flex items-center gap-1', compact ? 'text-sm' : '', className)}>
      <span className="font-semibold">{username}</span>
      {teamName && (
        <Badge
          variant="outline"
          className={cn(
            'py-0 h-5 text-xs font-normal',
            compact ? 'px-1.5' : 'px-2',
            scoreColorClass
          )}
        >
          {teamName}
        </Badge>
      )}
    </div>
  );
};

export default TeamNameDisplay;
