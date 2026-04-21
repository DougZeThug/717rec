import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/types/errors';

import { ScoreParser } from '../ScoreParser';

describe('ScoreParser', () => {
  it('parses score text into expected shape and game list', () => {
    const parsed = ScoreParser.parseScoreString('2-1', 'match-1');

    expect(parsed).toEqual({
      team1Score: 2,
      team2Score: 1,
      games: [
        expect.objectContaining({ matchId: 'match-1', gameNumber: 1, team1Score: 21, team2Score: 15 }),
        expect.objectContaining({ matchId: 'match-1', gameNumber: 2, team1Score: 21, team2Score: 15 }),
        expect.objectContaining({ matchId: 'match-1', gameNumber: 3, team1Score: 15, team2Score: 21 }),
      ],
    });
  });

  it('throws ValidationError for invalid score format', () => {
    expect(() => ScoreParser.parseScoreString('abc', 'match-1')).toThrow(ValidationError);
  });

  it('returns null winner for tied score (valid no winner case)', () => {
    expect(ScoreParser.getWinnerId(1, 1, 't1', 't2')).toBeNull();
  });
});
