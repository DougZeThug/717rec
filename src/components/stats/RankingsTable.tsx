import React, { useMemo, useState } from 'react';

import { useIsMobile } from '@/hooks/useMobile';
import { Ranking } from '@/types';
import { sortRankings } from '@/utils/rankingUtils';

import RankingsDesktopView from './RankingsDesktopView';
import RankingsMobileView from './RankingsMobileView';

interface RankingsTableProps {
  rankings: Ranking[];
  showUnified?: boolean;
  myTeamId?: string | null;
  view?: 'division' | 'all';
  onViewChange?: (view: 'division' | 'all') => void;
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
  view,
  onViewChange,
}) => {
  const isMobile = useIsMobile();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'powerScore',
    direction: 'desc',
  });

  const toggleExpand = (teamId: string) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  // Memoize sorted rankings - only recalculate when rankings or sort options change
  const sortedRankings = useMemo(
    () => sortRankings(rankings, sortOptions.field, sortOptions.direction),
    [rankings, sortOptions.field, sortOptions.direction]
  );

  // Memoize division rank calculations with optimized O(n log n) algorithm
  // Instead of filtering and sorting for each team, we group by division once
  const rankingsWithDivisionRanks = useMemo(() => {
    // Group rankings by division in a single pass O(n)
    const divisionMap = new Map<string, Ranking[]>();
    for (const ranking of sortedRankings) {
      if (ranking.divisionName) {
        const divisionRankings = divisionMap.get(ranking.divisionName) || [];
        divisionRankings.push(ranking);
        divisionMap.set(ranking.divisionName, divisionRankings);
      }
    }

    // Sort each division once O(k * (n/k) log(n/k)) = O(n log n)
    const divisionRanks = new Map<string, Map<string, number>>();
    for (const [divisionName, divisionRankings] of divisionMap.entries()) {
      const sorted = sortRankings(divisionRankings, sortOptions.field, sortOptions.direction);
      const rankMap = new Map<string, number>();
      sorted.forEach((r, index) => rankMap.set(r.teamId, index + 1));
      divisionRanks.set(divisionName, rankMap);
    }

    // Map over rankings and look up pre-computed rank O(n)
    return sortedRankings.map((ranking) => ({
      ...ranking,
      divisionRank: ranking.divisionName
        ? divisionRanks.get(ranking.divisionName)?.get(ranking.teamId)
        : undefined,
    }));
  }, [sortedRankings, sortOptions.field, sortOptions.direction]);

  const handleSortChange = (field: string) => {
    const newDirection: SortDirection =
      sortOptions.field === field && sortOptions.direction === 'desc' ? 'asc' : 'desc';
    const newSortOptions: SortOptions = {
      field,
      direction: newDirection,
    };

    setSortOptions(newSortOptions);

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
        view={view}
        onViewChange={onViewChange}
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
