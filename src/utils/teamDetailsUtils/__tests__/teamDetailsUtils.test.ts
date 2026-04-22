import { describe, expect, it } from 'vitest';

import { calculateGameStats } from '../gameStatsUtils';
import { calculateHeadToHead } from '../headToHeadUtils';
import { calculateClutchRecord } from '../matchOutcomeUtils';
import { getMatchResult, getOpponentId, getScoreDisplay, getUpcomingAndPastMatches } from '../matchUtils';
import { classifyRivalries, getRivalryLabel, getRivalryType } from '../rivalryUtils';
import { calculateSweepRate } from '../sweepRateUtils';

describe('teamDetails utilities', () => {
  it('handles undefined/empty inputs with safe defaults', () => {
    expect(getUpcomingAndPastMatches(undefined)).toEqual({ upcomingMatches: [], pastMatches: [] });
    expect(calculateSweepRate('team-a', undefined)).toEqual({ sweeps: 0, totalMatches: 0, sweepRate: 0 });
    expect(calculateClutchRecord('team-a', [])).toEqual({ clutchWins: 0, clutchLosses: 0, game3Matches: 0, clutchWinPct: 0 });
    expect(classifyRivalries([])).toEqual({
      mostPlayed: [],
      closestRivalries: [],
      dominantMatchups: [],
      nemeses: [],
    });
  });

  it('splits upcoming and past matches by date and sorts each bucket', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const inTwoDays = new Date();
    inTwoDays.setDate(inTwoDays.getDate() + 2);

    const result = getUpcomingAndPastMatches([
      { id: 'up-2', date: inTwoDays.toISOString() },
      { id: 'past-1', date: yesterday.toISOString() },
      { id: 'up-1', date: tomorrow.toISOString() },
    ] as any);

    expect(result.upcomingMatches.map((m: any) => m.id)).toEqual(['up-1', 'up-2']);
    expect(result.pastMatches.map((m: any) => m.id)).toEqual(['past-1']);
  });

  it.each([
    {
      label: 'completed win for team1',
      match: { iscompleted: true, winnerId: 'team-a', team1Id: 'team-a', team2Id: 'team-b', team1Score: 2, team2Score: 1 },
      teamId: 'team-a',
      expected: { opponentId: 'team-b', result: 'Win', score: '2–1' },
    },
    {
      label: 'incomplete match',
      match: { iscompleted: false, winnerId: 'team-b', team1Id: 'team-a', team2Id: 'team-b' },
      teamId: 'team-a',
      expected: { opponentId: 'team-b', result: 'Incomplete', score: '' },
    },
    {
      label: 'team as team2 score flips',
      match: { iscompleted: true, winnerId: 'team-a', team1Id: 'team-b', team2Id: 'team-a', team1Score: 1, team2Score: 2 },
      teamId: 'team-a',
      expected: { opponentId: 'team-b', result: 'Win', score: '2–1' },
    },
  ])('$label', ({ match, teamId, expected }) => {
    expect(getOpponentId(match as any, teamId)).toBe(expected.opponentId);
    expect(getMatchResult(match as any, teamId)).toBe(expected.result);
    expect(getScoreDisplay(match as any, teamId)).toBe(expected.score);
  });

  it('calculates game stats including fallback score path and close losses', () => {
    const matches = [
      { iscompleted: true, team1Id: 'team-a', team2Id: 'team-b', team1_game_wins: 2, team2_game_wins: 1, loserId: 'team-b' },
      { iscompleted: true, team1Id: 'team-b', team2Id: 'team-a', team1_game_wins: 2, team2_game_wins: 1, loserId: 'team-a' },
      { iscompleted: true, team1Id: 'team-a', team2Id: 'team-c', winnerId: 'team-a', loserId: 'team-c' },
      { iscompleted: false, team1Id: 'team-a', team2Id: 'team-c', team1_game_wins: 2, team2_game_wins: 0 },
    ] as any;

    expect(calculateGameStats('team-a', matches)).toEqual({
      gamesWon: 4,
      gamesLost: 3,
      gameWinPercentage: 4 / 7,
      closeMatchLosses: 1,
    });
  });

  it('calculates head-to-head records and skips invalid/opponentless rows', () => {
    const teams = [
      { id: 'team-a', name: 'A' },
      { id: 'team-b', name: 'B' },
      { id: 'team-c', name: '' },
      { id: '', name: 'Bad' },
    ] as any;

    const matches = [
      { iscompleted: true, team1Id: 'team-a', team2Id: 'team-b', winnerId: 'team-a' },
      { iscompleted: true, team1Id: 'team-a', team2Id: 'team-b', winnerId: 'team-b' },
      { iscompleted: true, team1Id: 'team-c', team2Id: 'team-a', winnerId: 'team-c' },
      { iscompleted: false, team1Id: 'team-a', team2Id: 'team-c', winnerId: 'team-a' },
      null,
    ] as any;

    expect(calculateHeadToHead('team-a', teams, matches)).toEqual({
      'team-b': { opponentName: 'B', wins: 1, losses: 1 },
      'team-c': { opponentName: 'Unknown Team', wins: 0, losses: 1 },
    });
  });

  it('calculates sweep rate and clutch rate only for completed eligible matches', () => {
    const matches = [
      { iscompleted: true, team1Id: 'team-a', team2Id: 'team-b', winnerId: 'team-a', loserId: 'team-b', team1_game_wins: 2, team2_game_wins: 0 },
      { iscompleted: true, team1Id: 'team-c', team2Id: 'team-a', winnerId: 'team-a', loserId: 'team-c', team1_game_wins: 1, team2_game_wins: 2 },
      { iscompleted: true, team1Id: 'team-a', team2Id: 'team-d', winnerId: 'team-d', loserId: 'team-a', team1_game_wins: 1, team2_game_wins: 2 },
      { iscompleted: true, team1Id: 'team-a', team2Id: 'team-e', winnerId: 'team-a', loserId: 'team-e' },
    ] as any;

    expect(calculateSweepRate('team-a', matches)).toEqual({
      sweeps: 1,
      totalMatches: 4,
      sweepRate: 25,
    });

    expect(calculateClutchRecord('team-a', matches)).toEqual({
      clutchWins: 1,
      clutchLosses: 1,
      game3Matches: 2,
      clutchWinPct: 50,
    });
  });

  it('classifies rivalries and maps label/type thresholds', () => {
    const records = [
      { opponent_name: 'A', wins: 1, losses: 4, matches_played: 5, win_pct: 20 },
      { opponent_name: 'B', wins: 4, losses: 1, matches_played: 5, win_pct: 80 },
      { opponent_name: 'C', wins: 2, losses: 1, matches_played: 3, win_pct: 66.7 },
      { opponent_name: 'D', wins: 3, losses: 2, matches_played: 5, win_pct: 60 },
      { opponent_name: 'E', wins: 6, losses: 1, matches_played: 7, win_pct: 85.7 },
      { opponent_name: 'F', wins: 0, losses: 3, matches_played: 3, win_pct: 0 },
    ] as any;

    const result = classifyRivalries(records);

    expect(result.mostPlayed.map((r) => r.opponent_name)).toEqual(['E', 'A', 'B']);
    expect(result.closestRivalries.map((r) => r.opponent_name)).toEqual(['D', 'C']);
    expect(result.dominantMatchups.map((r) => r.opponent_name)).toEqual(['E', 'B']);
    expect(result.nemeses.map((r) => r.opponent_name)).toEqual(['F', 'A']);

    expect(getRivalryType({ wins: 0, losses: 3, matches_played: 3, win_pct: 0 } as any)).toBe('nemesis');
    expect(getRivalryType({ wins: 1, losses: 3, matches_played: 4, win_pct: 25 } as any)).toBe('tough_matchup');
    expect(getRivalryType({ wins: 2, losses: 2, matches_played: 4, win_pct: 50 } as any)).toBe('rival');
    expect(getRivalryType({ wins: 5, losses: 1, matches_played: 6, win_pct: 83 } as any)).toBe('dominated');
    expect(getRivalryType({ wins: 4, losses: 2, matches_played: 6, win_pct: 70 } as any)).toBe('favorite');
    expect(getRivalryType({ wins: 1, losses: 1, matches_played: 2, win_pct: 50 } as any)).toBeNull();

    expect(getRivalryLabel('nemesis', 'Opponent', { wins: 1, losses: 4, matches_played: 5 })).toBe('Opponent is 1-4 all-time');
    expect(getRivalryLabel('rival', 'Opponent', { wins: 2, losses: 2, matches_played: 4 })).toBe('Rivalry: 2-2 all-time');
  });
});
