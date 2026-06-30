import { ClipboardList } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function WeeklyRecapHeader({ weekNumber, winter }: { weekNumber: number | null; winter: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ClipboardList size={16} className={winter ? 'text-cyan-400' : 'text-violet-500'} />
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            winter ? 'text-cyan-300' : 'text-violet-600 dark:text-violet-400'
          )}
        >
          Weekly Recap
        </span>
      </div>
      {weekNumber !== null && (
        <Badge
          variant={winter ? 'winter' : 'outline'}
          className={cn('text-xs', !winter && 'border-muted-foreground/30')}
        >
          Week {weekNumber}
        </Badge>
      )}
    </div>
  );
}

export default WeeklyRecapHeader;
