import React, { useState } from 'react';
import { CareerRanking } from '@/types/career';
import { useIsMobile } from '@/hooks/use-mobile';
import CareerRankingsMobileView from './CareerRankingsMobileView';
import CareerRankingsDesktopView from './CareerRankingsDesktopView';

interface CareerRankingsTableProps {
  rankings: CareerRanking[];
}

export type CareerSortDirection = 'asc' | 'desc';
export interface CareerSortOptions {
  field: string;
  direction: CareerSortDirection;
}

const CareerRankingsTable: React.FC<CareerRankingsTableProps> = ({ rankings }) => {
  const isMobile = useIsMobile();
  const [sortOptions, setSortOptions] = useState<CareerSortOptions>({
    field: 'careerPowerScore',
    direction: 'desc'
  });

  const handleSortChange = (field: string) => {
    setSortOptions(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Sort rankings based on current sort options
  const sortedRankings = React.useMemo(() => {
    return [...rankings].sort((a, b) => {
      const { field, direction } = sortOptions;
      const aVal = a[field as keyof CareerRanking] as number;
      const bVal = b[field as keyof CareerRanking] as number;
      
      const result = direction === 'asc' ? aVal - bVal : bVal - aVal;
      return result;
    });
  }, [rankings, sortOptions]);

  if (isMobile) {
    return (
      <CareerRankingsMobileView
        rankings={sortedRankings}
        sortOptions={sortOptions}
        onSortChange={handleSortChange}
      />
    );
  }

  return (
    <CareerRankingsDesktopView
      rankings={sortedRankings}
      sortOptions={sortOptions}
      onSortChange={handleSortChange}
    />
  );
};

export default CareerRankingsTable;