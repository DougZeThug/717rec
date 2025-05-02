
import React from "react";
import WinLossBarChart from "./WinLossBarChart";
import { useSortedWinLossData } from "./hooks/useSortedWinLossData";
import { ChartDataItem } from "@/types/chart";

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
  // Add debug logging to see what's coming from upstream
  console.log(
    "📊 WinLossChart received data:",
    data?.length,
    "teams with win_percentage example:",
    data?.[0]?.win_percentage
  );

  const sortedData = useSortedWinLossData(data, chartLimit);
  
  // More debugging information
  console.log(
    "✅ Final sorted chart data (as used by WinLossChart):",
    sortedData.map((t) => ({
      name: t.displayName,
      wins: t.wins,
      losses: t.losses,
      pct: t.calculatedWinPct || t.win_percentage,
    }))
  );

  return (
    <WinLossBarChart data={sortedData} isMobile={isMobile} />
  );
};

export default WinLossChart;
