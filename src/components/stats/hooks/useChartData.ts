
import { useMemo } from "react";
import { Ranking } from "@/types";
import { ChartDataItem, PowerScoreDataItem } from "@/types/chart";

export const useChartData = (rankings: Ranking[], chartLimit: number) => {
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

  return {
    winLossData,
    powerScoreData
  };
};
