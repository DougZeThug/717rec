
import React, { useState } from "react";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import WinLossChartCard from "./WinLossChartCard";
import PowerScoreChartCard from "./PowerScoreChartCard";
import { useChartData } from "./hooks/useChartData";
import { ChartBar, ChartPie, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";

interface StatsChartsProps {
  rankings: Ranking[];
  chartLimit: number;
}

type ChartType = "winLoss" | "powerScore";

const StatsCharts = ({ rankings, chartLimit }: StatsChartsProps) => {
  const isMobile = useIsMobile();
  const { winLossData, powerScoreData } = useChartData(rankings, chartLimit);
  const [activeChart, setActiveChart] = useState<ChartType>("winLoss");

  // Function to toggle between chart types on mobile
  const toggleChart = () => {
    setActiveChart(prev => prev === "winLoss" ? "powerScore" : "winLoss");
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4 font-inter">
      {/* On mobile: show either win-loss or power score chart based on toggle */}
      {isMobile ? (
        <div className="relative">
          <div className="absolute top-3 right-3 z-10">
            <button 
              onClick={toggleChart}
              className="bg-white dark:bg-gray-800 shadow-md rounded-full p-1.5 flex items-center gap-1 border border-gray-200 dark:border-gray-700"
            >
              {activeChart === "winLoss" ? (
                <>
                  <ChartBar className="h-4 w-4 text-blue-600" />
                  <ChartPie className="h-4 w-4 text-gray-400" />
                  <ChevronsRight className="h-3.5 w-3.5 text-gray-600" />
                </>
              ) : (
                <>
                  <ChartBar className="h-4 w-4 text-gray-400" />
                  <ChartPie className="h-4 w-4 text-purple-600" />
                  <ChevronsRight className="h-3.5 w-3.5 text-gray-600" />
                </>
              )}
            </button>
          </div>
          
          <div className={cn(
            "transition-all duration-300",
            activeChart !== "winLoss" && "hidden"
          )}>
            <WinLossChartCard 
              data={winLossData} 
              chartLimit={chartLimit} 
              isMobile={isMobile} 
            />
          </div>
          
          <div className={cn(
            "transition-all duration-300",
            activeChart !== "powerScore" && "hidden",
            animations.fadeIn
          )}>
            <PowerScoreChartCard data={powerScoreData} />
          </div>
        </div>
      ) : (
        // On desktop: show both charts side by side
        <>
          <WinLossChartCard 
            data={winLossData} 
            chartLimit={chartLimit} 
            isMobile={isMobile} 
          />
          
          <PowerScoreChartCard data={powerScoreData} />
        </>
      )}
    </div>
  );
};

export default StatsCharts;
