import React from 'react';

import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

import MatchComments from './comments/MatchComments';
import MatchReactions from './reactions/MatchReactions';

interface MatchInteractionsProps {
  matchId: string;
  className?: string;
}

const MatchInteractions: React.FC<MatchInteractionsProps> = ({ matchId, className }) => {
  return (
    <div className={cn('border-t border-border/40 mt-1.5 pt-1.5', className, animations.fadeIn)}>
      <div className="flex items-start justify-between gap-2">
        <MatchComments matchId={matchId} />
        <MatchReactions matchId={matchId} />
      </div>
    </div>
  );
};

export default MatchInteractions;
