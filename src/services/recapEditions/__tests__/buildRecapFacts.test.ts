import { describe, expect, it } from 'vitest';

import type { WeekPairTrends } from '@/services/rankings/weeklyTrendsForWeek';
import type { WeeklyRecapData } from '@/services/weeklyRecap/types';

import type { BuildRecapFactsInput, SnapshotStandingsInput } from '../buildRecapFacts';
import { buildRecapFacts, canPublishFacts } from '../buildRecapFacts';

const trend = (teamId: string, delta: number, currentScore = 60) => ({
  teamId,
  teamName: teamId.toUpperCase(),
  division: 'Competitive',
  logoUrl: undefined,
  currentScore,
  previousScore: currentScore - delta,
  delta,
  percentChange: 0,
  currentWeek: 6,
  previousWeek: 5,
});

const emptyRecap: WeeklyRecapData = {
  weekNumber: 6,
  mode: 'regular',
  upsets: [],
  hotStreaks: [],
  hasData: false,
};

const trends = (overrides: Partial<WeekPairTrends> = {}): WeekPairTrends => ({
  trends: [],
  currentWeek: 6,
  previousWeek: 5,
  basis: 'compared',
  ...overrides,
});

const standingsRow = (
  teamId: string,
  overrides: Partial<SnapshotStandingsInput> = {}
): SnapshotStandingsInput => ({
  teamId,
  teamName: teamId.toUpperCase(),
  logoUrl: null,
  divisionId: 'd-1',
  divisionName: 'Competitive',
  wins: 5,
  losses: 3,
  gameWins: 12,
  gameLosses: 9,
  powerScore: 60,
  ...overrides,
});

const build = (overrides: Partial<BuildRecapFactsInput> = {}) =>
  buildRecapFacts({
    seasonId: 's-1',
    seasonName: 'Fall 2026',
    seasonSlug: 'fall-2026',
    weekNumber: 6,
    weekStart: new Date('2026-10-09T04:00:00Z'),
    weekEnd: new Date('2026-10-16T04:00:00Z'),
    recap: emptyRecap,
    trends: trends(),
    standings: [],
    unresolvedMatchCount: 0,
    generatedAt: new Date('2026-10-16T12:00:00Z'),
    ...overrides,
  });

describe('buildRecapFacts', () => {
  it('stamps the schema version and the window it read', () => {
    const facts = build();

    expect(facts.factsSchemaVersion).toBe(1);
    expect(facts.weekStartIso).toBe('2026-10-09T04:00:00.000Z');
    expect(facts.weekEndIso).toBe('2026-10-16T04:00:00.000Z');
    expect(facts.generatedAt).toBe('2026-10-16T12:00:00.000Z');
  });

  // JSONB drops undefined keys silently, so the renderer would see a missing
  // key rather than "this team has no logo".
  it('never writes undefined anywhere in the facts', () => {
    const facts = build({
      trends: trends({ trends: [trend('a', 4), trend('b', -2)] }),
      standings: [standingsRow('a'), standingsRow('b', { logoUrl: null, powerScore: null })],
    });

    const seen: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (value === undefined) seen.push(path);
      else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
      else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
      }
    };
    walk(facts, 'facts');

    expect(seen).toEqual([]);
    // Deliberately JSON, not structuredClone: this asserts the facts survive the
    // round trip through JSONB unchanged. structuredClone would preserve values
    // JSONB drops, which is exactly the bug this guards against.
    expect(JSON.parse(JSON.stringify(facts))).toEqual(facts);
  });

  it('picks the biggest riser as Team of the Week and starts risers at the next one', () => {
    const facts = build({
      trends: trends({ trends: [trend('a', 2), trend('b', 6), trend('c', 4), trend('d', -3)] }),
    });

    expect(facts.teamOfTheWeek?.teamId).toBe('b');
    expect(facts.movers.risers.map((r) => r.teamId)).toEqual(['c', 'a']);
    expect(facts.movers.faller?.teamId).toBe('d');
  });

  it('names nobody Team of the Week when nothing rose', () => {
    const facts = build({ trends: trends({ trends: [trend('a', -1), trend('b', -4)] }) });

    expect(facts.teamOfTheWeek).toBeNull();
    expect(facts.movers.risers).toEqual([]);
    expect(facts.movers.faller?.teamId).toBe('b');
  });

  it('carries the movers basis and the week actually compared against', () => {
    const facts = build({ trends: trends({ basis: 'gap', previousWeek: 4 }) });

    expect(facts.movers.basis).toBe('gap');
    expect(facts.movers.previousWeek).toBe(4);
  });

  it('groups standings by division and ranks them like /stats does', () => {
    const facts = build({
      standings: [
        standingsRow('low', { powerScore: 40 }),
        standingsRow('high', { powerScore: 80 }),
        standingsRow('unrated', { powerScore: null }),
        standingsRow('mid', { powerScore: 60 }),
        standingsRow('rec', { divisionId: 'd-2', divisionName: 'Recreational', powerScore: 55 }),
      ],
    });

    expect(facts.divisions.map((d) => d.divisionName)).toEqual(['Competitive', 'Recreational']);

    const competitive = facts.divisions[0];
    expect(competitive.standings.map((r) => r.teamId)).toEqual([
      'high',
      'mid',
      'low',
      // An unrated team sorts last rather than being dropped.
      'unrated',
    ]);
    expect(competitive.standings.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it('breaks a displayed-score tie on win percentage, then name', () => {
    const facts = build({
      standings: [
        // Both display as 60.0 at one decimal.
        standingsRow('zeta', { powerScore: 60.04, wins: 7, losses: 1 }),
        standingsRow('alpha', { powerScore: 60.01, wins: 2, losses: 6 }),
      ],
    });

    expect(facts.divisions[0].standings.map((r) => r.teamId)).toEqual(['zeta', 'alpha']);
  });

  it('attaches each team’s weekly movement to its standings row', () => {
    const facts = build({
      trends: trends({ trends: [trend('a', 4)] }),
      standings: [standingsRow('a'), standingsRow('b')],
    });

    const rows = facts.divisions[0].standings;
    expect(rows.find((r) => r.teamId === 'a')?.delta).toBe(4);
    // A team with no comparable snapshot gets null, not a fabricated zero.
    expect(rows.find((r) => r.teamId === 'b')?.delta).toBeNull();
  });

  it('leaves out rows with no division, which cannot be drawn', () => {
    const facts = build({
      standings: [standingsRow('a'), standingsRow('orphan', { divisionId: null })],
    });

    expect(facts.divisions).toHaveLength(1);
    expect(facts.divisions[0].standings.map((r) => r.teamId)).toEqual(['a']);
  });
});

describe('canPublishFacts', () => {
  it('refuses a week whose snapshot never ran, however much else is there', () => {
    const facts = build({
      trends: trends({ basis: 'missing', previousWeek: null }),
      standings: [standingsRow('a')],
    });

    expect(canPublishFacts(facts)).toBe(false);
  });

  it('refuses an edition with nothing in it', () => {
    expect(canPublishFacts(build())).toBe(false);
  });

  it('allows a week that has standings but no stories', () => {
    expect(canPublishFacts(build({ standings: [standingsRow('a')] }))).toBe(true);
  });

  it('allows a week that has only a streak', () => {
    const facts = build({
      recap: {
        ...emptyRecap,
        hotStreaks: [
          {
            teamId: 'a',
            teamName: 'A',
            division: 'Competitive',
            streak: 'W4',
            streakCount: 4,
          },
        ],
        hasData: true,
      },
    });

    expect(canPublishFacts(facts)).toBe(true);
  });
});
