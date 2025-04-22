
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
      // Fallback for displayName
      const displayName =
        typeof team.name === "string" && team.name.trim().length > 0
          ? team.name
          : `Team ${index + 1}`;
      return {
        ...team,
        wins,
        losses,
        calculatedWinPct: totalGames === 0 ? 0 : wins / totalGames,
        displayName,
        sortIndex: index,
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
      .slice(0, chartLimit);

    // Console log for debugging sorted order
    console.log("✅ useSortedWinLossData: Sorted", processedData.map(t => ({
      name: t.displayName,
      wins: t.wins,
      losses: t.losses,
      pct: t.calculatedWinPct,
    })));
    return processedData;
  }, [data, chartLimit]);
}

