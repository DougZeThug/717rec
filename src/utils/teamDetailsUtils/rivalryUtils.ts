import type { HeadToHeadRecord } from '@/types/headToHead';
import { assertNever } from '@/utils/assertNever';

export type RivalryType = 'rival' | 'dominated' | 'favorite' | 'nemesis' | 'tough_matchup';

// Threshold constants
const DOMINATED_THRESHOLD = 83;
const FAVORITE_THRESHOLD = 70;
const NEMESIS_THRESHOLD = 18;
const TOUGH_MATCHUP_THRESHOLD = 30;
const MIN_MATCHES = 3;

export interface RivalryResults {
  /** Opponents with the most matches played (top 3) */
  mostPlayed: HeadToHeadRecord[];
  /** Opponents with near-.500 records (|wins - losses| <= 1, 3+ matches) */
  closestRivalries: HeadToHeadRecord[];
  /** Opponents with >= 70% win rate (3+ matches), sorted by best win% */
  dominantMatchups: HeadToHeadRecord[];
  /** Opponents with <= 30% win rate (3+ matches), sorted by worst win% */
  nemeses: HeadToHeadRecord[];
}

/**
 * Classifies head-to-head records into rivalry categories.
 * Used for highlights on team pages and schedule context.
 */
export const classifyRivalries = (records: HeadToHeadRecord[]): RivalryResults => {
  if (!records || records.length === 0) {
    return { mostPlayed: [], closestRivalries: [], dominantMatchups: [], nemeses: [] };
  }

  const mostPlayed = [...records].sort((a, b) => b.matches_played - a.matches_played).slice(0, 3);

  const closestRivalries = records
    .filter((r) => r.matches_played >= MIN_MATCHES && Math.abs(r.wins - r.losses) <= 1)
    .sort((a, b) => b.matches_played - a.matches_played);

  const dominantMatchups = records
    .filter((r) => r.matches_played >= MIN_MATCHES && r.win_pct >= FAVORITE_THRESHOLD)
    .sort((a, b) => b.win_pct - a.win_pct || b.matches_played - a.matches_played);

  const nemeses = records
    .filter((r) => r.matches_played >= MIN_MATCHES && r.win_pct <= TOUGH_MATCHUP_THRESHOLD)
    .sort((a, b) => a.win_pct - b.win_pct || b.matches_played - a.matches_played);

  return { mostPlayed, closestRivalries, dominantMatchups, nemeses };
};

/**
 * Returns the rivalry type for a specific opponent, if any.
 * Priority: nemesis > tough_matchup > rival > favorite > dominated (most narrative-worthy first).
 */
export const getRivalryType = (record: HeadToHeadRecord): RivalryType | null => {
  if (record.matches_played < MIN_MATCHES) return null;

  if (record.win_pct <= NEMESIS_THRESHOLD) return 'nemesis';
  if (record.win_pct <= TOUGH_MATCHUP_THRESHOLD) return 'tough_matchup';
  if (Math.abs(record.wins - record.losses) <= 1) return 'rival';
  if (record.win_pct >= DOMINATED_THRESHOLD) return 'dominated';
  if (record.win_pct >= FAVORITE_THRESHOLD) return 'favorite';

  return null;
};

/**
 * How a rivalry type is shown as a badge.
 *
 * Lives here rather than in a component because the head-to-head table and the
 * head-to-head card both need it, and it was copied character-for-character
 * between the two until L3.
 */
export const rivalryBadgeConfig: Record<RivalryType, { label: string; className: string }> = {
  rival: {
    label: 'Rival',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  dominated: {
    label: 'Dominated',
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  favorite: {
    label: 'Favorite',
    className: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
  },
  nemesis: {
    label: 'Nemesis',
    className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  },
  tough_matchup: {
    label: 'Tough Matchup',
    className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  },
};

/**
 * Gets a narrative label for a rivalry matchup on the schedule.
 */
export const getRivalryLabel = (
  type: RivalryType,
  teamName: string,
  record: { wins: number; losses: number; matches_played: number }
): string => {
  switch (type) {
    case 'nemesis':
      return `${teamName} is ${record.wins}-${record.losses} all-time`;
    case 'tough_matchup':
      return `Tough matchup: ${record.wins}-${record.losses} all-time`;
    case 'rival':
      return `Rivalry: ${record.wins}-${record.losses} all-time`;
    case 'favorite':
      return `Favorite: ${record.wins}-${record.losses} all-time`;
    case 'dominated':
      return `${teamName} is ${record.wins}-${record.losses} all-time`;
    default:
      return assertNever(type, 'rivalry type');
  }
};
