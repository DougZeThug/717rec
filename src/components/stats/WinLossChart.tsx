
import React from "react";
import WinLossBarChart from "./WinLossBarChart";
import { useTheme } from "next-themes";
import { useSortedWinLossData } from "./hooks/useSortedWinLossData";

interface ChartDataItem {
  name: string;
  wins: number;
  losses: number;
  winPercentage: number;
  powerScore: number;
  imageUrl?: string | null;
  logoUrl?: string | null;
  id: string;
}

interface WinLossChartProps {
  data: ChartDataItem[];
  chartLimit: number;
  isMobile: boolean;
}

const WinLossChart: React.FC<WinLossChartProps> = ({
  data,
  chartLimit,
  isMobile,
}) => {
  const sortedData = useSortedWinLossData(data, chartLimit);

  // Log sorted data for debugging
  console.log(
    "✅ Final sorted chart data (as used by WinLossChart):",
    sortedData.map((t) => ({
      name: t.displayName,
      wins: t.wins,
      losses: t.losses,
      pct: t.calculatedWinPct,
    }))
  );

  return (
    <WinLossBarChart data={sortedData} isMobile={isMobile} />
  );
};

export default WinLossChart;
