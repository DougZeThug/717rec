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
  prefetchedData?: HeadToHeadData | null;
  isBatchLoading?: boolean;
}

export const MatchHeadToHead: React.FC<MatchHeadToHeadProps> = ({
  team1Id,
  team2Id,
  team1Name,
  team2Name,
  prefetchedData,
  isBatchLoading = false,
}) => {
  const shouldFetchIndividually = prefetchedData === undefined && !isBatchLoading;
  const { data: individualData, isLoading: individualLoading } = useMatchHeadToHead(
    shouldFetchIndividually ? team1Id : null,
    shouldFetchIndividually ? team2Id : null
  );

  const data = prefetchedData !== undefined ? prefetchedData : individualData;
  const isLoading = isBatchLoading || (shouldFetchIndividually && individualLoading);

  if (isLoading) {
    return <Skeleton className="h-4 w-32 mx-auto" />;
  }

  if (!data) {
    return null;
  }

  const isFirstMeeting = 'isFirstMeeting' in data ? data.isFirstMeeting : data.totalMatches === 0;
  const { team1Wins, team2Wins, totalMatches } = data;

  const getRivalryTag = (): { label: string; className: string } | null => {
    if (isFirstMeeting || totalMatches < 3) return null;

    const team1WinPct = (team1Wins / totalMatches) * 100;
    const team2WinPct = (team2Wins / totalMatches) * 100;

    if (team1WinPct <= 18 || team2WinPct <= 18) {
      return {
        label: 'Nemesis',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      };
    }
    if (team1WinPct <= 30 || team2WinPct <= 30) {
      return {
        label: 'Tough Matchup',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      };
    }
    if (Math.abs(team1Wins - team2Wins) <= 1) {
      return {
        label: 'Rivalry',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      };
    }
    if (team1WinPct >= 83 || team2WinPct >= 83) {
      return {
        label: 'Dominated',
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      };
    }
    if (team1WinPct >= 70 || team2WinPct >= 70) {
      return {
        label: 'Favorite',
        className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      };
    }
    return null;
  };

  const getDisplayContent = () => {
    if (isFirstMeeting) {
      return { prefix: 'H2H:', text: 'First meeting', highlightTeam: null };
    }

    if (team1Wins === team2Wins) {
      return { prefix: 'H2H:', text: `Series tied ${team1Wins}–${team2Wins}`, highlightTeam: null };
    }

    const leadingTeam = team1Wins > team2Wins ? team1Name : team2Name;
    const leadingWins = Math.max(team1Wins, team2Wins);
    const trailingWins = Math.min(team1Wins, team2Wins);
    const truncatedName =
      leadingTeam.length > 18 ? leadingTeam.substring(0, 15) + '…' : leadingTeam;

    return {
      prefix: 'H2H:',
      text: `leads ${leadingWins}–${trailingWins}`,
      highlightTeam: truncatedName,
    };
  };

  const rivalryTag = getRivalryTag();
  const content = getDisplayContent();

  return (
    <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5 flex-wrap">
      <span className="font-medium">{content.prefix}</span>
      {content.highlightTeam && (
        <span className="font-bold text-foreground">{content.highlightTeam}</span>
      )}
      <span>{content.text}</span>
      {rivalryTag && (
        <span
          className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', rivalryTag.className)}
        >
          {rivalryTag.label}
        </span>
      )}
    </div>
  );
};
