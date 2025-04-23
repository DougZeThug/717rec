
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

    // Map data with calculated win percentage
    const dataWithCalculations = data.map((team, index) => {
      const wins = typeof team.wins === "number" ? team.wins : 0;
      const losses = typeof team.losses === "number" ? team.losses : 0;
      const totalGames = wins + losses;
      const tooltipName =
        typeof team.name === "string" && team.name.trim().length > 0
          ? team.name
          : `Team ${index + 1}`;
      const calculatedWinPct = totalGames === 0 ? 0 : wins / totalGames;
      
      return {
        ...team,
        wins,
        losses,
        calculatedWinPct,
        sortIndex: index,
        tooltipName,
      };
    });

    // Sort data by win percentage (descending), then wins (descending), then alphabetically
    const processedData = dataWithCalculations
      .sort((a, b) => {
        // Primary: win percentage
        if (b.calculatedWinPct !== a.calculatedWinPct) {
          return b.calculatedWinPct - a.calculatedWinPct;
        }
        // Secondary: total wins
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        // Tertiary: alphabetical by name (case-insensitive)
        const aName = (a.tooltipName || "").toLowerCase();
        const bName = (b.tooltipName || "").toLowerCase();
        if (aName < bName) return -1;
        if (aName > bName) return 1;
        return 0;
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
