import React from 'react';

import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';
import { ChartDataItem } from '@/types/chart';
import { chartLog } from '@/utils/logger';

import { useSortedWinLossData } from './hooks/useSortedWinLossData';
import WinLossBarChart from './WinLossBarChart';

interface WinLossChartProps {
  data: ChartDataItem[];
  chartLimit: number;
  isMobile: boolean;
}

const WinLossChart: React.FC<WinLossChartProps> = ({ data, chartLimit, isMobile }) => {
  // Add debug logging to see what's coming from upstream
  chartLog(
    'WinLossChart received data:',
    data?.length,
    'teams with win_percentage example:',
    data?.[0]?.win_percentage
  );

  const sortedData = useSortedWinLossData(data, chartLimit);

  // More debugging information
  chartLog(
    'Final sorted chart data (as used by WinLossChart):',
    sortedData.map((t) => ({
      name: t.displayName,
      wins: t.wins,
      losses: t.losses,
      pct: t.calculatedWinPct || t.win_percentage,
    }))
  );

  return (
    <div className={cn('w-full h-full', animations.fadeIn, 'animation-delay-200')}>
      <WinLossBarChart data={sortedData} isMobile={isMobile} />
    </div>
  );
};

export default WinLossChart;
