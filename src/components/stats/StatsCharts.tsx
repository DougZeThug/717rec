
import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
  const isLight = resolvedTheme === "light";

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
      <Card className={`${isMobile ? "" : "xl:col-span-2"} ${isLight ? "bg-white border border-[#e5e7eb] shadow-sm" : "bg-[#20232A] dark:border-0"} rounded-xl`}>
        <CardHeader className="pb-2 rounded-t-xl" style={isLight ? { borderBottom: "1px solid #e5e7eb", borderTopLeftRadius: 12, borderTopRightRadius: 12, background: "#fff" } : {}}>
          <CardTitle className={`${isLight ? "text-[#111111]" : "text-white"} font-bold`}>Win-Loss Records</CardTitle>
          <CardDescription className={isLight ? "text-[#4b5563]" : "text-gray-200"}>
            Top {chartLimit} teams by win percentage
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <WinLossChart data={chartData} chartLimit={chartLimit} isMobile={isMobile} />
        </CardContent>
      </Card>
      {!isMobile && (
        <Card className={`${isLight ? "bg-white border border-[#e5e7eb] shadow-sm" : "bg-[#20232A] dark:border-0"} rounded-xl`}>
          <CardHeader className="pb-2 rounded-t-xl" style={isLight ? { borderBottom: "1px solid #e5e7eb", borderTopLeftRadius: 12, borderTopRightRadius: 12, background: "#fff" } : {}}>
            <CardTitle className={`${isLight ? "text-[#111111]" : "text-white"} font-bold`}>Top 10 Power Scores</CardTitle>
            <CardDescription className={isLight ? "text-[#4b5563]" : "text-gray-200"}>
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
