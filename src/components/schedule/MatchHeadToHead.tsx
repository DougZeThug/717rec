import React from "react";
import { useMatchHeadToHead } from "@/hooks/useMatchHeadToHead";
import { Skeleton } from "@/components/ui/skeleton";
import type { HeadToHeadData } from "@/hooks/useBatchHeadToHead";

interface MatchHeadToHeadProps {
  team1Id: string | null;
  team2Id: string | null;
  team1Name: string;
  team2Name: string;
  /** Pre-fetched H2H data from batch query - if provided, skips individual query */
  prefetchedData?: HeadToHeadData | null;
  /** Whether the parent is still loading batch data */
  isBatchLoading?: boolean;
}

/**
 * Displays head-to-head record between two teams
 * Shows as a small text line under the match card
 * 
 * Supports two modes:
 * 1. Prefetched data from useBatchHeadToHead (preferred for lists)
 * 2. Individual fetch via useMatchHeadToHead (fallback)
 */
export const MatchHeadToHead: React.FC<MatchHeadToHeadProps> = ({
  team1Id,
  team2Id,
  team1Name,
  team2Name,
  prefetchedData,
  isBatchLoading = false,
}) => {
  // Only use individual hook if no prefetched data provided
  const shouldFetchIndividually = prefetchedData === undefined && !isBatchLoading;
  const { data: individualData, isLoading: individualLoading } = useMatchHeadToHead(
    shouldFetchIndividually ? team1Id : null,
    shouldFetchIndividually ? team2Id : null
  );

  // Use prefetched data if available, otherwise fall back to individual query
  const data = prefetchedData !== undefined ? prefetchedData : individualData;
  const isLoading = isBatchLoading || (shouldFetchIndividually && individualLoading);

  if (isLoading) {
    return <Skeleton className="h-4 w-32 mx-auto" />;
  }

  if (!data) {
    return null;
  }

  // Check if this is first meeting
  const isFirstMeeting = 'isFirstMeeting' in data ? data.isFirstMeeting : data.totalMatches === 0;

  // Format the display text
  const getDisplayText = (): string => {
    if (isFirstMeeting) {
      return "H2H: First meeting";
    }

    const { team1Wins, team2Wins } = data;

    if (team1Wins === team2Wins) {
      return `H2H: Series tied ${team1Wins}–${team2Wins}`;
    }

    // Determine which team is leading
    const leadingTeam = team1Wins > team2Wins ? team1Name : team2Name;
    const leadingWins = Math.max(team1Wins, team2Wins);
    const trailingWins = Math.min(team1Wins, team2Wins);

    // Truncate team name if too long (for mobile)
    const truncatedName = leadingTeam.length > 20 
      ? leadingTeam.substring(0, 17) + "..." 
      : leadingTeam;

    return `H2H: ${truncatedName} leads ${leadingWins}–${trailingWins}`;
  };

  return (
    <div className="text-xs text-muted-foreground text-center mt-1">
      {getDisplayText()}
    </div>
  );
};
