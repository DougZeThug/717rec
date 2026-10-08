import { describe, expect, it } from 'vitest';

import type { Match, Team } from '@/types';

import { calculateHeadToHead } from '../calculateHeadToHead';

const team = (id: string, name: string): Team => ({ id, name }) as Team;
const match = (id: string, t1: string, t2: string, winner: string): Match =>
  ({ id, team1Id: t1, team2Id: t2, winnerId: winner, iscompleted: true }) as Match;

describe('calculateHeadToHead', () => {
  const TEAM_ID = 'team-1';
  const opp1 = team('team-2', 'Lions');
  const opp2 = team('team-3', 'Eagles');

  it('returns empty map when teamId is empty', () => {
    expect(calculateHeadToHead('', [opp1], [match('m1', TEAM_ID, 'team-2', TEAM_ID)])).toEqual({});
  });

  it('returns empty map when allTeams is undefined', () => {
    expect(calculateHeadToHead(TEAM_ID, undefined, [])).toEqual({});
  });

  it('initialises all opponents to 0-0 with no matches', () => {
    const result = calculateHeadToHead(TEAM_ID, [opp1, opp2], []);
    expect(result['team-2']).toEqual({ opponentName: 'Lions', wins: 0, losses: 0 });
    expect(result['team-3']).toEqual({ opponentName: 'Eagles', wins: 0, losses: 0 });
  });

  it('counts wins when the team wins as team1', () => {
    const result = calculateHeadToHead(TEAM_ID, [opp1], [match('m1', TEAM_ID, 'team-2', TEAM_ID)]);
    expect(result['team-2'].wins).toBe(1);
    expect(result['team-2'].losses).toBe(0);
  });

  it('counts losses when the team loses as team1', () => {
    const result = calculateHeadToHead(TEAM_ID, [opp1], [match('m1', TEAM_ID, 'team-2', 'team-2')]);
    expect(result['team-2'].wins).toBe(0);
    expect(result['team-2'].losses).toBe(1);
  });

  it('counts wins when the team is team2', () => {
    const result = calculateHeadToHead(TEAM_ID, [opp1], [match('m1', 'team-2', TEAM_ID, TEAM_ID)]);
    expect(result['team-2'].wins).toBe(1);
  });

  it('ignores incomplete matches', () => {
    const incomplete = {
      id: 'm1',
      team1Id: TEAM_ID,
      team2Id: 'team-2',
      winnerId: TEAM_ID,
      iscompleted: false,
    } as Match;
    const result = calculateHeadToHead(TEAM_ID, [opp1], [incomplete]);
    expect(result['team-2'].wins).toBe(0);
  });

  it('accumulates multiple matches against the same opponent', () => {
    const matches = [
      match('m1', TEAM_ID, 'team-2', TEAM_ID),
      match('m2', TEAM_ID, 'team-2', TEAM_ID),
      match('m3', TEAM_ID, 'team-2', 'team-2'),
    ];
    const result = calculateHeadToHead(TEAM_ID, [opp1], matches);
    expect(result['team-2'].wins).toBe(2);
    expect(result['team-2'].losses).toBe(1);
  });
});
