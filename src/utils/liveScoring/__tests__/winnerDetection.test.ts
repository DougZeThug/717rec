import { describe, expect, it } from 'vitest';

import { DEFAULT_GAME_RULES } from '../rules';
import { checkGameWinner } from '../winnerDetection';

describe('checkGameWinner (first to 21, win by 2)', () => {
  it('uses 21 / win-by-2 as the league default', () => {
    expect(DEFAULT_GAME_RULES).toEqual({ targetScore: 21, winBy: 2, hardCap: null });
  });

  it('no winner before either team reaches 21', () => {
    expect(checkGameWinner(0, 0)).toBeNull();
    expect(checkGameWinner(20, 10)).toBeNull();
    expect(checkGameWinner(15, 20)).toBeNull();
  });

  it('wins at 21 with a lead of 2 or more', () => {
    expect(checkGameWinner(21, 19)).toBe(1);
    expect(checkGameWinner(19, 21)).toBe(2);
    expect(checkGameWinner(21, 0)).toBe(1);
  });

  it('does NOT win at 21 with only a 1-point lead (win by 2)', () => {
    expect(checkGameWinner(21, 20)).toBeNull();
    expect(checkGameWinner(20, 21)).toBeNull();
  });

  it('game continues past 21 until someone leads by 2', () => {
    expect(checkGameWinner(22, 21)).toBeNull();
    expect(checkGameWinner(23, 21)).toBe(1);
    expect(checkGameWinner(21, 25)).toBe(2);
  });

  it('exact league boundary cases', () => {
    expect(checkGameWinner(21, 19)).toBe(1); // 21-19 wins
    expect(checkGameWinner(21, 20)).toBeNull(); // 21-20 does not win
    expect(checkGameWinner(22, 20)).toBe(1); // 22-20 wins
    expect(checkGameWinner(23, 22)).toBeNull(); // 23-22 does not win
    expect(checkGameWinner(24, 22)).toBe(1); // 24-22 wins
    expect(checkGameWinner(22, 24)).toBe(2); // mirrored for team 2
  });

  it('honors a custom win-by-1 rule', () => {
    const rules = { targetScore: 21, winBy: 1, hardCap: null };
    expect(checkGameWinner(21, 20, rules)).toBe(1);
    expect(checkGameWinner(20, 21, rules)).toBe(2);
    expect(checkGameWinner(21, 21, rules)).toBeNull();
  });

  it('honors a hard cap regardless of lead', () => {
    const rules = { targetScore: 21, winBy: 2, hardCap: 25 };
    expect(checkGameWinner(25, 24, rules)).toBe(1);
    expect(checkGameWinner(24, 25, rules)).toBe(2);
    expect(checkGameWinner(24, 23, rules)).toBeNull();
  });
});
