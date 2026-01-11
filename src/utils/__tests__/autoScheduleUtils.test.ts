import { describe, expect, it, vi } from 'vitest';

import { Team } from '@/types';
import { TeamPair } from '@/types/autoSchedule';

import { filterPairsWithPreviousMatches } from '../autoScheduleUtils';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          data: [],
          error: null,
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
  describe('filterPairsWithPreviousMatches', () => {
    it('should filter out pairs that have played before', async () => {
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
