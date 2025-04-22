
import React from "react";
import { Match } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import TeamGameScoreRow from "./TeamGameScoreRow";

interface MatchListProps {
  matches: Match[];
  isLoading?: boolean;
  teamId: string;
  title?: string;
  isPast?: boolean;
}

const MatchList: React.FC<MatchListProps> = ({
  matches,
  isLoading,
  teamId,
  title = "Match History",
  isPast = true
}) => {
  return (
    <div className="mt-10">
      {title && (
        <h2 className="text-lg sm:text-xl font-semibold mb-3">{title}</h2>
      )}
      {isLoading ? (
        <Skeleton className="h-32 w-full rounded mb-4" />
      ) : matches.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-6">No matches found.</div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-800 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm overflow-hidden">
          {matches.map((match) => (
            <TeamGameScoreRow
              key={match.id}
              match={match}
              teamId={teamId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MatchList;
