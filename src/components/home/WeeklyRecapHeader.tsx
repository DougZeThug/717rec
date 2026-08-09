import { ClipboardList } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RecapMode } from '@/services/weeklyRecap/WeeklyRecapService';

function WeeklyRecapHeader({
  weekNumber,
  mode,
  winter,
}: {
  weekNumber: number | null;
  mode: RecapMode;
  winter: boolean;
}) {
  const label = mode === 'playoffs' ? 'Playoffs' : weekNumber !== null ? `Week ${weekNumber}` : null;

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
      {label !== null && (
        <Badge
          variant={winter ? 'winter' : 'outline'}
          className={cn('text-xs', !winter && 'border-muted-foreground/30')}
        >
          {label}
        </Badge>
      )}
    </div>
  );
}

export default WeeklyRecapHeader;
