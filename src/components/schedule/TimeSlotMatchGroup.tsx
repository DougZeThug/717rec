import { ChevronDown } from 'lucide-react';
import React, { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useBatchHeadToHead } from '@/hooks/useBatchHeadToHead';
import { cn } from '@/lib/utils';
import { Match } from '@/types';

import MatchCard from './MatchCard';

interface TimeSlotMatchGroupProps {
  timeSlot: string;
  matches: Match[];
  onEditMatch?: (match: Match) => void;
  onDeleteMatch?: (matchId: string) => void;
  isFirstTimeSlot?: boolean;
}

const TimeSlotMatchGroup: React.FC<TimeSlotMatchGroupProps> = ({
  timeSlot,
  matches,
  onEditMatch,
  onDeleteMatch,
  isFirstTimeSlot = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(isFirstTimeSlot);

  // Extract all team pairs for batch H2H query
  const teamPairs = useMemo(
    () =>
      matches.map((match) => ({
        team1Id: match.team1Id,
        team2Id: match.team2Id,
      })),
    [matches]
  );

  // Only fetch H2H data when this time-slot group is expanded
  const { getHeadToHead, isLoading: isH2HLoading } = useBatchHeadToHead(teamPairs, isOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-2 overflow-hidden">
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center justify-between p-2 text-left text-sm rounded transition-all',
          'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{timeSlot}</span>
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'}
          </Badge>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen ? 'transform rotate-180' : ''
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pt-2 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              isCompleted={!!match.iscompleted}
              onEdit={onEditMatch}
              onDelete={onDeleteMatch}
              prefetchedH2H={getHeadToHead(match.team1Id, match.team2Id)}
              isBatchH2HLoading={isH2HLoading}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default TimeSlotMatchGroup;
