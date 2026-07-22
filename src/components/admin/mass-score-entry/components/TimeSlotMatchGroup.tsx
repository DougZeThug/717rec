import { m } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { scoreLog } from '@/utils/logger';

import MatchRow from '../MatchRow';
import { MatchWithTeams } from '../types';
import { getRealMatchId } from '../utils/submissionEligibility';

const EMPTY_FAILED_MATCHES: string[] = [];
const EMPTY_ERROR_MESSAGES: Record<string, string> = {};

interface TimeSlotMatchGroupProps {
  timeSlot: string;
  matches: MatchWithTeams[];
  onScoreChange: (index: number, team1Score: number, team2Score: number) => void;
  onGameWinsChange: (index: number, team1GameWins: number, team2GameWins: number) => void;
  onMarkCompleted: (index: number, checked: boolean) => void;
  submitting?: boolean;
  failedMatches?: string[];
  errorMessages?: Record<string, string>;
  onClearError?: (matchId: string) => void;
  defaultOpen?: boolean;
  onDeleteMatch?: (matchId: string) => void;
}

const TimeSlotMatchGroup: React.FC<TimeSlotMatchGroupProps> = ({
  timeSlot,
  matches,
  onScoreChange,
  onGameWinsChange,
  onMarkCompleted,
  submitting = false,
  failedMatches = EMPTY_FAILED_MATCHES,
  errorMessages = EMPTY_ERROR_MESSAGES,
  onClearError,
  defaultOpen = false,
  onDeleteMatch,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const failedMatchIds = useMemo(() => new Set(failedMatches), [failedMatches]);

  // Debug log to track the matches in this group
  useEffect(() => {
    scoreLog(
      `TimeSlotMatchGroup "${timeSlot}" rendering with ${matches.length} matches:`,
      matches.map((m, idx) => ({
        id: m.id,
        localIndex: idx,
        globalIndex: parseInt(m.id.split('-index-')[1] || '0', 10),
        teams: `${m.team1?.name || 'Unknown'} vs ${m.team2?.name || 'Unknown'}`,
      }))
    );
  }, [timeSlot, matches]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-2 overflow-hidden">
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center justify-between p-2 text-left text-sm rounded transition-all',
          'bg-accent/60 hover:bg-accent'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{timeSlot}</span>
          <span className="text-xs bg-primary/10 px-1.5 py-0.5 rounded">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'size-4 transition-transform duration-200',
            isOpen ? 'transform rotate-180' : ''
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {matches.map((match, localIndex) => {
            // Extract the global index from the match ID
            const globalIndex = parseInt(match.id.split('-index-')[1] || '0', 10);

            scoreLog(`Rendering match at timeslot "${timeSlot}":`, {
              id: match.id,
              localIndex,
              globalIndex,
              isCompleted: match.iscompleted,
            });

            return (
              <div key={match.id} className="relative">
                <MatchRow
                  match={match}
                  index={globalIndex} // Use the global index for parent callbacks
                  isSubmitting={submitting}
                  hasError={failedMatchIds.has(getRealMatchId(match.id))}
                  errorMessage={errorMessages?.[getRealMatchId(match.id)]}
                  onScoreChange={(team1Score, team2Score) =>
                    onScoreChange(globalIndex, team1Score, team2Score)
                  }
                  onGameWinsChange={(team1GameWins, team2GameWins) =>
                    onGameWinsChange(globalIndex, team1GameWins, team2GameWins)
                  }
                  onMarkCompleted={(checked) => {
                    scoreLog(
                      `TimeSlotMatchGroup: Marking match ${match.id} as ${checked ? 'completed' : 'incomplete'}`,
                      {
                        globalIndex,
                        localIndex,
                      }
                    );
                    onMarkCompleted(globalIndex, checked);
                  }}
                  onClearError={onClearError}
                  onDelete={onDeleteMatch}
                />
              </div>
            );
          })}
        </m.div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default TimeSlotMatchGroup;
