import { afterEach, describe, expect, it, vi } from 'vitest';

import { transformParticipants, transformStoredParticipants } from '../ParticipantTransformer';

afterEach(() => vi.resetAllMocks());

describe('ParticipantTransformer', () => {
  it('sorts stored participants by seed and maps image fallbacks', () => {
    const ids = new Map<string, number>();
    const input = [
      { position: 2, team_id: 'b', name: 'B', logo_url: 'b.png' },
      { position: 1, team_id: 'a', name: 'A', image_url: 'a.png' },
    ];
    expect(transformStoredParticipants(input, ids)).toEqual([
      { id: 1, tournament_id: 1, name: 'A', image: 'a.png', position: 1 },
      { id: 2, tournament_id: 1, name: 'B', image: 'b.png', position: 2 },
    ]);
    expect([...ids]).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('maps live teams in input order', () => {
    const ids = new Map<string, number>();
    expect(
      transformParticipants(
        [
          { id: 'a', name: 'A', image_url: 'a.png' },
          { id: 'b', name: 'B', logo_url: 'b.png' },
        ],
        ids
      )
    ).toEqual([
      { id: 1, tournament_id: 1, name: 'A', image: 'a.png', position: 1 },
      { id: 2, tournament_id: 1, name: 'B', image: 'b.png', position: 2 },
    ]);
  });
});
