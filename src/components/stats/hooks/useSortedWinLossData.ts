
import React from "react";

export interface ChartDataItem {
  name: string;
  wins: number;
  losses: number;
  winPercentage: number;
  powerScore: number;
  imageUrl?: string | null;
  logoUrl?: string | null;
  id: string;
}

export function useSortedWinLossData(
  data: ChartDataItem[] = [],
  chartLimit: number
) {
  // Always memoize on data and chartLimit
  return React.useMemo(() => {
    if (!Array.isArray(data)) return [];

    // Defensive: assign displayName, fallback, and pre-calculate for sort
    const dataClone = data.map((team, index) => {
      const wins = typeof team.wins === "number" ? team.wins : 0;
      const losses = typeof team.losses === "number" ? team.losses : 0;
      const totalGames = wins + losses;
      // Fallback for tooltipName (full string)
      const tooltipName =
        typeof team.name === "string" && team.name.trim().length > 0
          ? team.name
          : `Team ${index + 1}`;
      return {
        ...team,
        wins,
        losses,
        calculatedWinPct: totalGames === 0 ? 0 : wins / totalGames,
        sortIndex: index,
        tooltipName,
      };
    });

    const processedData = dataClone
      .sort((a, b) => {
        // Primary: win percentage
        if (b.calculatedWinPct !== a.calculatedWinPct) {
          return b.calculatedWinPct - a.calculatedWinPct;
        }
        // Secondary: total wins
        return b.wins - a.wins;
      })
      .filter((team, index) => {
        const hasPlayed = team.wins + team.losses > 0;
        // Allow teams with no games if we still have chart space
        return hasPlayed || index < chartLimit;
      })
      .slice(0, chartLimit)
      .map((team, index) => {
        // Unique displayName for chart category: "1. Team Name" etc
        const displayName = `${index + 1}. ${team.tooltipName}`;
        return {
          ...team,
          displayName,
        };
      });

    // Console log for debugging sorted order and display keys
    console.log(
      "✅ useSortedWinLossData result",
      processedData.map((t, i) => ({
        displayName: t.displayName,
        tooltipName: t.tooltipName,
        wins: t.wins,
        losses: t.losses,
        winPct: t.calculatedWinPct.toFixed(3),
        idx: i,
      }))
    );
    return processedData;
  }, [data, chartLimit]);
}
