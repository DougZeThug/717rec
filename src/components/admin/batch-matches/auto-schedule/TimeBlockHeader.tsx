import { Clock } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/useMobile';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';

interface TimeBlockHeaderProps {
  blockName: string;
  teamCount: number;
  timeslots?: string[];
}

export const TimeBlockHeader: React.FC<TimeBlockHeaderProps> = ({
  blockName,
  teamCount,
  timeslots = [],
}) => {
  const isMobile = useIsMobile();
  const { isWinterTheme } = useSeasonalThemeBase();

  return (
    <div
      className={`px-3 sm:px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between ${
        isWinterTheme ? 'bg-[hsl(222,30%,15%)]' : 'bg-slate-100 dark:bg-slate-800'
      }`}
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm sm:text-base">{blockName} Block</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-0">
        <Badge variant="outline" className="text-xs">
          {teamCount} Teams
        </Badge>

        {timeslots && timeslots.length > 0 && (
          <div className="text-xs text-muted-foreground hidden sm:block">
            {timeslots.join(' / ')}
          </div>
        )}
        {timeslots && timeslots.length > 0 && (
          <div className="text-xs text-muted-foreground block sm:hidden">
            {timeslots.length > 1 ? `${timeslots.length} Timeslots` : timeslots[0]}
          </div>
        )}
      </div>
    </div>
  );
};
