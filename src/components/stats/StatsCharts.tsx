
import React from "react";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import WinLossChartCard from "./WinLossChartCard";
import PowerScoreChartCard from "./PowerScoreChartCard";
import { useChartData } from "./hooks/useChartData";

interface StatsChartsProps {
  rankings: Ranking[];
  chartLimit: number;
}

const StatsCharts = ({ rankings, chartLimit }: StatsChartsProps) => {
  const isMobile = useIsMobile();
  const { winLossData, powerScoreData } = useChartData(rankings, chartLimit);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4 font-inter">
      <WinLossChartCard 
        data={winLossData} 
        chartLimit={chartLimit} 
        isMobile={isMobile} 
      />
      
      {!isMobile && (
        <PowerScoreChartCard data={powerScoreData} />
      )}
    </div>
  );
};

export default StatsCharts;
