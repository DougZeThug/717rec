import type { HeadToHeadRecord } from '@/types/headToHead';

export type RivalryType = 'rival' | 'dominated' | 'nemesis';

export interface RivalryClassification {
  type: RivalryType;
  record: HeadToHeadRecord;
}

export interface RivalryResults {
  /** Opponents with the most matches played (top 3) */
  mostPlayed: HeadToHeadRecord[];
  /** Opponents with near-.500 records (|wins - losses| <= 1, 3+ matches) */
  closestRivalries: HeadToHeadRecord[];
  /** Opponents with >= 75% win rate (3+ matches), sorted by best win% */
  dominantMatchups: HeadToHeadRecord[];
  /** Opponents with <= 25% win rate (3+ matches), sorted by worst win% */
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

  const mostPlayed = [...records]
    .sort((a, b) => b.matches_played - a.matches_played)
    .slice(0, 3);

  const closestRivalries = records
    .filter((r) => r.matches_played >= 3 && Math.abs(r.wins - r.losses) <= 1)
    .sort((a, b) => b.matches_played - a.matches_played);

  const dominantMatchups = records
    .filter((r) => r.matches_played >= 3 && r.win_pct >= 75)
    .sort((a, b) => b.win_pct - a.win_pct || b.matches_played - a.matches_played);

  const nemeses = records
    .filter((r) => r.matches_played >= 3 && r.win_pct <= 25)
    .sort((a, b) => a.win_pct - b.win_pct || b.matches_played - a.matches_played);

  return { mostPlayed, closestRivalries, dominantMatchups, nemeses };
};

/**
 * Returns the rivalry type for a specific opponent, if any.
 * Priority: nemesis > rival > dominated (most narrative-worthy first).
 */
export const getRivalryType = (record: HeadToHeadRecord): RivalryType | null => {
  if (record.matches_played >= 3 && record.win_pct <= 25) {
    return 'nemesis';
  }
  if (record.matches_played >= 3 && Math.abs(record.wins - record.losses) <= 1) {
    return 'rival';
  }
  if (record.matches_played >= 3 && record.win_pct >= 75) {
    return 'dominated';
  }
  return null;
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
    case 'rival':
      return `Rivalry: ${record.wins}-${record.losses} all-time`;
    case 'dominated':
      return `${teamName} is ${record.wins}-${record.losses} all-time`;
  }
};
