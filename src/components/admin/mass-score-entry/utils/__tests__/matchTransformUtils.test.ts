import { describe, expect, it, vi } from 'vitest';

type MatchTransformerInput = {
  id: string;
  team1_id: string;
  team2_id: string;
  date: string;
};

vi.mock('@/utils/matchTransformers', () => ({
  transformDatabaseMatch: vi.fn((match: MatchTransformerInput) => ({
    id: match.id,
    team1Id: match.team1_id,
    team2Id: match.team2_id,
    date: match.date,
  })),
}));

import { transformDatabaseMatchToMatchWithTeams } from '../matchTransformUtils';

describe('transformDatabaseMatchToMatchWithTeams', () => {
  it('transforms game wins and team metadata', () => {
    const transformed = transformDatabaseMatchToMatchWithTeams({
      id: 'm1',
      team1_id: 't1',
      team2_id: 't2',
      date: '2026-02-01T00:00:00.000Z',
      team1_game_wins: '2',
      team2_game_wins: 1,
      team1: { id: 't1', name: 'One', image_url: 'one.png' },
      team2: { id: 't2', name: 'Two', logo_url: 'two.png' },
    });

    expect(transformed.team1_game_wins).toBe(2);
    expect(transformed.team2_game_wins).toBe(1);
    expect(transformed.team1?.logoUrl).toBe('one.png');
    expect(transformed.team2?.logoUrl).toBe('two.png');
    expect(transformed.isEdited).toBe(false);
    expect(transformed.isValid).toBe(true);
  });
});
