import { Zap } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

interface UpsetTagProps {
  className?: string;
}

/**
 * Small "UPSET" tag to display on completed matches where
 * the heavily underfavored team won.
 *
 * Only shown when the winner's pre-match probability was <= 30%
 */
export const UpsetTag: React.FC<UpsetTagProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        // Deep red-to-orange so white text reaches 4.5:1 (it was 2.8 to 3.8:1).
        'bg-gradient-to-r from-orange-700 to-red-700',
        // 12px: the tag says what happened in the match, so it is information.
        'text-white text-xs font-bold uppercase tracking-wider',
        'shadow-xs',
        className
      )}
      title="The underdog won this match!"
    >
      {/* Only the icon pulses: pulsing the whole tag fades the text to 50% and
          takes it below 4.5:1. */}
      <Zap className="size-3 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
      <span>Upset</span>
    </div>
  );
};
