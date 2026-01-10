import { History } from 'lucide-react';
import React, { CSSProperties, useCallback } from 'react';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { InlineEmptyState } from '@/components/ui/inline-empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useVirtualization } from '@/hooks/useVirtualization';
import { Match } from '@/types';

import TeamGameScoreRow from './TeamGameScoreRow';

interface MatchListProps {
  matches: Match[];
  isLoading?: boolean;
  teamId: string;
  title?: string;
  isPast?: boolean;
  highlightWinnerLoser?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

// Row component for virtualized list
const VirtualizedMatchRow: React.FC<{
  match: Match;
  style: CSSProperties;
  teamId: string;
  highlightWinnerLoser: boolean;
  isLast: boolean;
}> = ({ match, style, teamId, highlightWinnerLoser, isLast }) => {
  return (
    <div style={style} className={isLast ? '' : 'border-b border-border'}>
      <TeamGameScoreRow match={match} teamId={teamId} highlightWinnerLoser={highlightWinnerLoser} />
    </div>
  );
};

const MatchList: React.FC<MatchListProps> = ({
  matches,
  isLoading,
  teamId,
  title = 'Current Season Match History',
  isPast = true,
  highlightWinnerLoser = false,
  collapsible = false,
  defaultOpen = true,
}) => {
  const { shouldVirtualize } = useVirtualization({ itemCount: matches.length, threshold: 20 });

  const renderRow = useCallback(
    (match: Match, index: number, style: CSSProperties) => (
      <VirtualizedMatchRow
        key={match.id}
        match={match}
        style={style}
        teamId={teamId}
        highlightWinnerLoser={highlightWinnerLoser}
        isLast={index === matches.length - 1}
      />
    ),
    [teamId, highlightWinnerLoser, matches.length]
  );

  const matchContent = (
    <>
      {isLoading ? (
        <Skeleton className="h-32 w-full rounded" />
      ) : matches.length === 0 ? (
        <InlineEmptyState
          icon={History}
          message={isPast ? 'No Match History' : 'No Upcoming Matches'}
          description={
            isPast
              ? 'Match history will appear after games are played'
              : 'No upcoming matches scheduled'
          }
        />
      ) : shouldVirtualize ? (
        <VirtualizedList
          items={matches}
          rowHeight={72}
          height={Math.min(matches.length * 72, 400)}
          renderRow={renderRow}
          overscanCount={3}
        />
      ) : (
        <div className="divide-y divide-border">
          {matches.map((match) => (
            <TeamGameScoreRow
              key={match.id}
              match={match}
              teamId={teamId}
              highlightWinnerLoser={highlightWinnerLoser}
            />
          ))}
        </div>
      )}
    </>
  );

  if (collapsible && title) {
    return (
      <CollapsibleSection
        title={title}
        icon={History}
        iconColor="text-blue-500"
        defaultOpen={defaultOpen}
      >
        {matchContent}
      </CollapsibleSection>
    );
  }

  return (
    <div>
      {title && <h2 className="text-lg sm:text-xl font-semibold mb-3">{title}</h2>}
      {matchContent}
    </div>
  );
};

export default MatchList;
