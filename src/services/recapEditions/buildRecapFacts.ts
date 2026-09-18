import type { WeekPairTrends } from '@/services/rankings/weeklyTrendsForWeek';
import type { WeeklyRecapData } from '@/services/weeklyRecap/types';
import type {
  RecapDivisionFact,
  RecapFactsV1,
  RecapMoverFact,
  RecapStandingsRow,
} from '@/types/recapEdition';
import { RECAP_FACTS_SCHEMA_VERSION } from '@/types/recapEdition';
import { pickTeamOfTheWeek } from '@/utils/powerScore/pickTeamOfTheWeek';
import type { LeagueTeamMatchStats } from '@/utils/teamDetailsUtils/leagueMatchStats';

import { gradeTeamsForWeek } from './gradeTeamsForWeek';
import type { SnapshotStandingsInput } from './standingsOrder';
import { compareStandings } from './standingsOrder';

/**
 * Turns the week's readings into the frozen object an edition stores.
 *
 * Pure on purpose: every rule that decides what a published recap SAYS lives
 * here, with no database access, so it can be tested directly and cannot drift
 * between the preview and the published page.
 */

export type { SnapshotStandingsInput };

export interface BuildRecapFactsInput {
  seasonId: string;
  seasonName: string;
  seasonSlug: string;
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  recap: WeeklyRecapData;
  trends: WeekPairTrends;
  standings: SnapshotStandingsInput[];
  /** The previous week's rows, for rank movement. null when there is no week to compare. */
  previousStandings?: SnapshotStandingsInput[] | null;
  /** Sweep and clutch per team, from matches up to the end of the week. */
  matchStats?: Map<string, LeagueTeamMatchStats>;
  unresolvedMatchCount: number;
  /** Injected so a rebuild in a test is deterministic. */
  generatedAt?: Date;
}

const toMoverFact = (
  trend: WeekPairTrends['trends'][number] | null | undefined
): RecapMoverFact | null =>
  trend
    ? {
        teamId: trend.teamId,
        teamName: trend.teamName,
        // null, never undefined: JSONB drops undefined and the renderer would
        // then see a missing key instead of "this team has no logo".
        logoUrl: trend.logoUrl ?? null,
        division: trend.division,
        currentScore: trend.currentScore,
        previousScore: trend.previousScore,
        delta: trend.delta,
      }
    : null;

const buildDivisions = (
  standings: SnapshotStandingsInput[],
  deltaByTeam: Map<string, number>
): RecapDivisionFact[] => {
  const byDivision = new Map<string, SnapshotStandingsInput[]>();

  for (const row of standings) {
    // A row with no division cannot be placed in a division graphic.
    if (!row.divisionId) continue;
    const bucket = byDivision.get(row.divisionId);
    if (bucket) bucket.push(row);
    else byDivision.set(row.divisionId, [row]);
  }

  return [...byDivision.entries()]
    .map(([divisionId, rows]) => {
      const sorted = [...rows].sort(compareStandings);
      const standingsRows: RecapStandingsRow[] = sorted.map((row, index) => ({
        rank: index + 1,
        teamId: row.teamId,
        teamName: row.teamName,
        logoUrl: row.logoUrl ?? null,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        gameWins: row.gameWins ?? 0,
        gameLosses: row.gameLosses ?? 0,
        powerScore: row.powerScore ?? null,
        delta: deltaByTeam.get(row.teamId) ?? null,
      }));

      return {
        divisionId,
        divisionName: sorted[0]?.divisionName ?? 'Division',
        standings: standingsRows,
      };
    })
    .sort((a, b) => a.divisionName.localeCompare(b.divisionName));
};

export const buildRecapFacts = ({
  seasonId,
  seasonName,
  seasonSlug,
  weekNumber,
  weekStart,
  weekEnd,
  recap,
  trends,
  standings,
  previousStandings = null,
  matchStats = new Map(),
  unresolvedMatchCount,
  generatedAt = new Date(),
}: BuildRecapFactsInput): RecapFactsV1 => {
  const teamOfTheWeek = pickTeamOfTheWeek(trends.trends);
  const deltaByTeam = new Map(trends.trends.map((t) => [t.teamId, t.delta]));

  const risers = trends.trends
    .filter((t) => t.delta > 0 && t.teamId !== teamOfTheWeek?.teamId)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2);

  const faller = trends.trends.filter((t) => t.delta < 0).sort((a, b) => a.delta - b.delta)[0];

  return {
    factsSchemaVersion: RECAP_FACTS_SCHEMA_VERSION,
    seasonId,
    seasonName,
    seasonSlug,
    weekNumber,
    weekStartIso: weekStart.toISOString(),
    weekEndIso: weekEnd.toISOString(),
    upsets: recap.upsets,
    hotStreaks: recap.hotStreaks,
    movers: {
      basis: trends.basis,
      currentWeek: trends.currentWeek,
      previousWeek: trends.previousWeek,
      risers: risers.map(toMoverFact).filter((m): m is RecapMoverFact => m !== null),
      faller: toMoverFact(faller),
    },
    teamOfTheWeek: toMoverFact(teamOfTheWeek),
    divisions: buildDivisions(standings, deltaByTeam),
    powerRankings: gradeTeamsForWeek({
      teams: standings,
      matchStats,
      previousTeams: previousStandings,
      deltaByTeam,
    }),
    unresolvedMatchCount,
    generatedAt: generatedAt.toISOString(),
  };
};

/**
 * Whether there is enough in these facts to be worth publishing. An edition
 * with nothing in it reads as a broken page rather than a quiet week, and a
 * missing snapshot means the numbers cannot be trusted at all.
 */
export const canPublishFacts = (facts: RecapFactsV1): boolean =>
  facts.movers.basis !== 'missing' &&
  (facts.upsets.length > 0 ||
    facts.hotStreaks.length > 0 ||
    facts.movers.risers.length > 0 ||
    facts.teamOfTheWeek !== null ||
    facts.divisions.length > 0);
