import React from "react";
import { Match } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";
import TeamGameScoreRow from "./TeamGameScoreRow";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

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
