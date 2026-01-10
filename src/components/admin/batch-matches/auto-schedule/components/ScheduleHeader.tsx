import { Wand2 } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';

interface ScheduleHeaderProps {
  totalTeams: number;
  oddBlocks: number;
}

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({ totalTeams, oddBlocks }) => {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-base font-medium flex items-center gap-2">
        <Wand2 className="h-4 w-4" />
        <span>Schedule Generator</span>
        <Badge variant="outline" className="ml-2">
          Beta
        </Badge>
      </h3>

      <div className="flex items-center gap-2">
        <Badge variant={oddBlocks > 0 ? 'destructive' : 'outline'} className="text-xs">
          {totalTeams > 0
            ? `${totalTeams} Teams ${oddBlocks > 0 ? `(${oddBlocks} Odd Blocks)` : ''}`
            : 'No Teams'}
        </Badge>
      </div>
    </div>
  );
};
