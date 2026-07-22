import { describe, expect, it, vi } from 'vitest';

import { BracketStandingsService } from '../src/services/brackets/manager/services/BracketStandingsService';

type BracketStandingsServiceArgs = ConstructorParameters<typeof BracketStandingsService>;
type StandingsStorage = Pick<BracketStandingsServiceArgs[0], 'select'>;
type StandingsManager = Pick<BracketStandingsServiceArgs[1], 'get'>;

// Since PR-06, final standings are computed server-side by the
// finalize_bracket_standings RPC. The regression guarded here — that the LAST
// (highest-numbered) stage drives standings, not the first — now manifests as
// the completion pre-check querying the final stage's matches.
const { mockMatchEq, mockRpc } = vi.hoisted(() => ({
  mockMatchEq: vi.fn().mockResolvedValue({ data: [], error: null }),
  mockRpc: vi.fn().mockResolvedValue({ data: 2, error: null }),
}));

vi.mock('../src/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'match') {
        return { select: vi.fn().mockReturnValue({ eq: mockMatchEq }) };
      }
      return {};
    }),
    rpc: mockRpc,
  },
}));

vi.mock('../src/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  failureLog: vi.fn(),
  successLog: vi.fn(),
  warnLog: vi.fn(),
}));

describe('BracketStandingsService', () => {
  it('should use the LAST stage for final standings, not the first one', async () => {
    const mockStorage: StandingsStorage = {
      select: vi.fn().mockImplementation((table: string) => {
        if (table === 'stage') {
          // Simulate a tournament with a Group Stage and a Playoff Stage
          return Promise.resolve([
            { id: 1, name: 'Group Stage', number: 1 },
            { id: 2, name: 'Playoff Stage', number: 2 },
          ]);
        }
        if (table === 'participant') {
          return Promise.resolve([
            { id: 101, team_id: 'team-a', name: 'Team A' },
            { id: 102, team_id: 'team-b', name: 'Team B' },
          ]);
        }
        return Promise.resolve([]);
      }),
    };

    const mockManager: StandingsManager = {
      get: {
        finalStandings: vi.fn(),
      },
    };

    const service = new BracketStandingsService(
      mockStorage as BracketStandingsServiceArgs[0],
      mockManager as BracketStandingsServiceArgs[1]
    );
    await service.calculateFinalStandings('bracket-123');

    // The completion pre-check must run against the LAST stage (highest
    // number = 2), not the first one (1).
    expect(mockMatchEq).toHaveBeenCalledWith('stage_id', 2);
  });
});
