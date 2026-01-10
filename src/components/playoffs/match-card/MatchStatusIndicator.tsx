import { AlertTriangle, Trophy } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

interface MatchStatusIndicatorProps {
  isPending: boolean;
  isComplete: boolean;
  isResetMatch: boolean;
  matchType: string;
  winnerId?: string | null;
}

const MatchStatusIndicator: React.FC<MatchStatusIndicatorProps> = ({
  isPending,
  isComplete,
  isResetMatch,
  matchType,
  winnerId,
}) => {
  const getMatchStatusText = () => {
    if (isPending) return 'Waiting for teams';
    if (isComplete) return 'Final';
    if (isResetMatch) return 'Bracket Reset';
    return 'In progress';
  };

  const getStatusClasses = () => {
    if (isPending) return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    if (isComplete) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (isResetMatch) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  };

  return (
    <div
      className={cn(
        'mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center'
      )}
    >
      <div className={cn('text-center px-2 py-1 rounded-full text-xs', getStatusClasses())}>
        {getMatchStatusText()}
      </div>

      {isResetMatch && (
        <div className="flex items-center text-amber-500">
          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs">Bracket Reset</span>
        </div>
      )}

      {matchType === 'finals' && winnerId && (
        <div className="flex items-center text-amber-500">
          <Trophy className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs">Champion</span>
        </div>
      )}
    </div>
  );
};

export default MatchStatusIndicator;
