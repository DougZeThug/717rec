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
  /** Opponents this team has never lost to (2+ matches) */
  dominantMatchups: HeadToHeadRecord[];
  /** Opponents this team has never beaten (2+ matches) */
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
    .filter((r) => r.matches_played >= 2 && r.wins > 0 && r.losses === 0)
    .sort((a, b) => b.matches_played - a.matches_played);

  const nemeses = records
    .filter((r) => r.matches_played >= 2 && r.wins === 0 && r.losses > 0)
    .sort((a, b) => b.matches_played - a.matches_played);

  return { mostPlayed, closestRivalries, dominantMatchups, nemeses };
};

/**
 * Returns the rivalry type for a specific opponent, if any.
 * Priority: nemesis > rival > dominated (most narrative-worthy first).
 */
export const getRivalryType = (record: HeadToHeadRecord): RivalryType | null => {
  if (record.matches_played >= 2 && record.wins === 0 && record.losses > 0) {
    return 'nemesis';
  }
  if (record.matches_played >= 3 && Math.abs(record.wins - record.losses) <= 1) {
    return 'rival';
  }
  if (record.matches_played >= 2 && record.wins > 0 && record.losses === 0) {
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
      return `${teamName} is 0-${record.losses} all-time`;
    case 'rival':
      return `Rivalry: ${record.wins}-${record.losses} all-time`;
    case 'dominated':
      return `${teamName} is ${record.wins}-0 all-time`;
  }
};
