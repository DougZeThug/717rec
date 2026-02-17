import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import type { HeadToHeadData } from '@/hooks/useBatchHeadToHead';
import { useMatchHeadToHead } from '@/hooks/useMatchHeadToHead';
import { cn } from '@/lib/utils';

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

  const { team1Wins, team2Wins, totalMatches } = data;

  // Determine rivalry context for notable matchups
  const getRivalryTag = (): { label: string; className: string } | null => {
    if (isFirstMeeting || totalMatches < 2) return null;

    // Closest rivalry: near-.500 with 3+ matches
    if (totalMatches >= 3 && Math.abs(team1Wins - team2Wins) <= 1) {
      return {
        label: 'Rivalry',
        className: 'text-amber-600 dark:text-amber-400',
      };
    }

    // One team has never lost (dominant / nemesis)
    if (team1Wins === 0 && team2Wins > 0) {
      return {
        label: 'Nemesis',
        className: 'text-red-600 dark:text-red-400',
      };
    }
    if (team2Wins === 0 && team1Wins > 0) {
      return {
        label: 'Nemesis',
        className: 'text-red-600 dark:text-red-400',
      };
    }

    return null;
  };

  // Format the display text
  const getDisplayText = (): string => {
    if (isFirstMeeting) {
      return 'H2H: First meeting';
    }

    if (team1Wins === team2Wins) {
      return `H2H: Series tied ${team1Wins}–${team2Wins}`;
    }

    // Determine which team is leading
    const leadingTeam = team1Wins > team2Wins ? team1Name : team2Name;
    const leadingWins = Math.max(team1Wins, team2Wins);
    const trailingWins = Math.min(team1Wins, team2Wins);

    // Truncate team name if too long (for mobile)
    const truncatedName =
      leadingTeam.length > 20 ? leadingTeam.substring(0, 17) + '...' : leadingTeam;

    return `H2H: ${truncatedName} leads ${leadingWins}–${trailingWins}`;
  };

  const rivalryTag = getRivalryTag();

  return (
    <div className="text-xs text-muted-foreground text-center mt-1 flex items-center justify-center gap-1.5">
      <span>{getDisplayText()}</span>
      {rivalryTag && (
        <span className={cn('font-semibold', rivalryTag.className)}>
          {rivalryTag.label}
        </span>
      )}
    </div>
  );
};
