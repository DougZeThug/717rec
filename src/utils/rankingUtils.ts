import { Ranking } from '@/types';
import { getTierFromDivision } from '@/utils/autoSchedule/blossom/tierUtils';
import { errorLog, warnLog } from '@/utils/logger';

/**
 * Every column the rankings table can be sorted by.
 *
 * `sortRankings` must carry a `case` for each member. Keeping this a union
 * rather than a bare string is what stops a heading being wired to a key the
 * sorter does not handle — that used to compile, and four columns silently
 * sorted by power score instead. See B-34 in
 * `docs/product-description/bug-triage.md`.
 */
export type RankingSortField =
  | 'powerScore'
  | 'winPercentage'
  | 'sos'
  | 'wins'
  | 'gamesWon'
  | 'gameWinPercentage'
  | 'streak'
  | 'teamName';

const getDisplayedPowerScore = (powerScore: number | null | undefined): number | null => {
  if (powerScore === null || powerScore === undefined) return null;
  return Math.round(powerScore * 10) / 10;
};

/**
 * A streak reads `W3` or `L2` (see `calculateStreak`). Sorting needs a signed
 * magnitude so that W10 > W2 > L1 > L9. `undefined` means the team has no
 * completed match — that is "no value", not zero, so it sorts last like a
 * missing power score rather than landing between W1 and L1.
 */
const getStreakValue = (streak: string | undefined): number | null => {
  const match = streak ? /^([WL])(\d+)$/.exec(streak) : null;
  if (!match) return null;
  const count = Number(match[2]);
  return match[1] === 'W' ? count : -count;
};

// Ranking utilities - now handles NULL power scores for teams with no matches
// The power score calculation is handled in v_team_details. The three weights
// are admin-configurable (default 40/45/15 — see the Power Score Sandbox):
// - Weighted Match Win % = Σ(wins × opponent_weight) / Σ(opponent_weight)
// - Strength of Schedule = average opponent division weight
// - Weighted Game Win % = Σ(game_wins × opponent_weight) / Σ(total_games × opponent_weight)
// The first and third are true weighted averages on a 0-1 scale; opponent
// strength is carried by the SOS term. See src/utils/powerScore/README.md.

export const sortRankings = (
  rankings: Ranking[],
  sortField: RankingSortField | string,
  direction: 'asc' | 'desc'
): Ranking[] => {
  return [...rankings].sort((a, b) => {
    let valueA: number | string | null;
    let valueB: number | string | null;

    switch (sortField) {
      case 'powerScore':
        valueA = getDisplayedPowerScore(a.powerScore);
        valueB = getDisplayedPowerScore(b.powerScore);
        break;
      case 'winPercentage':
        valueA = a.winPercentage || 0;
        valueB = b.winPercentage || 0;
        break;
      case 'sos':
        valueA = a.sos || 0;
        valueB = b.sos || 0;
        break;
      case 'wins':
        valueA = a.wins || 0;
        valueB = b.wins || 0;
        break;
      case 'gamesWon':
        valueA = a.gamesWon || 0;
        valueB = b.gamesWon || 0;
        break;
      case 'gameWinPercentage':
        valueA = a.gameWinPercentage || 0;
        valueB = b.gameWinPercentage || 0;
        break;
      case 'streak':
        valueA = getStreakValue(a.streak);
        valueB = getStreakValue(b.streak);
        break;
      case 'teamName':
        valueA = a.teamName;
        valueB = b.teamName;
        break;
      default:
        // An unrecognised field falls back to the default ordering rather than
        // leaving the table unsorted. Every heading the UI offers has a case
        // above, so this is only reachable from a stored or hand-passed value.
        valueA = getDisplayedPowerScore(a.powerScore);
        valueB = getDisplayedPowerScore(b.powerScore);
    }

    // A missing value is "no value", not a low one: it goes to the end whichever
    // direction is set. This covers a team with no power score and a team with
    // no completed match, whose streak reads "N/A".
    if (valueA === null && valueB === null) {
      // Fall through to the tiebreakers below — do not return 0
    } else if (valueA === null) {
      return 1;
    } else if (valueB === null) {
      return -1;
    }

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    }

    const numA = Number(valueA);
    const numB = Number(valueB);
    const primary = direction === 'asc' ? numA - numB : numB - numA;
    if (primary !== 0) return primary;

    // Tiebreakers for power score, in priority order:
    //   1) Higher division ranks first (Competitive=1 > Intermediate=2 > Recreational=3)
    //   2) Higher win percentage
    //   3) Team name (alphabetical)
    if (sortField === 'powerScore') {
      const tierA = getTierFromDivision(a.divisionName);
      const tierB = getTierFromDivision(b.divisionName);
      if (tierA !== tierB) return tierA - tierB;

      const winA = a.winPercentage || 0;
      const winB = b.winPercentage || 0;
      if (winA !== winB) return winB - winA;

      return (a.teamName || '').localeCompare(b.teamName || '');
    }
    // Other columns keep the incoming order for a tie. The array arrives sorted
    // by power score and Array.prototype.sort is stable, so equal values stay in
    // power-score order rather than shuffling.
    return 0;
  });
};

export const updateRankChanges = (rankings: Ranking[]): Ranking[] => {
  return rankings.map((ranking, index) => {
    const currentRank = index + 1;
    const previousRank = ranking.previousRank;

    // No prior ranking (new team) -> undefined, so the UI can show "-" instead of "0".
    if (previousRank === undefined || previousRank === null) {
      return { ...ranking, rankChange: undefined };
    }

    const rankChange = previousRank !== currentRank ? previousRank - currentRank : 0;

    return {
      ...ranking,
      rankChange,
    };
  });
};

export const saveRankingsToStorage = async (
  rankings: Ranking[],
  seasonId?: string,
  options: { persistToDatabase?: boolean } = {}
): Promise<void> => {
  // Default to true to preserve existing behavior for callers that don't pass
  // the option. Admin-gated callers (e.g. useTeamRankings) pass 'false' for
  // non-admins so we don't trip RLS on 'ranking_snapshots'.
  const { persistToDatabase = true } = options;

  try {
    if (persistToDatabase) {
      // Import database service dynamically to avoid circular dependencies
      const { saveRankingsToDatabase } =
        await import('@/services/rankings/RankingPersistenceService');
      try {
        await saveRankingsToDatabase(rankings, seasonId);
      } catch (error) {
        warnLog('Database save failed, falling back to localStorage:', error);
      }
    }

    // Also save to localStorage as a backup
    const rankingMap = rankings.reduce(
      (acc, ranking, index) => {
        acc[ranking.teamId] = index + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    localStorage.setItem('previousRankings', JSON.stringify(rankingMap));
    localStorage.setItem('rankingsLastUpdated', new Date().toISOString());
  } catch (error) {
    errorLog('Failed to save rankings to storage:', error);
  }
};

export const loadRankingsFromStorage = async (
  seasonId?: string
): Promise<{
  rankings: Record<string, number>;
  lastUpdated: string | null;
}> => {
  // Import database service dynamically to avoid circular dependencies
  const { loadRankingsFromDatabase, migrateLocalStorageToDatabase } =
    await import('@/services/rankings/RankingPersistenceService');

  try {
    // Try to load from database first for the specified season (or active season)
    const dbRankings = await loadRankingsFromDatabase(seasonId);

    // If database has rankings, use them
    if (Object.keys(dbRankings).length > 0) {
      return { rankings: dbRankings, lastUpdated: new Date().toISOString() };
    }

    // If database is empty, try to migrate from localStorage
    const localRankings = localStorage.getItem('previousRankings');
    if (localRankings) {
      // Attempt migration
      await migrateLocalStorageToDatabase();

      // Try loading from database again after migration
      const migratedRankings = await loadRankingsFromDatabase(seasonId);
      if (Object.keys(migratedRankings).length > 0) {
        return { rankings: migratedRankings, lastUpdated: new Date().toISOString() };
      }
    }

    // Fallback to localStorage if all else fails
    const rankings = JSON.parse(localStorage.getItem('previousRankings') || '{}');
    const lastUpdated = localStorage.getItem('rankingsLastUpdated');
    return { rankings, lastUpdated };
  } catch (error) {
    errorLog('Failed to load rankings from storage:', error);

    // Final fallback to localStorage
    try {
      const rankings = JSON.parse(localStorage.getItem('previousRankings') || '{}');
      const lastUpdated = localStorage.getItem('rankingsLastUpdated');
      return { rankings, lastUpdated };
    } catch {
      return { rankings: {}, lastUpdated: null };
    }
  }
};
