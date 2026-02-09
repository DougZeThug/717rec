import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BracketStandingsService } from '../src/services/brackets/manager/services/BracketStandingsService';

// Mock dependencies
vi.mock('../src/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
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
    const mockStorage = {
      select: vi.fn().mockImplementation(async (table, filter) => {
        if (table === 'stage') {
          // Simulate a tournament with a Group Stage and a Playoff Stage
          return [
            { id: 1, name: 'Group Stage', number: 1 },
            { id: 2, name: 'Playoff Stage', number: 2 },
          ];
        }
        if (table === 'participant') {
          return [
            { id: 101, team_id: 'team-a', name: 'Team A' },
            { id: 102, team_id: 'team-b', name: 'Team B' },
          ];
        }
        return [];
      }),
    };

    const mockManager = {
      get: {
        finalStandings: vi.fn().mockResolvedValue([
          { id: 101, rank: 1 },
          { id: 102, rank: 2 },
        ]),
      },
    };

    const service = new BracketStandingsService(mockStorage as any, mockManager as any);
    await service.calculateFinalStandings('bracket-123');

    // Currently it calls with 1 (the first stage), but it should call with 2 (the final stage)
    expect(mockManager.get.finalStandings).toHaveBeenCalledWith(2);
  });
});
