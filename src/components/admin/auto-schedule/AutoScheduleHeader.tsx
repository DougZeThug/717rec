import { Wand2 } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';

/**
 * Header component for the auto-schedule section
 */
const AutoScheduleHeader: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Auto Schedule Generator</h2>
          <Badge variant="outline" className="ml-2">
            Beta
          </Badge>
        </div>
      </div>

      <p className="text-muted-foreground">
        Generate match schedules automatically. Teams are paired by division first, and rematches
        are avoided when possible. With Prioritize Match Quality ON (Standard mode), teams with a
        close power score and record are preferred next.
      </p>
    </div>
  );
};

export default AutoScheduleHeader;
