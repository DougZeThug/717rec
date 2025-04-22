
import React from "react";
import { Match } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import TeamGameScoreRow from "./TeamGameScoreRow";
import { AlertTriangle } from "lucide-react";

interface MatchListProps {
  matches: Match[];
  isLoading?: boolean;
  teamId: string;
  title?: string;
  isPast?: boolean;
  error?: any;
}

const MatchList: React.FC<MatchListProps> = ({
  matches,
  isLoading,
  teamId,
  title = "Match History",
  isPast = true,
  error
}) => {
  // Add debugging information
  console.log(`MatchList render - ${title}:`, { 
    matchCount: matches?.length, 
    isLoading, 
    teamId,
    error: error ? "Error exists" : "No error",
    errorDetails: error ? {
      message: error.message,
      code: error.code,
      hint: error.hint,
      details: error.details
    } : "No error details",
    matchSample: matches?.length > 0 ? {
      id: matches[0].id,
      iscompleted: matches[0].iscompleted,
      team1Id: matches[0].team1Id,
      team2Id: matches[0].team2Id,
      hasStats: Boolean(matches[0].stats)
    } : "No matches" 
  });

  if (isLoading) {
    return (
      <div className="mt-10">
        {title && <h2 className="text-lg sm:text-xl font-semibold mb-3">{title}</h2>}
        <Skeleton className="h-32 w-full rounded mb-4" />
      </div>
    );
  }

  if (error) {
    console.error("Match list error:", error);
    return (
      <div className="mt-10">
        {title && <h2 className="text-lg sm:text-xl font-semibold mb-3">{title}</h2>}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500 mb-2" />
          <p className="text-sm text-red-600 dark:text-red-400">
            Error loading matches. Please try again later.
          </p>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">
            Error: {error.message || "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10">
      {title && (
        <h2 className="text-lg sm:text-xl font-semibold mb-3">{title}</h2>
      )}
      {!matches || matches.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-6 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-800">
          No matches found.
        </div>
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
