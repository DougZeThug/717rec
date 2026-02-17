import type { SeasonStats } from './types';

export interface PlayoffConsistency {
  seasonsPlayed: number;
  seasonsInPlayoffs: number;
  playoffRate: number;
}

export interface SeedPerformance {
  seasonName: string;
  divisionName: string;
  finish: number;
  isChampion: boolean;
  isRunnerUp: boolean;
}

/**
 * Calculates how consistently a team makes the playoffs across seasons.
 * A team "made playoffs" if they have a non-null playoff_rank for that season.
 */
export const calculatePlayoffConsistency = (
  seasonStats: SeasonStats[] | null
): PlayoffConsistency => {
  if (!seasonStats || seasonStats.length === 0) {
    return { seasonsPlayed: 0, seasonsInPlayoffs: 0, playoffRate: 0 };
  }

  const seasonsPlayed = seasonStats.length;
  const seasonsInPlayoffs = seasonStats.filter((s) => s.playoff_rank != null).length;
  const playoffRate = seasonsPlayed > 0 ? (seasonsInPlayoffs / seasonsPlayed) * 100 : 0;

  return { seasonsPlayed, seasonsInPlayoffs, playoffRate };
};

/**
 * Gets notable playoff finishes for narrative display.
 * Returns the best finishes with labels.
 */
export const getPlayoffFinishLabel = (rank: number): string => {
  if (rank === 1) return 'Champion';
  if (rank === 2) return 'Runner-up';
  if (rank === 3) return 'Third Place';
  return `#${rank}`;
};
