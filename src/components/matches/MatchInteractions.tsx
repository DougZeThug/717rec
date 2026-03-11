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
    <div className={cn('border-t border-border/40 mt-2 pt-2', className, animations.fadeIn)}>
      <MatchReactions matchId={matchId} />
      <MatchComments matchId={matchId} />
    </div>
  );
};

export default MatchInteractions;
