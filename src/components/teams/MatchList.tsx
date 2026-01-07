import React, { CSSProperties, useCallback } from "react";
import { Match } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";
import TeamGameScoreRow from "./TeamGameScoreRow";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { VirtualizedList } from "@/components/ui/VirtualizedList";
import { useVirtualization } from "@/hooks/useVirtualization";

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
      <TeamGameScoreRow
        match={match}
        teamId={teamId}
        highlightWinnerLoser={highlightWinnerLoser}
      />
    </div>
  );
};

const MatchList: React.FC<MatchListProps> = ({
  matches,
  isLoading,
  teamId,
  title = "Current Season Match History",
  isPast = true,
  highlightWinnerLoser = false,
  collapsible = false,
  defaultOpen = true
}) => {
  const { shouldVirtualize } = useVirtualization({ itemCount: matches.length, threshold: 20 });

  const renderRow = useCallback((match: Match, index: number, style: CSSProperties) => (
    <VirtualizedMatchRow
      key={match.id}
      match={match}
      style={style}
      teamId={teamId}
      highlightWinnerLoser={highlightWinnerLoser}
      isLast={index === matches.length - 1}
    />
  ), [teamId, highlightWinnerLoser, matches.length]);

  const matchContent = (
    <>
      {isLoading ? (
        <Skeleton className="h-32 w-full rounded" />
      ) : matches.length === 0 ? (
        <div className="text-center py-8">
          <History className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No matches found</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {isPast ? "Match history will appear after games are played" : "No upcoming matches scheduled"}
          </p>
        </div>
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
      {title && (
        <h2 className="text-lg sm:text-xl font-semibold mb-3">{title}</h2>
      )}
      {matchContent}
    </div>
  );
};

export default MatchList;
