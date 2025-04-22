
import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import WinLossChart from "./WinLossChart";
import PowerScoreChart from "./PowerScoreChart";

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

interface StatsChartsProps {
  chartData: ChartDataItem[];
  chartLimit: number;
  dividerClass?: string;
}

const StatsCharts = ({ chartData, chartLimit, dividerClass = "" }: StatsChartsProps) => {
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();

  const topByPowerScore = useMemo(() => (
    [...chartData]
      .sort((a, b) => b.powerScore - a.powerScore)
      .slice(0, 10)
      .map(team => ({
        name: team.name,
        powerScore: team.powerScore
      }))
  ), [chartData]);

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 font-inter`}>
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 xl:col-span-2`}>
        <div className="text-xl font-semibold font-oswald uppercase tracking-wide flex items-center">
            Win-Loss Records
        </div>
        <div className={dividerClass || "border-b border-gray-200 dark:border-gray-700 w-full mt-2 mb-4"}></div>
        <CardDescription 
          className="!text-[#444444] dark:!text-gray-400 mb-2"
        >
          Top {chartLimit} teams by win percentage
        </CardDescription>
        <div className="p-0 pt-2">
          <WinLossChart data={chartData} chartLimit={chartLimit} isMobile={isMobile} />
        </div>
      </div>
      {!isMobile && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
          <div className="text-xl font-semibold font-oswald uppercase tracking-wide flex items-center">
              Top 8 Power Scores
          </div>
          <div className={dividerClass || "border-b border-gray-200 dark:border-gray-700 w-full mt-2 mb-4"}></div>
          <CardDescription 
            className="!text-[#444444] dark:!text-gray-400 mb-2"
          >
            Elite team performance ranking
          </CardDescription>
          <div className="p-0 pt-2">
            <PowerScoreChart data={topByPowerScore} />
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsCharts;
