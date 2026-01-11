import React, { useMemo, useState, useTransition } from 'react';

import { useIsMobile } from '@/hooks/use-mobile';
import { Ranking } from '@/types';
import { sortRankings } from '@/utils/rankingUtils';

import RankingsDesktopView from './RankingsDesktopView';
import RankingsMobileView from './RankingsMobileView';

interface RankingsTableProps {
  rankings: Ranking[];
  showUnified?: boolean;
  myTeamId?: string | null;
}

export type SortDirection = 'asc' | 'desc';
export interface SortOptions {
  field: string;
  direction: SortDirection;
}

const RankingsTable: React.FC<RankingsTableProps> = ({
  rankings,
  showUnified = false,
  myTeamId,
}) => {
  const isMobile = useIsMobile();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sortOptions, setSortOptions] = useState<SortOptions>(() => {
    const savedSort = localStorage.getItem('rankingsSortOptions');
    if (savedSort) {
      try {
        const parsed = JSON.parse(savedSort);
        const direction: SortDirection = parsed.direction === 'asc' ? 'asc' : 'desc';
        return {
          field: parsed.field || 'powerScore',
          direction,
        };
      } catch {
        // Silently use defaults if parsing fails
      }
    }
    return { field: 'powerScore', direction: 'desc' };
  });

  const toggleExpand = (teamId: string) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  // Memoize sorted rankings - only recalculate when rankings or sort options change
  const sortedRankings = useMemo(
    () => sortRankings(rankings, sortOptions.field, sortOptions.direction),
    [rankings, sortOptions.field, sortOptions.direction]
  );

  // Memoize division rank calculations - only recalculate when sorted rankings change
  const rankingsWithDivisionRanks = useMemo(
    () =>
      sortedRankings.map((ranking) => {
        const divisionTeams = sortedRankings.filter((r) => r.divisionName === ranking.divisionName);
        const sortedDivisionTeams = sortRankings(
          divisionTeams,
          sortOptions.field,
          sortOptions.direction
        );
        const divisionRank = sortedDivisionTeams.findIndex((r) => r.teamId === ranking.teamId) + 1;

        return {
          ...ranking,
          divisionRank: ranking.divisionName ? divisionRank : undefined,
        };
      }),
    [sortedRankings, sortOptions.field, sortOptions.direction]
  );

  const handleSortChange = (field: string) => {
    const newDirection: SortDirection =
      sortOptions.field === field && sortOptions.direction === 'desc' ? 'asc' : 'desc';
    const newSortOptions: SortOptions = {
      field,
      direction: newDirection,
    };

    // Use startTransition for non-urgent UI update
    startTransition(() => {
      setSortOptions(newSortOptions);
    });

    localStorage.setItem('rankingsSortOptions', JSON.stringify(newSortOptions));
  };

  if (isMobile) {
    return (
      <RankingsMobileView
        rankings={rankingsWithDivisionRanks}
        expandedTeam={expandedTeam}
        toggleExpand={toggleExpand}
        sortOptions={sortOptions}
        onSortChange={handleSortChange}
        showUnified={showUnified}
        myTeamId={myTeamId}
      />
    );
  }

  return (
    <RankingsDesktopView
      rankings={rankingsWithDivisionRanks}
      expandedTeam={expandedTeam}
      toggleExpand={toggleExpand}
      sortOptions={sortOptions}
      onSortChange={handleSortChange}
      showUnified={showUnified}
    />
  );
};

export default RankingsTable;
