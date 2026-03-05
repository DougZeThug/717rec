import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Team } from '@/types';
import { TeamPair } from '@/types/autoSchedule';

import { filterPairsWithPreviousMatches } from '../autoScheduleUtils';

// Use vi.hoisted so we can control the limit mock per-test
const mockLimit = vi.hoisted(() => vi.fn());

// Mock supabase with .limit() in the chain
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          limit: mockLimit,
        })),
      })),
    })),
  },
}));

const createMockTeam = (id: string, name: string): Team =>
  ({
    id,
    name,
    logoUrl: '/logo.png',
    wins: 0,
    losses: 0,
    game_wins: 0,
    game_losses: 0,
    sos: 0,
    power_score: 50,
  }) as Team;

const createMockPair = (team1Id: string, team2Id: string, hasPlayedBefore = false): TeamPair => ({
  team1: createMockTeam(team1Id, `Team ${team1Id}`),
  team2: createMockTeam(team2Id, `Team ${team2Id}`),
  compatibilityScore: 8.0,
  hasPlayedBefore,
});

describe('autoScheduleUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no matches found for any pair
    mockLimit.mockResolvedValue({ data: [], error: null });
  });

  describe('filterPairsWithPreviousMatches', () => {
    it('should filter out pairs that have played before', async () => {
      // Process pairs in order: team-1/2 (no), team-3/4 (yes), team-5/6 (no)
      mockLimit
        .mockResolvedValueOnce({ data: [], error: null }) // team-1/team-2: not played
        .mockResolvedValueOnce({ data: [{ id: 'match-1' }], error: null }) // team-3/team-4: played
        .mockResolvedValueOnce({ data: [], error: null }); // team-5/team-6: not played

      const pairs: TeamPair[] = [
        createMockPair('team-1', 'team-2', false), // No previous match
        createMockPair('team-3', 'team-4', true), // Has played before
        createMockPair('team-5', 'team-6', false), // No previous match
      ];

      const filtered = await filterPairsWithPreviousMatches(pairs);

      // Should only include pairs that haven't played before
      expect(filtered.length).toBe(2);
      expect(filtered.some((p) => p.team1.id === 'team-3' && p.team2.id === 'team-4')).toBe(false);
    });

    it('should return all pairs when none have played before', async () => {
      const pairs: TeamPair[] = [
        createMockPair('team-1', 'team-2', false),
        createMockPair('team-3', 'team-4', false),
        createMockPair('team-5', 'team-6', false),
      ];

      const filtered = await filterPairsWithPreviousMatches(pairs);

      expect(filtered.length).toBe(3);
    });

    it('should return empty array when all pairs have played before', async () => {
      // Both pairs have played
      mockLimit
        .mockResolvedValueOnce({ data: [{ id: 'match-1' }], error: null })
        .mockResolvedValueOnce({ data: [{ id: 'match-2' }], error: null });

      const pairs: TeamPair[] = [
        createMockPair('team-1', 'team-2', true),
        createMockPair('team-3', 'team-4', true),
      ];

      const filtered = await filterPairsWithPreviousMatches(pairs);

      expect(filtered.length).toBe(0);
    });

    it('should handle empty input', async () => {
      const filtered = await filterPairsWithPreviousMatches([]);
      expect(filtered.length).toBe(0);
    });
  });
});
