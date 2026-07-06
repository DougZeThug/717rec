import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/types/errors';

import { determineMatchResults } from '../utils/matchResultUtils';

describe('determineMatchResults', () => {
  it('declares team1 the winner when team1 has more game wins', () => {
    const result = determineMatchResults(2, 1, 'team-1', 'team-2');

    expect(result).toEqual({
      winnerId: 'team-1',
      loserId: 'team-2',
      team1GameWins: 2,
      team2GameWins: 1,
      team1Id: 'team-1',
      team2Id: 'team-2',
    });
  });

  it('declares team2 the winner when team2 has more game wins', () => {
    const result = determineMatchResults(0, 2, 'team-1', 'team-2');

    expect(result.winnerId).toBe('team-2');
    expect(result.loserId).toBe('team-1');
    expect(result.team1GameWins).toBe(0);
    expect(result.team2GameWins).toBe(2);
  });

  it('preserves the exact game win counts on the result payload', () => {
    const result = determineMatchResults(3, 2, 'a', 'b');

    expect(result.team1GameWins).toBe(3);
    expect(result.team2GameWins).toBe(2);
    expect(result.team1Id).toBe('a');
    expect(result.team2Id).toBe('b');
  });

  it('throws a ValidationError when game wins are tied instead of picking a winner', () => {
    expect(() => determineMatchResults(1, 1, 'team-1', 'team-2')).toThrow(ValidationError);
    expect(() => determineMatchResults(0, 0, 'team-1', 'team-2')).toThrow(
      'Cannot determine a match winner: game wins are tied'
    );
  });
});
