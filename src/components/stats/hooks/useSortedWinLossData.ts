import React from 'react';

import { chartLog } from '@/utils/logger';

export interface ChartDataItem {
  name: string;
  wins: number;
  losses: number;
  winPercentage?: number; // legacy field
  powerScore?: number;
  imageUrl?: string | null;
  logoUrl?: string | null;
  id: string;
  win_percentage?: number; // from v_team_details
}

export function useSortedWinLossData(data: ChartDataItem[] = [], chartLimit: number) {
  return React.useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      chartLog('No data provided to useSortedWinLossData or data is not an array');
      return [];
    }

    chartLog(
      'Raw data received in useSortedWinLossData:',
      data.map((team) => ({
        name: team.name,
        wins: team.wins,
        losses: team.losses,
        win_percentage: team.win_percentage,
        winPercentage: team.winPercentage,
      }))
    );

    // Add calculated win percentage if not present
    const dataWithWinPct = data.map((team) => {
      // Use provided win_percentage if available, otherwise calculate it
      const totalGames = (team.wins || 0) + (team.losses || 0);
      const calculatedWinPct = totalGames === 0 ? 0 : team.wins / totalGames;

      return {
        ...team,
        // Use win_percentage if present, fall back to winPercentage or calculation
        win_percentage:
          typeof team.win_percentage === 'number'
            ? team.win_percentage
            : typeof team.winPercentage === 'number'
              ? team.winPercentage
              : calculatedWinPct,
      };
    });

    // Now sort and filter with the normalized data
    const sortedData = dataWithWinPct
      .sort((a, b) => {
        // 1. win_percentage descending
        if (b.win_percentage !== a.win_percentage) {
          return b.win_percentage - a.win_percentage;
        }
        // 2. total wins descending
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        // 3. alphabetical
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        return aName.localeCompare(bName);
      })
      // Allow teams with 0–0 records if chartLimit not reached
      .filter((team, index) => {
        const hasPlayed = (team.wins || 0) + (team.losses || 0) > 0;
        return hasPlayed || index < chartLimit;
      })
      .slice(0, chartLimit)
      .map((team, idx) => {
        // Format display name and tooltip
        const tooltipName =
          typeof team.name === 'string' && team.name.trim().length > 0
            ? team.name
            : `Team ${idx + 1}`;

        return {
          ...team,
          displayName: `${idx + 1}. ${tooltipName}`,
          tooltipName,
          calculatedWinPct: team.win_percentage || 0, // For backward compatibility with tooltips
        };
      });

    // Debug output for chart order and win pct
    chartLog(
      'Win–Loss Chart Final Sorted Data:',
      sortedData.map((t, i) => ({
        name: t.name,
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
