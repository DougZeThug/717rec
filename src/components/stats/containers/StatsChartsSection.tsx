import React from 'react';

import { useIsMobile } from '@/hooks/use-mobile';
import { Ranking } from '@/types';

import StatsCharts from '../StatsCharts';

interface StatsChartsSectionProps {
  rankings: Ranking[];
}

const StatsChartsSection = ({ rankings }: StatsChartsSectionProps) => {
  const isMobile = useIsMobile();
  // On mobile devices, show fewer teams in charts
  const chartLimit = isMobile ? 5 : 8;

  return (
    <div className="mb-4">
      <StatsCharts rankings={rankings} chartLimit={chartLimit} />
    </div>
  );
};

export default StatsChartsSection;
