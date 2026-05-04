import { format } from 'date-fns';
import React from 'react';

import { getHistoryDivisionDisplayName } from '@/utils/historyDivisionUtils';

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface SeasonData {
  team_id: string;
  season_id: string;
  match_wins: number;
  match_losses: number;
  game_wins: number;
  game_losses: number;
  sos: number | null;
  power_score: number | null;
  champion: boolean;
  runner_up: boolean;
  division_name: string | null;
  playoff_rank: number | null;
  team_name: string;
  team_logo_url: string | null;
  team_image_url: string | null;
}

export const useSeasonAccordionViewModel = (season: Season, seasonData?: SeasonData[]) => {
  const visibleTeams = React.useMemo(
    () =>
      seasonData?.filter((team) => {
        const displayDivision = getHistoryDivisionDisplayName(team.division_name);
        return !displayDivision.toLowerCase().startsWith('hidden');
      }) ?? [],
    [seasonData]
  );

  const divisionData = React.useMemo(() => {
    return visibleTeams.reduce(
      (acc, team) => {
        const displayDivision = getHistoryDivisionDisplayName(team.division_name);
        if (!acc[displayDivision]) {
          acc[displayDivision] = [];
        }
        acc[displayDivision].push(team);
        return acc;
      },
      {} as Record<string, SeasonData[]>
    );
  }, [visibleTeams]);

  const hasChampions = seasonData?.some((team) => team.champion) || false;
  const championTeams = seasonData?.filter((team) => team.champion) || [];

  const teamCount = visibleTeams.length;
  const totalMatches = seasonData?.reduce((sum, t) => sum + (t.match_wins || 0) + (t.match_losses || 0), 0) || 0;
  const matchCount = Math.floor(totalMatches / 2);

  const highlights = React.useMemo(() => {
    if (!seasonData || seasonData.length === 0) return null;
    const mostWins = seasonData.reduce((max, team) => (team.match_wins > max.match_wins ? team : max), seasonData[0]);
    const highestPS = seasonData.reduce(
      (max, team) => ((team.power_score || 0) > (max.power_score || 0) ? team : max),
      seasonData[0]
    );
    const mostGameWins = seasonData.reduce((max, team) => (team.game_wins > max.game_wins ? team : max), seasonData[0]);
    return { mostWins, highestPS, mostGameWins };
  }, [seasonData]);

  const formatDateRange = () => {
    if (!season.start_date) return null;
    const startMonth = format(new Date(season.start_date), 'MMM yyyy');
    if (season.end_date) {
      const endMonth = format(new Date(season.end_date), 'MMM yyyy');
      return startMonth === endMonth ? startMonth : `${startMonth} – ${endMonth}`;
    }
    return startMonth;
  };

  return {
    divisionData,
    teamCount,
    matchCount,
    championTeams,
    hasChampions,
    highlights,
    formatDateRange,
  };
};
