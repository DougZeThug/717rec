
import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import WinLossChart from "./WinLossChart";
import PowerScoreChart from "./PowerScoreChart";
import { ChartDataItem } from "@/types/chart";
import { Ranking } from "@/types";

interface StatsChartsProps {
  rankings: Ranking[];
  chartLimit: number;
}

const StatsCharts = ({ rankings, chartLimit }: StatsChartsProps) => {
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();

  // Process data for win-loss chart - sort by win percentage
  const winLossData = useMemo(() => {
    return [...rankings]
      .sort((a, b) => b.winPercentage - a.winPercentage) // Sort by win percentage
      .slice(0, chartLimit)
      .map(team => ({
        id: team.teamId,
        name: team.teamName,
        wins: team.wins,
        losses: team.losses,
        winPercentage: Number((team.winPercentage * 100).toFixed(1)),
        imageUrl: team.imageUrl,
        logoUrl: team.logoUrl
      }));
  }, [rankings, chartLimit]);
  
  // Process data for power score chart - sort by power score
  const powerScoreData = useMemo(() => {
    return [...rankings]
      .sort((a, b) => b.powerScore - a.powerScore) // Sort by power score
      .slice(0, 8) // Show top 8 by power score
      .map(team => ({
        name: team.teamName,
        powerScore: team.powerScore,
        id: team.teamId
      }));
  }, [rankings]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4 font-inter">
      <Card className={`${isMobile ? "" : "xl:col-span-2"} bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#20232A] dark:border-0 dark:text-white rounded-xl shadow-sm`}>
        <CardHeader className="pb-1.5 rounded-t-xl"
          style={resolvedTheme === "light" ? { borderBottom: "1px solid #e0e0e0", borderTopLeftRadius: 12, borderTopRightRadius: 12, background: "#fff" } : {}}>
          <CardTitle
            className="text-lg sm:text-xl font-semibold font-inter tracking-wide text-gray-800 dark:text-white uppercase"
            style={{ letterSpacing: ".03em" }}
          >
            Win-Loss Records
          </CardTitle>
          <CardDescription
            className="text-sm text-gray-600 dark:text-gray-300 font-inter"
          >
            Top {chartLimit} teams by win percentage
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <WinLossChart data={winLossData} chartLimit={chartLimit} isMobile={isMobile} />
        </CardContent>
      </Card>
      {!isMobile && (
        <Card className="bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#20232A] dark:border-0 dark:text-white rounded-xl shadow-sm">
          <CardHeader className="pb-1.5 rounded-t-xl" 
            style={resolvedTheme === "light" ? { borderBottom: "1px solid #e0e0e0", borderTopLeftRadius: 12, borderTopRightRadius: 12, background: "#fff" } : {}}>
            <CardTitle
              className="text-lg font-semibold font-inter tracking-wide text-gray-800 dark:text-white uppercase"
              style={{ letterSpacing: ".03em" }}
            >
              Top 8 Power Scores
            </CardTitle>
            <CardDescription
              className="text-sm text-gray-600 dark:text-gray-300 font-inter"
            >
              Elite team performance ranking
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <PowerScoreChart data={powerScoreData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatsCharts;
