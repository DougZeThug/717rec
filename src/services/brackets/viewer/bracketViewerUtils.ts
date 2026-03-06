import { PlayoffMatch } from '@/utils/playoffs/playoffTypes';

import { ViewerMatch } from './types';

/**
 * Map integer status codes (from brackets-manager SQL) to string status labels
 */
export function mapStatusToString(status: number): ViewerMatch['status'] {
  const statusMap: Record<number, ViewerMatch['status']> = {
    0: 'locked',
    1: 'waiting',
    2: 'ready',
    3: 'running',
    4: 'completed',
    5: 'archived',
  };
  return statusMap[status] || 'waiting';
}

/**
 * Calculate bracket size as the next power of 2 that fits all seeds
 */
export function calculateBracketSize(matches: PlayoffMatch[]): number {
  if (matches.length === 0) return 8;

  const seeds = matches
    .flatMap((m) => [m.team1Seed, m.team2Seed])
    .filter((seed): seed is number => seed !== null && seed !== undefined);

  if (seeds.length === 0) return 8;

  const maxSeed = Math.max(...seeds);
  return Math.pow(2, Math.ceil(Math.log2(maxSeed || 8)));
}
