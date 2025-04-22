
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
}

const StatsCharts = ({ chartData, chartLimit }: StatsChartsProps) => {
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();

  // Top 10 for PowerScore chart
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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 font-inter">
      <Card className={`${isMobile ? "" : "xl:col-span-2"} bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#20232A] dark:border-0 dark:text-white rounded-xl shadow-sm`}>
        <CardHeader className="pb-2 rounded-t-xl"
          style={resolvedTheme === "light" ? { borderBottom: "1px solid #e0e0e0", borderTopLeftRadius: 12, borderTopRightRadius: 12, background: "#fff" } : {}}>
          <CardTitle 
            className="text-lg font-semibold text-gray-800 dark:text-white"
          >
            Win-Loss Records
          </CardTitle>
          <CardDescription 
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            Top {chartLimit} teams by win percentage
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <WinLossChart data={chartData} chartLimit={chartLimit} isMobile={isMobile} />
        </CardContent>
      </Card>
      {!isMobile && (
        <Card className="bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#20232A] dark:border-0 dark:text-white rounded-xl shadow-sm">
          <CardHeader className="pb-2 rounded-t-xl" 
            style={resolvedTheme === "light" ? { borderBottom: "1px solid #e0e0e0", borderTopLeftRadius: 12, borderTopRightRadius: 12, background: "#fff" } : {}}>
            <CardTitle
              className="text-lg font-semibold text-gray-800 dark:text-white"
            >
              Top 10 Power Scores
            </CardTitle>
            <CardDescription 
              className="text-sm text-gray-600 dark:text-gray-300"
            >
              Elite team performance ranking
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <PowerScoreChart data={topByPowerScore} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatsCharts;
