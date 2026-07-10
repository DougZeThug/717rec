import { SeasonBreakdown } from '@/types/teamAdvancedStats';

import { processSeasonMatches } from './calculations';
import type { MatchRecord, PlayoffMatchRecord, SeasonStatRow } from './types';

/** Assembles one team season row plus grouped matches into UI-ready season breakdown metrics. */
export const buildSeasonBreakdown = (
  stat: SeasonStatRow,
  teamId: string,
  matchesBySeason: Map<string, MatchRecord[]>,
  playoffMatchesBySeason: Map<string, PlayoffMatchRecord[]>,
  teamDivisionMap: Map<string, string>
): SeasonBreakdown => {
  const seasonId = stat.season_id;
  const seasonMatches = matchesBySeason.get(seasonId) || [];
  const seasonPlayoffMatches = playoffMatchesBySeason.get(seasonId) || [];

  const { sweeps, closeWins, closeLosses, divisionRecords, playoffWins, playoffLosses } =
    processSeasonMatches(teamId, seasonId, seasonMatches, seasonPlayoffMatches, teamDivisionMap);

  const totalMatches = (stat.match_wins || 0) + (stat.match_losses || 0);
  const winPct = totalMatches > 0 ? ((stat.match_wins || 0) / totalMatches) * 100 : 0;

  const totalGames = (stat.game_wins || 0) + (stat.game_losses || 0);
  const gameWinPct = totalGames > 0 ? ((stat.game_wins || 0) / totalGames) * 100 : 0;

  const sweepRate = totalMatches > 0 ? (sweeps / totalMatches) * 100 : 0;
  const totalCloseMatches = closeWins + closeLosses;
  const clutchFactor = totalCloseMatches > 0 ? closeWins / totalCloseMatches : null;

  const seasonInfo = stat.seasons;

  return {
    seasonId,
    seasonName: seasonInfo?.name ?? 'Unknown',
    divisionName: stat.division_name || 'Unknown',
    matchWins: stat.match_wins || 0,
    matchLosses: stat.match_losses || 0,
    winPct,
    gameWins: stat.game_wins || 0,
    gameLosses: stat.game_losses || 0,
    gameWinPct,
    sos: stat.sos,
    powerScore: stat.power_score !== null ? stat.power_score * 100 : null,
    playoffWins,
    playoffLosses,
    playoffRank: stat.playoff_rank,
    isChampion: stat.champion || false,
    isRunnerUp: stat.runner_up || false,
    isTop3: stat.playoff_rank !== null && stat.playoff_rank <= 3,
    sweeps,
    sweepRate,
    closeWins,
    closeLosses,
    clutchFactor,
    divisionRecords,
  };
};
