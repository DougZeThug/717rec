import { describe, expect, it } from 'vitest';

import type { Match, Team } from '@/types';
import type { HeadToHeadRecord } from '@/types/headToHead';

import { calculateGameStats } from '../gameStatsUtils';
import { calculateHeadToHead } from '../headToHeadUtils';
import { calculateClutchRecord } from '../matchOutcomeUtils';
import { getMatchResult, getOpponentId, getScoreDisplay, getUpcomingAndPastMatches } from '../matchUtils';
import { classifyRivalries, getRivalryLabel, getRivalryType } from '../rivalryUtils';
import { calculateSweepRate } from '../sweepRateUtils';

type MinimalMatch = Pick<
  Match,
  | 'id'
  | 'team1Id'
  | 'team2Id'
  | 'date'
  | 'iscompleted'
  | 'winnerId'
  | 'loserId'
  | 'team1Score'
  | 'team2Score'
  | 'team1_game_wins'
  | 'team2_game_wins'
>;

describe('teamDetails utilities', () => {
  it('handles undefined/empty inputs with safe defaults', () => {
    expect(getUpcomingAndPastMatches()).toEqual({ upcomingMatches: [], pastMatches: [] });
    expect(calculateSweepRate('team-a')).toEqual({ sweeps: 0, totalMatches: 0, sweepRate: 0 });
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

    const matches: MinimalMatch[] = [
      { id: 'up-2', team1Id: 'a', team2Id: 'b', date: inTwoDays.toISOString() },
      { id: 'past-1', team1Id: 'a', team2Id: 'b', date: yesterday.toISOString() },
      { id: 'up-1', team1Id: 'a', team2Id: 'b', date: tomorrow.toISOString() },
    ];

    const result = getUpcomingAndPastMatches(matches as Match[]);

    expect(result.upcomingMatches.map((m) => m.id)).toEqual(['up-1', 'up-2']);
    expect(result.pastMatches.map((m) => m.id)).toEqual(['past-1']);
  });

  it.each([
    {
      label: 'completed win for team1',
      match: { id: 'm1', iscompleted: true, winnerId: 'team-a', team1Id: 'team-a', team2Id: 'team-b', team1Score: 2, team2Score: 1 },
      teamId: 'team-a',
      expected: { opponentId: 'team-b', result: 'Win', score: '2–1' },
    },
    {
      label: 'incomplete match',
      match: { id: 'm2', iscompleted: false, winnerId: 'team-b', team1Id: 'team-a', team2Id: 'team-b' },
      teamId: 'team-a',
      expected: { opponentId: 'team-b', result: 'Incomplete', score: '' },
    },
    {
      label: 'team as team2 score flips',
      match: { id: 'm3', iscompleted: true, winnerId: 'team-a', team1Id: 'team-b', team2Id: 'team-a', team1Score: 1, team2Score: 2 },
      teamId: 'team-a',
      expected: { opponentId: 'team-b', result: 'Win', score: '2–1' },
    },
  ])('$label', ({ match, teamId, expected }) => {
    const typedMatch = match as Match;
    expect(getOpponentId(typedMatch, teamId)).toBe(expected.opponentId);
    expect(getMatchResult(typedMatch, teamId)).toBe(expected.result);
    expect(getScoreDisplay(typedMatch, teamId)).toBe(expected.score);
  });

  it('calculates game stats including fallback score path and close losses', () => {
    const matches: MinimalMatch[] = [
      { id: 'm1', iscompleted: true, team1Id: 'team-a', team2Id: 'team-b', team1_game_wins: 2, team2_game_wins: 1, loserId: 'team-b' },
      { id: 'm2', iscompleted: true, team1Id: 'team-b', team2Id: 'team-a', team1_game_wins: 2, team2_game_wins: 1, loserId: 'team-a' },
      { id: 'm3', iscompleted: true, team1Id: 'team-a', team2Id: 'team-c', winnerId: 'team-a', loserId: 'team-c' },
      { id: 'm4', iscompleted: false, team1Id: 'team-a', team2Id: 'team-c', team1_game_wins: 2, team2_game_wins: 0 },
    ];

    expect(calculateGameStats('team-a', matches as Match[])).toEqual({
      gamesWon: 4,
      gamesLost: 3,
      gameWinPercentage: 4 / 7,
      closeMatchLosses: 1,
    });
  });

  it('calculates head-to-head records and skips teams without ids', () => {
    const teams: Team[] = [
      { id: 'team-a', name: 'A' },
      { id: 'team-b', name: 'B' },
      { id: 'team-c', name: '' },
    ];

    const matches: Match[] = [
      { id: 'm1', iscompleted: true, team1Id: 'team-a', team2Id: 'team-b', winnerId: 'team-a' },
      { id: 'm2', iscompleted: true, team1Id: 'team-a', team2Id: 'team-b', winnerId: 'team-b' },
      { id: 'm3', iscompleted: true, team1Id: 'team-c', team2Id: 'team-a', winnerId: 'team-c' },
      { id: 'm4', iscompleted: false, team1Id: 'team-a', team2Id: 'team-c', winnerId: 'team-a' },
    ];

    expect(calculateHeadToHead('team-a', teams, matches)).toEqual({
      'team-b': { opponentName: 'B', wins: 1, losses: 1 },
      'team-c': { opponentName: 'Unknown Team', wins: 0, losses: 1 },
    });
  });

  it('calculates sweep rate and clutch rate only for completed eligible matches', () => {
    const matches: Match[] = [
      { id: 'm1', iscompleted: true, team1Id: 'team-a', team2Id: 'team-b', winnerId: 'team-a', loserId: 'team-b', team1_game_wins: 2, team2_game_wins: 0 },
      { id: 'm2', iscompleted: true, team1Id: 'team-c', team2Id: 'team-a', winnerId: 'team-a', loserId: 'team-c', team1_game_wins: 1, team2_game_wins: 2 },
      { id: 'm3', iscompleted: true, team1Id: 'team-a', team2Id: 'team-d', winnerId: 'team-d', loserId: 'team-a', team1_game_wins: 1, team2_game_wins: 2 },
      { id: 'm4', iscompleted: true, team1Id: 'team-a', team2Id: 'team-e', winnerId: 'team-a', loserId: 'team-e' },
    ];

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
    const records: HeadToHeadRecord[] = [
      { team_id: 'team-a', opponent_id: 'A', opponent_name: 'A', matches_played: 5, wins: 1, losses: 4, game_wins: 3, game_losses: 8, win_pct: 20, last_played_at: null },
      { team_id: 'team-a', opponent_id: 'B', opponent_name: 'B', matches_played: 5, wins: 4, losses: 1, game_wins: 8, game_losses: 3, win_pct: 80, last_played_at: null },
      { team_id: 'team-a', opponent_id: 'C', opponent_name: 'C', matches_played: 3, wins: 2, losses: 1, game_wins: 5, game_losses: 3, win_pct: 66.7, last_played_at: null },
      { team_id: 'team-a', opponent_id: 'D', opponent_name: 'D', matches_played: 5, wins: 3, losses: 2, game_wins: 7, game_losses: 6, win_pct: 60, last_played_at: null },
      { team_id: 'team-a', opponent_id: 'E', opponent_name: 'E', matches_played: 7, wins: 6, losses: 1, game_wins: 12, game_losses: 5, win_pct: 85.7, last_played_at: null },
      { team_id: 'team-a', opponent_id: 'F', opponent_name: 'F', matches_played: 3, wins: 0, losses: 3, game_wins: 1, game_losses: 6, win_pct: 0, last_played_at: null },
    ];

    const result = classifyRivalries(records);

    expect(result.mostPlayed.map((r) => r.opponent_name)).toEqual(['E', 'A', 'B']);
    expect(result.closestRivalries.map((r) => r.opponent_name)).toEqual(['D', 'C']);
    expect(result.dominantMatchups.map((r) => r.opponent_name)).toEqual(['E', 'B']);
    expect(result.nemeses.map((r) => r.opponent_name)).toEqual(['F', 'A']);

    const rivalryCases: Array<{ record: HeadToHeadRecord; expected: ReturnType<typeof getRivalryType> }> = [
      {
        record: { team_id: 'team-a', opponent_id: 'n', opponent_name: 'N', matches_played: 3, wins: 0, losses: 3, game_wins: 0, game_losses: 6, win_pct: 0, last_played_at: null },
        expected: 'nemesis',
      },
      {
        record: { team_id: 'team-a', opponent_id: 't', opponent_name: 'T', matches_played: 4, wins: 1, losses: 3, game_wins: 2, game_losses: 6, win_pct: 25, last_played_at: null },
        expected: 'tough_matchup',
      },
      {
        record: { team_id: 'team-a', opponent_id: 'r', opponent_name: 'R', matches_played: 4, wins: 2, losses: 2, game_wins: 4, game_losses: 4, win_pct: 50, last_played_at: null },
        expected: 'rival',
      },
      {
        record: { team_id: 'team-a', opponent_id: 'd', opponent_name: 'D', matches_played: 6, wins: 5, losses: 1, game_wins: 10, game_losses: 3, win_pct: 83, last_played_at: null },
        expected: 'dominated',
      },
      {
        record: { team_id: 'team-a', opponent_id: 'f', opponent_name: 'F', matches_played: 6, wins: 4, losses: 2, game_wins: 9, game_losses: 5, win_pct: 70, last_played_at: null },
        expected: 'favorite',
      },
      {
        record: { team_id: 'team-a', opponent_id: 'x', opponent_name: 'X', matches_played: 2, wins: 1, losses: 1, game_wins: 2, game_losses: 2, win_pct: 50, last_played_at: null },
        expected: null,
      },
    ];

    rivalryCases.forEach(({ record, expected }) => {
      expect(getRivalryType(record)).toBe(expected);
    });

    expect(getRivalryLabel('nemesis', 'Opponent', { wins: 1, losses: 4, matches_played: 5 })).toBe('Opponent is 1-4 all-time');
    expect(getRivalryLabel('rival', 'Opponent', { wins: 2, losses: 2, matches_played: 4 })).toBe('Rivalry: 2-2 all-time');
  });
});
