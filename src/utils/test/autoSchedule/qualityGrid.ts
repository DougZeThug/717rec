import type { Team } from '@/types';
import type { TeamPair } from '@/types/autoSchedule';
import {
  isBothRecreational,
  isExtremeTierDifference,
} from '@/utils/autoSchedule/blossom/tierUtils';

import { type RatingRow, ratingRow } from './qualityHelpers';
import { seededRandom } from './seededRandom';
import { createMockTeam } from './testHelpers';

/**
 * The tier mixes of the grid, as Competitive / Intermediate / Recreational shares. A block of
 * any size takes the pattern in turn, so 1/2/1 gives C, I, I, R, C, I, I, R and so on.
 */
export const GRID_MIXES: Record<string, readonly string[]> = {
  '1/2/1': ['Competitive', 'Intermediate', 'Intermediate', 'Recreational'],
  '2/2/2': [
    'Competitive',
    'Competitive',
    'Intermediate',
    'Intermediate',
    'Recreational',
    'Recreational',
  ],
  '3/1/2': [
    'Competitive',
    'Competitive',
    'Competitive',
    'Intermediate',
    'Recreational',
    'Recreational',
  ],
};

/** The block sizes of the grid. All are even, because Standard mode stops on an odd block. */
export const GRID_SIZES = [6, 8, 10];

/** A random whole number from `low` to `high`, both included. */
const between = (random: () => number, low: number, high: number) =>
  low + Math.floor(random() * (high - low + 1));

/** Put the items in a seeded random order (Fisher-Yates). */
const shuffled = <Item>(items: readonly Item[], random: () => number): Item[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = between(random, 0, index);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

/**
 * One block for the grid. The tiers follow the mix, in a seeded random order, and every team gets
 * seeded random ratings: Power Score, strength of schedule, wins, losses, game wins, game losses.
 * The teams hold the scheduler's placeholders (Power Score 0, SOS 0.5), like the real loader.
 */
export const buildGridBlock = (
  mix: readonly string[],
  size: number,
  seed: number
): { teams: Team[]; rows: RatingRow[] } => {
  const random = seededRandom(seed);
  const tiers = shuffled(
    Array.from({ length: size }, (_, index) => mix[index % mix.length]),
    random
  );
  const teams = tiers.map((divisionName, index) =>
    createMockTeam({
      id: `T${index + 1}`,
      name: `T${index + 1}`,
      divisionName,
      power_score: 0,
      sos: 0.5,
    })
  );
  const rows = teams.map((team) => {
    const decided = between(random, 0, 14);
    const wins = between(random, 0, decided);
    const gamesDecided = decided * 3;
    const gameWins = between(random, 0, gamesDecided);
    return ratingRow(team.id, {
      power_score: between(random, 20, 95),
      sos: between(random, 30, 70) / 100,
      wins,
      losses: decided - wins,
      game_wins: gameWins,
      game_losses: gamesDecided - gameWins,
    });
  });
  return { teams, rows };
};

/**
 * How many pairings bend a rule: a Competitive team against a Recreational one, a pair flagged
 * as played before when the teams are not both Recreational, or a pair listed twice when the
 * teams are not both Recreational. Only a Recreational pair may meet again.
 */
export const countRuleBends = (pairings: readonly TeamPair[]): number => {
  const seen = new Set<string>();
  return pairings.filter(({ team1, team2, hasPlayedBefore }) => {
    const key = [team1.id, team2.id].sort().join('-');
    const repeated = seen.has(key);
    seen.add(key);
    return (
      isExtremeTierDifference(team1, team2) ||
      ((hasPlayedBefore || repeated) && !isBothRecreational(team1, team2))
    );
  }).length;
};
