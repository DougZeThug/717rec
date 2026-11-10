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
    <div
      className={cn(
        'font-medium flex items-center gap-1 min-w-0',
        compact ? 'text-sm' : '',
        className
      )}
    >
      {/* min-w-0 + truncate: a long name or username ends in "..." instead of
          pushing the post time out of the row on a phone. */}
      <span className="font-semibold min-w-0 truncate">{username}</span>
      {teamName && (
        <Badge
          variant="outline"
          className={cn(
            'py-0 h-5 text-xs font-normal min-w-0',
            compact ? 'px-1.5' : 'px-2',
            scoreColorClass
          )}
        >
          <span className="truncate">{teamName}</span>
        </Badge>
      )}
    </div>
  );
};

export default TeamNameDisplay;
