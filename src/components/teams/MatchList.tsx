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
        <div className="text-center text-muted-foreground text-sm py-6">No matches found.</div>
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
