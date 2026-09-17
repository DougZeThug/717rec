import type { TrendBasis } from '@/services/rankings/weeklyTrendsForWeek';
import type { TeamStreakInfo, WeeklyUpset } from '@/services/weeklyRecap/types';

/**
 * The frozen contents of one recap edition.
 *
 * A published recap describes a week that has passed. Live tables keep moving —
 * scores get corrected, teams get renamed, power scores get recomputed — so an
 * edition stores what it was built from and renders only from this object. It
 * must never be re-derived from the database, or it stops being a record of
 * that week.
 *
 * Two rules keep an old edition renderable:
 *   1. No `undefined` anywhere. JSONB drops undefined keys silently, and the
 *      renderer then sees a missing key rather than an explicit null.
 *   2. Logo URLs, never base64. Inlining image data here would bloat the row
 *      and freeze a logo the team later changes.
 */
export const RECAP_FACTS_SCHEMA_VERSION = 1;

export interface RecapMoverFact {
  teamId: string;
  teamName: string;
  logoUrl: string | null;
  division: string;
  currentScore: number;
  previousScore: number;
  delta: number;
}

export interface RecapStandingsRow {
  rank: number;
  teamId: string;
  teamName: string;
  logoUrl: string | null;
  wins: number;
  losses: number;
  gameWins: number;
  gameLosses: number;
  powerScore: number | null;
  /** Week-over-week power score movement, or null when it cannot be worked out. */
  delta: number | null;
}

export interface RecapDivisionFact {
  divisionId: string;
  divisionName: string;
  standings: RecapStandingsRow[];
}

interface RecapMoversFact {
  /** How the comparison was reached. See services/rankings/weeklyTrendsForWeek. */
  basis: TrendBasis;
  currentWeek: number;
  /** The week actually compared against — not always currentWeek - 1. */
  previousWeek: number | null;
  risers: RecapMoverFact[];
  faller: RecapMoverFact | null;
}

export interface RecapFactsV1 {
  factsSchemaVersion: 1;
  seasonId: string;
  seasonName: string;
  seasonSlug: string;
  weekNumber: number;
  /** The UTC window the week's results were read from. */
  weekStartIso: string;
  weekEndIso: string;
  upsets: WeeklyUpset[];
  hotStreaks: TeamStreakInfo[];
  movers: RecapMoversFact;
  teamOfTheWeek: RecapMoverFact | null;
  divisions: RecapDivisionFact[];
  /** Matches in the week that had no result when the edition was built. */
  unresolvedMatchCount: number;
  generatedAt: string;
}
