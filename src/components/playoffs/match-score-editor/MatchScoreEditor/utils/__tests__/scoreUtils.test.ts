import { describe, expect, it } from 'vitest';

import type { GameData } from '../../types';
import { calculateTotalScore, canAddMoreGames, validateMatchScores } from '../scoreUtils';

const game = (a: number, b: number): GameData => ({ team1Score: a, team2Score: b });

// Helper to produce N games where team1 wins each
const team1Wins = (n: number): GameData[] => Array.from({ length: n }, () => game(21, 15));
const team2Wins = (n: number): GameData[] => Array.from({ length: n }, () => game(15, 21));

describe('calculateTotalScore', () => {
  it('counts wins per team', () => {
    expect(calculateTotalScore([game(21, 15), game(15, 21), game(21, 10)])).toEqual({
      team1Wins: 2,
      team2Wins: 1,
    });
  });
});

describe('validateMatchScores', () => {
  describe('best of 3', () => {
    it('accepts 2-0', () => {
      expect(validateMatchScores(team1Wins(2), 3)).toEqual({ isValid: true, errorMessage: null });
    });

    it('accepts 2-1', () => {
      expect(validateMatchScores([...team1Wins(2), ...team2Wins(1)], 3)).toEqual({
        isValid: true,
        errorMessage: null,
      });
    });

    it('rejects 3-0 (winner exceeds minWins)', () => {
      const result = validateMatchScores(team1Wins(3), 3);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Invalid score combination');
    });

    it('rejects 0-3 (winner exceeds minWins)', () => {
      const result = validateMatchScores(team2Wins(3), 3);
      expect(result.isValid).toBe(false);
    });

    it('rejects 1-0 as incomplete', () => {
      const result = validateMatchScores(team1Wins(1), 3);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Incomplete');
    });

    it('allows zero scores (no games played yet)', () => {
      expect(validateMatchScores([], 3)).toEqual({ isValid: true, errorMessage: null });
    });

    it('rejects tied games with non-zero scores', () => {
      const result = validateMatchScores([game(15, 15), ...team1Wins(2)], 3);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toMatch(/tied/i);
    });
  });

  describe('best of 5', () => {
    it('accepts 3-0, 3-1, 3-2', () => {
      expect(validateMatchScores(team1Wins(3), 5).isValid).toBe(true);
      expect(validateMatchScores([...team1Wins(3), ...team2Wins(1)], 5).isValid).toBe(true);
      expect(validateMatchScores([...team1Wins(3), ...team2Wins(2)], 5).isValid).toBe(true);
    });

    it('rejects 4-0 (winner exceeds minWins)', () => {
      expect(validateMatchScores(team1Wins(4), 5).isValid).toBe(false);
    });

    it('rejects 4-1 (winner exceeds minWins)', () => {
      const result = validateMatchScores([...team1Wins(4), ...team2Wins(1)], 5);
      expect(result.isValid).toBe(false);
    });

    it('rejects total games > bestOf', () => {
      const games = [...team1Wins(3), ...team2Wins(3)];
      const result = validateMatchScores(games, 5);
      expect(result.isValid).toBe(false);
    });
  });

  it('rejects when both teams reach minWinsRequired', () => {
    const result = validateMatchScores([...team1Wins(2), ...team2Wins(2)], 3);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toMatch(/both teams/i);
  });
});

describe('canAddMoreGames', () => {
  it('returns true when games < bestOf', () => {
    expect(canAddMoreGames(team1Wins(2), 3)).toBe(true);
  });

  it('returns false when games === bestOf', () => {
    expect(canAddMoreGames(team1Wins(3), 3)).toBe(false);
  });
});
