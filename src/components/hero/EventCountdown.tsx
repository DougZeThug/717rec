import { Timer } from 'lucide-react';
import React from 'react';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface EventCountdownProps {
  text: string;
  percent: number;
  shouldApplyWinter: boolean;
  className?: string;
}

const EventCountdown: React.FC<EventCountdownProps> = ({
  text,
  percent,
  shouldApplyWinter,
  className,
}) => {
  return (
    <div className={cn('space-y-1', className)}>
      <div
        className={cn(
          'flex items-center gap-2 text-xs font-inter',
          shouldApplyWinter ? 'text-cyan-200/90' : 'text-white/90'
        )}
      >
        <Timer
          className={cn('h-3 w-3', shouldApplyWinter ? 'text-cyan-300' : 'text-green-300')}
        />
        <span>{text}</span>
      </div>
      <Progress
        value={percent}
        className={cn(
          'h-1.5',
          shouldApplyWinter
            ? 'bg-cyan-900/40 [&>div]:bg-cyan-400'
            : 'bg-white/20 [&>div]:bg-green-400'
        )}
        aria-label="Event start countdown progress"
      />
    </div>
  );
};

export default EventCountdown;
