import { getTierFromDivision } from '@/utils/autoSchedule/blossom/tierUtils';
import { getDisplayedPowerScore } from '@/utils/powerScore/formatPowerScore';

/**
 * How a week's standings rows are shaped and ordered.
 *
 * Its own file so the two things that order them — the division tables
 * (`buildRecapFacts`) and the league-wide power rankings (`gradeTeamsForWeek`)
 * — share one rule without importing each other.
 */

/** A per-week row from power_score_snapshots, joined to its team's display info. */
export interface SnapshotStandingsInput {
  teamId: string;
  teamName: string;
  logoUrl: string | null;
  divisionId: string | null;
  divisionName: string | null;
  wins: number | null;
  losses: number | null;
  gameWins: number | null;
  gameLosses: number | null;
  powerScore: number | null;
  /** null when the snapshot recorded no strength of schedule for the team. */
  sos: number | null;
}

/**
 * Matches won as a percentage of matches played, 0-100, or 0 for a team that
 * has played none.
 *
 * The scale does not have to match the live standings' own win percentage:
 * every grade is a percentile, and a percentile does not change when every
 * value is scaled by the same factor.
 */
export const winPercentage = (row: Pick<SnapshotStandingsInput, 'wins' | 'losses'>): number => {
  const played = (row.wins ?? 0) + (row.losses ?? 0);
  return played > 0 ? ((row.wins ?? 0) / played) * 100 : 0;
};

/** Games won as a percentage of games played, 0-100. */
export const gameWinPercentage = (
  row: Pick<SnapshotStandingsInput, 'gameWins' | 'gameLosses'>
): number => {
  const played = (row.gameWins ?? 0) + (row.gameLosses ?? 0);
  return played > 0 ? ((row.gameWins ?? 0) / played) * 100 : 0;
};

/**
 * Order matching what /stats shows: the power score as DISPLAYED (one decimal)
 * descending, unrated teams last, then the same tiebreakers /stats uses —
 * division tier, then win percentage, then name.
 *
 * The tier step only ever fires on a tie, which is why it does not stop an
 * Intermediate team outranking a Competitive one on the score itself. Inside a
 * division table it is a no-op, because every row there shares a division; it
 * earns its place in the league-wide rankings, where two teams from different
 * divisions can show the same score. Leaving it out put a Recreational team
 * above a tied Competitive team in a published recap while /stats, ordering the
 * same week, put them the other way round.
 *
 * Keep in step with `sortRankings` in `@/utils/rankingUtils`.
 */
export const compareStandings = (a: SnapshotStandingsInput, b: SnapshotStandingsInput): number => {
  const aScore = getDisplayedPowerScore(a.powerScore);
  const bScore = getDisplayedPowerScore(b.powerScore);

  if (aScore === null && bScore !== null) return 1;
  if (bScore === null && aScore !== null) return -1;
  if (aScore !== null && bScore !== null && aScore !== bScore) return bScore - aScore;

  // Competitive = 1, Intermediate = 2, Recreational = 3, so lower ranks first.
  const aTier = getTierFromDivision(a.divisionName);
  const bTier = getTierFromDivision(b.divisionName);
  if (aTier !== bTier) return aTier - bTier;

  const aPct = winPercentage(a);
  const bPct = winPercentage(b);
  if (aPct !== bPct) return bPct - aPct;

  return (a.teamName || '').localeCompare(b.teamName || '');
};
