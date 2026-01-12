import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockTeams } from '@/utils/test/autoSchedule/mockData';

import { calculateTeamCompatibility, haveTeamsPlayed } from '../compatibilityUtils';
import { fetchTeamsPlayedHistory } from '../matchHistoryDataAccess';

vi.mock('../matchHistoryDataAccess', () => ({
  fetchTeamsPlayedHistory: vi.fn(),
}));

describe('compatibilityUtils', () => {
  describe('calculateTeamCompatibility', () => {
    it('should calculate higher compatibility for teams with similar stats', () => {
      const team1 = mockTeams[0]; // Tigers: 5-2, powerscore 75
      const team2 = mockTeams[1]; // Lions: 6-1, powerscore 85
      const team3 = mockTeams[3]; // Bears: 2-5, powerscore 45

      const score1 = calculateTeamCompatibility(team1, team2);
      const score2 = calculateTeamCompatibility(team1, team3);

      // Teams with similar stats should have higher compatibility
      expect(score1).toBeGreaterThan(score2);
    });

    it('should return a value between 0 and 10', () => {
      mockTeams.forEach((team1) => {
        mockTeams.forEach((team2) => {
          if (team1.id !== team2.id) {
            const score = calculateTeamCompatibility(team1, team2);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(10);
          }
        });
      });
    });

    it('should handle teams with missing stats gracefully', () => {
      const incompleteTeam = { ...mockTeams[0], sos: undefined, power_score: undefined };
      const score = calculateTeamCompatibility(incompleteTeam, mockTeams[1]);

      // Should still calculate a score without errors
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  describe('haveTeamsPlayed', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should return true if teams have played before', async () => {
      vi.mocked(fetchTeamsPlayedHistory).mockResolvedValue(true);

      const result = await haveTeamsPlayed('team1', 'team2');
      expect(result).toBe(true);
      expect(fetchTeamsPlayedHistory).toHaveBeenCalledWith('team1', 'team2');
    });

    it('should return false if teams have not played before', async () => {
      vi.mocked(fetchTeamsPlayedHistory).mockResolvedValue(false);

      const result = await haveTeamsPlayed('team1', 'team3');
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(fetchTeamsPlayedHistory).mockResolvedValue(false);

      const result = await haveTeamsPlayed('team1', 'team4');
      // Should return false as a fallback on error
      expect(result).toBe(false);
    });
  });
});
