
import React from "react";

export interface ChartDataItem {
  name: string;
  wins: number;
  losses: number;
  winPercentage: number; // legacy, but data uses win_percentage
  powerScore: number;
  imageUrl?: string | null;
  logoUrl?: string | null;
  id: string;
  win_percentage?: number; // add for compatibility with v_team_details
}

export function useSortedWinLossData(
  data: ChartDataItem[] = [],
  chartLimit: number
) {
  return React.useMemo(() => {
    if (!Array.isArray(data)) return [];

    // Filter out teams without win_percentage (safety for correct input)
    const filtered = data.filter(
      (team) => typeof team.win_percentage === "number"
    );

    const sortedData = filtered
      .sort((a, b) => {
        // 1. win_percentage descending
        if (b.win_percentage !== a.win_percentage) {
          return (b.win_percentage ?? 0) - (a.win_percentage ?? 0);
        }
        // 2. total wins descending
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        // 3. alphabetical
        const aName = (a.name ?? "").toLowerCase();
        const bName = (b.name ?? "").toLowerCase();
        return aName.localeCompare(bName);
      })
      // Allow teams with 0–0 or undefined records if chartLimit not reached
      .filter((team, index) => {
        const hasPlayed = (team.wins ?? 0) + (team.losses ?? 0) > 0;
        return hasPlayed || index < chartLimit;
      })
      .slice(0, chartLimit)
      .map((team, idx) => {
        const tooltipName =
          typeof team.name === "string" && team.name.trim().length > 0
            ? team.name
            : `Team ${idx + 1}`;
        // Unique, ordered display name for chart X axis
        return {
          ...team,
          displayName: `${idx + 1}. ${tooltipName}`,
          tooltipName,
          calculatedWinPct: team.win_percentage ?? 0, // for backward compat/tooltips
        };
      });

    // Debug output for chart order and win pct
    console.log(
      "✅ [useSortedWinLossData] Sorted Win-Loss Chart Data:",
      sortedData.map((t, i) => ({
        displayName: t.displayName,
        winPct: t.win_percentage?.toFixed(3),
        wins: t.wins,
        losses: t.losses,
        idx: i,
      }))
    );

    return sortedData;
  }, [data, chartLimit]);
}
