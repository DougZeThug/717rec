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
        'bg-gradient-to-r from-orange-500 to-red-500',
        'text-white text-[10px] font-bold uppercase tracking-wider',
        'shadow-sm animate-pulse',
        className
      )}
      title="The underdog won this match!"
    >
      <Zap className="h-3 w-3" />
      <span>Upset</span>
    </div>
  );
};

export default UpsetTag;
