import { describe, expect, it } from 'vitest';

import type { LeagueTeamMatchStats } from '@/utils/teamDetailsUtils/leagueMatchStats';

import { gradeTeamsForWeek } from '../gradeTeamsForWeek';
import type { SnapshotStandingsInput } from '../standingsOrder';

const row = (
  teamId: string,
  overrides: Partial<SnapshotStandingsInput> = {}
): SnapshotStandingsInput => ({
  teamId,
  teamName: teamId.toUpperCase(),
  logoUrl: null,
  divisionId: 'd-comp',
  divisionName: 'Competitive',
  wins: 5,
  losses: 3,
  gameWins: 12,
  gameLosses: 9,
  powerScore: 60,
  sos: 0.5,
  ...overrides,
});

const stats = (overrides: Partial<LeagueTeamMatchStats> = {}): LeagueTeamMatchStats => ({
  sweepRate: 25,
  clutchWinPct: 50,
  game3Matches: 4,
  ...overrides,
});

const statsFor = (teamIds: string[]): Map<string, LeagueTeamMatchStats> =>
  new Map(teamIds.map((id) => [id, stats()]));

const gradeOf = (result: ReturnType<typeof gradeTeamsForWeek>, teamId: string) =>
  result.find((t) => t.teamId === teamId);

const categoryOf = (result: ReturnType<typeof gradeTeamsForWeek>, teamId: string, key: string) =>
  gradeOf(result, teamId)?.categories.find((c) => c.key === key);

describe('gradeTeamsForWeek', () => {
  it('ranks the whole league across divisions, not within them', () => {
    const result = gradeTeamsForWeek({
      teams: [
        row('comp-a', { powerScore: 80 }),
        row('rec-a', { powerScore: 85, divisionId: 'd-rec', divisionName: 'Recreational' }),
        row('comp-b', { powerScore: 70 }),
      ],
      matchStats: statsFor(['comp-a', 'rec-a', 'comp-b']),
      previousTeams: null,
      deltaByTeam: new Map(),
    });

    // The Recreational team outranks both Competitive teams because its power
    // score is higher. That crossing is the point of a league-wide ranking.
    expect(result.map((t) => t.teamId)).toEqual(['rec-a', 'comp-a', 'comp-b']);
    expect(result.map((t) => t.rank)).toEqual([1, 2, 3]);
    expect(result[0].division).toBe('Recreational');
  });

  // The rankings are the one place a cross-division tie can happen, and the
  // recap used to answer it differently from /stats: it put the better record
  // first where /stats puts the stronger division first.
  it('breaks a tie across divisions on the division, like /stats does', () => {
    const result = gradeTeamsForWeek({
      teams: [
        row('rec-a', {
          powerScore: 60,
          divisionId: 'd-rec',
          divisionName: 'Recreational',
          wins: 7,
          losses: 1,
        }),
        row('comp-a', { powerScore: 60, wins: 2, losses: 6 }),
      ],
      matchStats: statsFor(['rec-a', 'comp-a']),
      previousTeams: null,
      deltaByTeam: new Map(),
    });

    expect(result.map((t) => t.teamId)).toEqual(['comp-a', 'rec-a']);
    expect(result.map((t) => t.rank)).toEqual([1, 2]);
  });

  it('lists an unrated team last with no grade, rather than dropping it', () => {
    const result = gradeTeamsForWeek({
      teams: [
        row('rated-a', { powerScore: 80 }),
        row('unrated', { powerScore: null, sos: null, wins: 0, losses: 0 }),
        row('rated-b', { powerScore: 60 }),
      ],
      matchStats: statsFor(['rated-a', 'rated-b']),
      previousTeams: null,
      deltaByTeam: new Map(),
    });

    expect(result.map((t) => t.teamId)).toEqual(['rated-a', 'rated-b', 'unrated']);

    const unrated = gradeOf(result, 'unrated');
    expect(unrated?.grade).toBeNull();
    expect(unrated?.gpa).toBe(0);
    expect(unrated?.categories.every((c) => c.grade === null)).toBe(true);
  });

  it('does not let an unrated team flatter everyone else', () => {
    const rated = [row('a', { powerScore: 80 }), row('b', { powerScore: 60 })];
    const matchStats = statsFor(['a', 'b']);

    const without = gradeTeamsForWeek({
      teams: rated,
      matchStats,
      previousTeams: null,
      deltaByTeam: new Map(),
    });
    const with_ = gradeTeamsForWeek({
      teams: [...rated, row('unrated', { powerScore: null, wins: 0, losses: 0 })],
      matchStats,
      previousTeams: null,
      deltaByTeam: new Map(),
    });

    // Counting the unrated team as a zero would have padded the population and
    // lifted every real team's percentile.
    expect(gradeOf(with_, 'b')?.grade).toBe(gradeOf(without, 'b')?.grade);
    expect(categoryOf(with_, 'b', 'overall')?.percentile).toBe(
      categoryOf(without, 'b', 'overall')?.percentile
    );
  });

  it('leaves clutch unmeasured, and out of the GPA, when no match reached game 3', () => {
    const teams = [row('a', { powerScore: 80 }), row('b', { powerScore: 60 })];

    // Same team, same everything, except whether it ever reached a game 3.
    const measured = gradeTeamsForWeek({
      teams,
      matchStats: new Map([
        ['a', stats({ game3Matches: 4, clutchWinPct: 0 })],
        ['b', stats({ game3Matches: 4, clutchWinPct: 100 })],
      ]),
      previousTeams: null,
      deltaByTeam: new Map(),
    });
    const unmeasured = gradeTeamsForWeek({
      teams,
      matchStats: new Map([
        ['a', stats({ game3Matches: 0, clutchWinPct: 0 })],
        ['b', stats({ game3Matches: 4, clutchWinPct: 100 })],
      ]),
      previousTeams: null,
      deltaByTeam: new Map(),
    });

    expect(categoryOf(measured, 'a', 'clutch')?.grade).toBe('F');
    expect(categoryOf(unmeasured, 'a', 'clutch')?.grade).toBeNull();
    expect(categoryOf(unmeasured, 'a', 'clutch')?.percentile).toBeNull();

    // If an unmeasured category were quietly counted as a fail the two GPAs
    // would match. It is left out of the average instead, so not having played
    // a decider neither helps nor hurts.
    expect(unmeasured.find((t) => t.teamId === 'a')?.gpa).toBeGreaterThan(
      measured.find((t) => t.teamId === 'a')?.gpa ?? 0
    );
  });

  it('gives a team top of every measured category a 4.0', () => {
    const result = gradeTeamsForWeek({
      teams: [
        row('a', { powerScore: 80, wins: 8, losses: 0, gameWins: 16, gameLosses: 2, sos: 0.9 }),
        row('b', { powerScore: 40, wins: 1, losses: 7, gameWins: 3, gameLosses: 15, sos: 0.2 }),
      ],
      matchStats: new Map([
        ['a', stats({ sweepRate: 80, clutchWinPct: 100 })],
        ['b', stats({ sweepRate: 10, clutchWinPct: 20 })],
      ]),
      previousTeams: null,
      deltaByTeam: new Map(),
    });

    expect(gradeOf(result, 'a')?.gpa).toBe(4);
    expect(gradeOf(result, 'a')?.grade).toBe('A+');
  });

  it('leaves schedule unmeasured when the snapshot recorded no strength of schedule', () => {
    const result = gradeTeamsForWeek({
      teams: [row('a', { powerScore: 80, sos: null }), row('b', { powerScore: 60, sos: 0.4 })],
      matchStats: statsFor(['a', 'b']),
      previousTeams: null,
      deltaByTeam: new Map(),
    });

    expect(categoryOf(result, 'a', 'schedule')?.grade).toBeNull();
    // The other team still gets a schedule grade; it just ranks against a
    // population of one.
    expect(categoryOf(result, 'b', 'schedule')?.grade).not.toBeNull();
  });

  it('reports rank movement against the previous week, in places not power', () => {
    const teams = [row('a', { powerScore: 90 }), row('b', { powerScore: 80 })];
    const previousTeams = [row('a', { powerScore: 50 }), row('b', { powerScore: 85 })];

    const result = gradeTeamsForWeek({
      teams,
      matchStats: statsFor(['a', 'b']),
      previousTeams,
      deltaByTeam: new Map([
        ['a', 40],
        ['b', -5],
      ]),
    });

    expect(gradeOf(result, 'a')).toMatchObject({ rank: 1, previousRank: 2, delta: 40 });
    expect(gradeOf(result, 'b')).toMatchObject({ rank: 2, previousRank: 1, delta: -5 });
  });

  it('gains a rank but still falls, when the rest of the league gains more', () => {
    const result = gradeTeamsForWeek({
      teams: [row('rival', { powerScore: 90 }), row('team', { powerScore: 70 })],
      previousTeams: [row('rival', { powerScore: 60 }), row('team', { powerScore: 65 })],
      matchStats: statsFor(['rival', 'team']),
      deltaByTeam: new Map([['team', 5]]),
    });

    const team = gradeOf(result, 'team');
    // Power went UP and the team still dropped a place. That is why movement is
    // measured in places rather than in power score delta.
    expect(team?.delta).toBe(5);
    expect(team?.rank).toBe(2);
    expect(team?.previousRank).toBe(1);
  });

  it('reports no previous rank when there is no week to compare with', () => {
    const result = gradeTeamsForWeek({
      teams: [row('a'), row('b', { powerScore: 50 })],
      matchStats: statsFor(['a', 'b']),
      previousTeams: null,
      deltaByTeam: new Map(),
    });

    expect(result.every((t) => t.previousRank === null)).toBe(true);
  });

  it('reports no previous rank for a team that was not in the previous week', () => {
    const result = gradeTeamsForWeek({
      teams: [row('a', { powerScore: 80 }), row('newcomer', { powerScore: 60 })],
      previousTeams: [row('a', { powerScore: 80 })],
      matchStats: statsFor(['a', 'newcomer']),
      deltaByTeam: new Map(),
    });

    expect(gradeOf(result, 'a')?.previousRank).toBe(1);
    expect(gradeOf(result, 'newcomer')?.previousRank).toBeNull();
  });

  it('grades the same letters the report card would, for the same percentiles', () => {
    // Four teams, evenly spread. Percentile counts how many are strictly worse
    // over (total - 1), so the top team is 100 and the bottom 0.
    const teams = ['a', 'b', 'c', 'd'].map((id, i) => row(id, { powerScore: 80 - i * 10 }));

    const result = gradeTeamsForWeek({
      teams,
      matchStats: statsFor(['a', 'b', 'c', 'd']),
      previousTeams: null,
      deltaByTeam: new Map(),
    });

    expect(categoryOf(result, 'a', 'overall')).toMatchObject({ percentile: 100, grade: 'A+' });
    expect(categoryOf(result, 'b', 'overall')).toMatchObject({ percentile: 67, grade: 'B-' });
    expect(categoryOf(result, 'c', 'overall')).toMatchObject({ percentile: 33, grade: 'D' });
    expect(categoryOf(result, 'd', 'overall')).toMatchObject({ percentile: 0, grade: 'F' });
  });

  it('takes its headline letter from the overall category, as the leaderboard does', () => {
    const result = gradeTeamsForWeek({
      teams: [row('a', { powerScore: 80 }), row('b', { powerScore: 10 })],
      matchStats: statsFor(['a', 'b']),
      previousTeams: null,
      deltaByTeam: new Map(),
    });

    for (const team of result) {
      expect(team.grade).toBe(team.categories.find((c) => c.key === 'overall')?.grade);
    }
  });

  it('never writes undefined into a fact, which JSONB would drop', () => {
    const result = gradeTeamsForWeek({
      teams: [row('a', { logoUrl: null, divisionName: null, powerScore: null })],
      matchStats: new Map(),
      previousTeams: null,
      deltaByTeam: new Map(),
    });

    expect(JSON.stringify(result)).not.toContain('undefined');
    for (const value of Object.values(result[0])) {
      expect(value).not.toBeUndefined();
    }
  });
});
