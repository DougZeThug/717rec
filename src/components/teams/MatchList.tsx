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
  /** The matches failed to load. An empty list then is not "no history", so say nothing here. */
  hasError?: boolean;
  teamId: string;
  title?: string;
  isPast?: boolean;
  highlightWinnerLoser?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  headingId?: string;
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

// Empty-state words, one set per list kind
const EMPTY_STATE_TEXT = {
  past: {
    message: 'No Match History',
    description: 'Match history will appear after games are played',
  },
  upcoming: {
    message: 'No Upcoming Matches',
    description: 'No upcoming matches scheduled',
  },
};

const MatchListEmptyState: React.FC<{ isPast?: boolean }> = ({ isPast = true }) => {
  const { message, description } = isPast ? EMPTY_STATE_TEXT.past : EMPTY_STATE_TEXT.upcoming;
  return <InlineEmptyState icon={History} message={message} description={description} />;
};

// Picks what fills the list: skeleton, empty state, virtualized rows or plain rows
const MatchListBody: React.FC<
  Pick<
    MatchListProps,
    'matches' | 'isLoading' | 'hasError' | 'teamId' | 'isPast' | 'highlightWinnerLoser'
  >
> = ({ matches, isLoading, hasError = false, teamId, isPast, highlightWinnerLoser = false }) => {
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

  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded" />;
  }

  if (matches.length === 0) {
    return hasError ? null : <MatchListEmptyState isPast={isPast} />;
  }

  if (shouldVirtualize) {
    return (
      <VirtualizedList
        items={matches}
        rowHeight={72}
        height={Math.min(matches.length * 72, 400)}
        renderRow={renderRow}
        overscanCount={3}
      />
    );
  }

  return (
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
  );
};

// Puts the list inside a collapsible section, or under a plain heading
const MatchListFrame: React.FC<
  Pick<MatchListProps, 'title' | 'collapsible' | 'defaultOpen' | 'headingId'> & {
    children: React.ReactNode;
  }
> = ({
  title = 'Current Season Match History',
  collapsible = false,
  defaultOpen = true,
  headingId,
  children,
}) => {
  if (collapsible && title) {
    return (
      <CollapsibleSection
        title={title}
        icon={History}
        iconColor="text-blue-500"
        defaultOpen={defaultOpen}
        headingId={headingId}
      >
        {children}
      </CollapsibleSection>
    );
  }

  return (
    <div>
      {title && (
        <h2 id={headingId} className="text-lg sm:text-xl font-semibold mb-3">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
};

// Each default value lives in the child that uses it. A default applies only
// for `undefined`, so passing a prop straight through keeps the old behaviour.
const MatchList: React.FC<MatchListProps> = ({
  title,
  collapsible,
  defaultOpen,
  headingId,
  ...bodyProps
}) => (
  <MatchListFrame
    title={title}
    collapsible={collapsible}
    defaultOpen={defaultOpen}
    headingId={headingId}
  >
    <MatchListBody {...bodyProps} />
  </MatchListFrame>
);

export default MatchList;
