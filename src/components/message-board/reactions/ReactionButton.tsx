import React from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ReactionButtonProps {
  emoji: string;
  count: number;
  hasReacted: boolean;
  onClick: () => void;
}

const ReactionButton: React.FC<ReactionButtonProps> = ({ emoji, count, hasReacted, onClick }) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="xs"
            className={cn(
              'py-0 px-2 gap-1 text-xs border transition-all duration-150',
              'h-8 min-h-[36px] sm:h-6 sm:min-h-0',
              hasReacted
                ? 'bg-accent/30 border-primary/30 hover:bg-accent/40'
                : 'bg-background/80 border-gray-200 dark:border-gray-700 hover:bg-accent/10'
            )}
            onClick={onClick}
            aria-label={`${emoji} reaction (${count})`}
          >
            <span className="text-sm">{emoji}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="px-3 py-1.5">
          <p className="text-xs">{hasReacted ? 'Remove reaction' : 'Add reaction'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ReactionButton;
