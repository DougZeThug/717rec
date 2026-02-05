import { describe, expect, it } from 'vitest';

import { Team } from '@/types';

import {
  generateScheduleGreedy,
  generateScheduleGreedyWithTracking,
  GreedySchedulerInput,
  pairKey,
} from '../greedyBackToBackScheduler';

// Helper to create mock teams
function createMockTeam(id: string, name: string, division: string, tier: number = 1): Team {
  return {
    id,
    name,
    division_id: `div-${tier}`,
    divisionName: `Tier ${tier}`,
    logo_url: null,
    image_url: null,
    players: [],
    wins: 0,
    losses: 0,
    game_wins: 0,
    game_losses: 0,
    seed: null,
    created_at: new Date().toISOString(),
    challonge_participant_id: null,
    spotify_url: null,
  } as Team;
}

describe('greedyBackToBackScheduler', () => {
  describe('Even team count', () => {
    it('should schedule 10 teams with each appearing once in S1 and once in S2', () => {
      const teams: Team[] = [
        createMockTeam('1', 'Team A', 'Tier 1', 1),
        createMockTeam('2', 'Team B', 'Tier 1', 1),
        createMockTeam('3', 'Team C', 'Tier 1', 1),
        createMockTeam('4', 'Team D', 'Tier 1', 1),
        createMockTeam('5', 'Team E', 'Tier 2', 2),
        createMockTeam('6', 'Team F', 'Tier 2', 2),
        createMockTeam('7', 'Team G', 'Tier 2', 2),
        createMockTeam('8', 'Team H', 'Tier 2', 2),
        createMockTeam('9', 'Team I', 'Tier 3', 3),
        createMockTeam('10', 'Team J', 'Tier 3', 3),
      ];

      const input: GreedySchedulerInput = {
        teams,
        historyPairs: [],
        slots: ['8:30', '9:00'],
      };

      const result = generateScheduleGreedy(input);

      // Should have 10 total matches (5 in S1, 5 in S2)
      expect(result).toHaveLength(10);

      const s1Matches = result.filter((m) => m.slot === '8:30');
      const s2Matches = result.filter((m) => m.slot === '9:00');

      expect(s1Matches).toHaveLength(5);
      expect(s2Matches).toHaveLength(5);

      // Check each team appears exactly once in each slot
      const s1Teams = new Set([
        ...s1Matches.map((m) => m.teamAId),
        ...s1Matches.map((m) => m.teamBId),
      ]);
      const s2Teams = new Set([
        ...s2Matches.map((m) => m.teamAId),
        ...s2Matches.map((m) => m.teamBId),
      ]);

      expect(s1Teams.size).toBe(10);
      expect(s2Teams.size).toBe(10);

      // Check no session rematches
      const allPairs = new Set();
      for (const match of result) {
        const key = [match.teamAId, match.teamBId].sort().join('||');
        expect(allPairs.has(key)).toBe(false);
        allPairs.add(key);
      }
    });

    it('should maximize same-division pairings', () => {
      const teams: Team[] = [
        createMockTeam('1', 'T1-A', 'Tier 1', 1),
        createMockTeam('2', 'T1-B', 'Tier 1', 1),
        createMockTeam('3', 'T1-C', 'Tier 1', 1),
        createMockTeam('4', 'T1-D', 'Tier 1', 1),
        createMockTeam('5', 'T2-A', 'Tier 2', 2),
        createMockTeam('6', 'T2-B', 'Tier 2', 2),
        createMockTeam('7', 'T2-C', 'Tier 2', 2),
        createMockTeam('8', 'T2-D', 'Tier 2', 2),
      ];

      const input: GreedySchedulerInput = {
        teams,
        historyPairs: [],
        slots: ['8:30', '9:00'],
      };

      const result = generateScheduleGreedy(input);

      // Count same-division matches
      const sameDivisionMatches = result.filter((m) => m.tierA === m.tierB);

      // Should have mostly same-division matches (at least 6 out of 8)
      expect(sameDivisionMatches.length).toBeGreaterThanOrEqual(6);
    });

    it('should respect season history and avoid rematches', () => {
      const teams: Team[] = [
        createMockTeam('1', 'Team A', 'Tier 1', 1),
        createMockTeam('2', 'Team B', 'Tier 1', 1),
        createMockTeam('3', 'Team C', 'Tier 1', 1),
        createMockTeam('4', 'Team D', 'Tier 1', 1),
      ];

      const historyPairs: Array<[string, string]> = [
        ['1', '2'], // Team A played Team B
        ['3', '4'], // Team C played Team D
      ];

      const input: GreedySchedulerInput = {
        teams,
        historyPairs,
        slots: ['8:30', '9:00'],
      };

      const result = generateScheduleGreedy(input);

      // Check no history rematches
      for (const match of result) {
        const key = [match.teamAId, match.teamBId].sort().join('||');
        const hasPlayed = historyPairs.some(([a, b]) => {
          const historyKey = [a, b].sort().join('||');
          return historyKey === key;
        });
        expect(hasPlayed).toBe(false);
      }
    });
  });

  describe('Odd team count', () => {
    it('should schedule 9 teams with Bye1, Bye2, and S3 match', () => {
      const teams: Team[] = [
        createMockTeam('1', 'Team A', 'Tier 1', 1),
        createMockTeam('2', 'Team B', 'Tier 1', 1),
        createMockTeam('3', 'Team C', 'Tier 1', 1),
        createMockTeam('4', 'Team D', 'Tier 2', 2),
        createMockTeam('5', 'Team E', 'Tier 2', 2),
        createMockTeam('6', 'Team F', 'Tier 2', 2),
        createMockTeam('7', 'Team G', 'Tier 3', 3),
        createMockTeam('8', 'Team H', 'Tier 3', 3),
        createMockTeam('9', 'Team I', 'Tier 3', 3),
      ];

      const input: GreedySchedulerInput = {
        teams,
        historyPairs: [],
        slots: ['8:30', '9:00'],
        thirdSlot: '9:30',
      };

      const result = generateScheduleGreedy(input);

      // Should have 9 total matches (4 in S1, 4 in S2, 1 in S3)
      expect(result).toHaveLength(9);

      const s1Matches = result.filter((m) => m.slot === '8:30');
      const s2Matches = result.filter((m) => m.slot === '9:00');
      const s3Matches = result.filter((m) => m.slot === '9:30');

      expect(s1Matches).toHaveLength(4);
      expect(s2Matches).toHaveLength(4);
      expect(s3Matches).toHaveLength(1);

      // Find Bye1 and Bye2
      const s1TeamIds = new Set([...s1Matches.flatMap((m) => [m.teamAId, m.teamBId])]);
      const s2TeamIds = new Set([...s2Matches.flatMap((m) => [m.teamAId, m.teamBId])]);

      const bye1Id = teams.find((t) => !s1TeamIds.has(t.id))?.id;
      const bye2Id = teams.find((t) => !s2TeamIds.has(t.id))?.id;

      expect(bye1Id).toBeDefined();
      expect(bye2Id).toBeDefined();
      expect(bye1Id).not.toBe(bye2Id);

      // S3 match should be Bye1 vs Bye2
      const s3Match = s3Matches[0];
      const s3TeamIds = new Set([s3Match.teamAId, s3Match.teamBId]);
      expect(s3TeamIds.has(bye1Id!)).toBe(true);
      expect(s3TeamIds.has(bye2Id!)).toBe(true);

      // Check every team has exactly 2 matches
      const teamMatchCounts = new Map<string, number>();
      for (const match of result) {
        teamMatchCounts.set(match.teamAId, (teamMatchCounts.get(match.teamAId) || 0) + 1);
        teamMatchCounts.set(match.teamBId, (teamMatchCounts.get(match.teamBId) || 0) + 1);
      }

      for (const team of teams) {
        expect(teamMatchCounts.get(team.id)).toBe(2);
      }
    });

    it('should ensure Bye1 and Bye2 have not played each other before', () => {
      const teams: Team[] = [
        createMockTeam('1', 'Team A', 'Tier 1', 1),
        createMockTeam('2', 'Team B', 'Tier 1', 1),
        createMockTeam('3', 'Team C', 'Tier 1', 1),
        createMockTeam('4', 'Team D', 'Tier 1', 1),
        createMockTeam('5', 'Team E', 'Tier 1', 1),
      ];

      // Team C and Team D have played before
      const historyPairs: Array<[string, string]> = [['3', '4']];

      const input: GreedySchedulerInput = {
        teams,
        historyPairs,
        slots: ['8:30', '9:00'],
        thirdSlot: '9:30',
      };

      const result = generateScheduleGreedy(input);

      const s3Matches = result.filter((m) => m.slot === '9:30');
      expect(s3Matches).toHaveLength(1);

      const s3Match = s3Matches[0];
      const s3Key = [s3Match.teamAId, s3Match.teamBId].sort().join('||');

      // S3 match should NOT be Team C vs Team D
      expect(s3Key).not.toBe('3||4');
    });
  });

  describe('Tier gap constraints', () => {
    it('should block extreme tier gaps (>1)', () => {
      const teams: Team[] = [
        createMockTeam('1', 'T1-A', 'Tier 1', 1),
        createMockTeam('2', 'T1-B', 'Tier 1', 1),
        createMockTeam('3', 'T3-A', 'Tier 3', 3),
        createMockTeam('4', 'T3-B', 'Tier 3', 3),
      ];

      const input: GreedySchedulerInput = {
        teams,
        historyPairs: [],
        slots: ['8:30', '9:00'],
        config: {
          maxTierGap: 1,
        },
      };

      const result = generateScheduleGreedy(input);

      // Check no match has tier gap > 1
      for (const match of result) {
        const tierGap = Math.abs(match.tierA - match.tierB);
        expect(tierGap).toBeLessThanOrEqual(1);
      }
    });

    it('should prefer same-tier over adjacent-tier pairings', () => {
      const teams: Team[] = [
        createMockTeam('1', 'T1-A', 'Tier 1', 1),
        createMockTeam('2', 'T1-B', 'Tier 1', 1),
        createMockTeam('3', 'T2-A', 'Tier 2', 2),
        createMockTeam('4', 'T2-B', 'Tier 2', 2),
      ];

      const input: GreedySchedulerInput = {
        teams,
        historyPairs: [],
        slots: ['8:30', '9:00'],
      };

      const result = generateScheduleGreedy(input);

      // All matches should be same-tier in this case
      const sameTierMatches = result.filter((m) => m.tierA === m.tierB);
      expect(sameTierMatches).toHaveLength(result.length);
    });
  });

  describe('Deterministic output', () => {
    it('should produce same output for same input', () => {
      const teams: Team[] = [
        createMockTeam('1', 'Team A', 'Tier 1', 1),
        createMockTeam('2', 'Team B', 'Tier 1', 1),
        createMockTeam('3', 'Team C', 'Tier 1', 1),
        createMockTeam('4', 'Team D', 'Tier 1', 1),
      ];

      const input: GreedySchedulerInput = {
        teams,
        historyPairs: [],
        slots: ['8:30', '9:00'],
      };

      const result1 = generateScheduleGreedy(input);
      const result2 = generateScheduleGreedy(input);

      expect(result1).toEqual(result2);
    });
  });

  describe('Avoidable repeat avoidance', () => {
    it('should not produce season rematches when non-repeat perfect matchings exist (6 teams)', () => {
      // 6 same-tier teams with paired history: A-B, C-D, E-F
      // Non-repeat perfect matchings exist (e.g., A-C B-E D-F, then A-D B-F C-E)
      const teams: Team[] = [
        createMockTeam('1', 'Team A', 'Tier 1', 1),
        createMockTeam('2', 'Team B', 'Tier 1', 1),
        createMockTeam('3', 'Team C', 'Tier 1', 1),
        createMockTeam('4', 'Team D', 'Tier 1', 1),
        createMockTeam('5', 'Team E', 'Tier 1', 1),
        createMockTeam('6', 'Team F', 'Tier 1', 1),
      ];

      const historyPairs: Array<[string, string]> = [
        ['1', '2'], // A-B
        ['3', '4'], // C-D
        ['5', '6'], // E-F
      ];

      const input: GreedySchedulerInput = {
        teams,
        historyPairs,
        slots: ['8:30', '9:00'],
      };

      const result = generateScheduleGreedy(input);

      // Should produce 6 matches total (3 per slot)
      expect(result).toHaveLength(6);

      // No season rematches should exist
      const historySet = new Set(historyPairs.map(([a, b]) => pairKey(a, b)));
      const rematches = result.filter((m) => historySet.has(pairKey(m.teamAId, m.teamBId)));
      expect(rematches).toHaveLength(0);

      // Every team should have exactly 2 matches
      const teamMatchCounts = new Map<string, number>();
      for (const match of result) {
        teamMatchCounts.set(match.teamAId, (teamMatchCounts.get(match.teamAId) || 0) + 1);
        teamMatchCounts.set(match.teamBId, (teamMatchCounts.get(match.teamBId) || 0) + 1);
      }
      for (const team of teams) {
        expect(teamMatchCounts.get(team.id)).toBe(2);
      }
    });

    it('should not produce season rematches with 8 teams and heavy history', () => {
      // 8 same-tier teams with 4 history pairs
      // Each team has played exactly one opponent, but plenty of fresh options remain
      const teams: Team[] = [
        createMockTeam('1', 'Team A', 'Tier 2', 2),
        createMockTeam('2', 'Team B', 'Tier 2', 2),
        createMockTeam('3', 'Team C', 'Tier 2', 2),
        createMockTeam('4', 'Team D', 'Tier 2', 2),
        createMockTeam('5', 'Team E', 'Tier 2', 2),
        createMockTeam('6', 'Team F', 'Tier 2', 2),
        createMockTeam('7', 'Team G', 'Tier 2', 2),
        createMockTeam('8', 'Team H', 'Tier 2', 2),
      ];

      const historyPairs: Array<[string, string]> = [
        ['1', '2'], // A-B
        ['3', '4'], // C-D
        ['5', '6'], // E-F
        ['7', '8'], // G-H
      ];

      const input: GreedySchedulerInput = {
        teams,
        historyPairs,
        slots: ['8:30', '9:00'],
      };

      const result = generateScheduleGreedy(input);

      expect(result).toHaveLength(8);

      const historySet = new Set(historyPairs.map(([a, b]) => pairKey(a, b)));
      const rematches = result.filter((m) => historySet.has(pairKey(m.teamAId, m.teamBId)));
      expect(rematches).toHaveLength(0);
    });

    it('should handle the swap pass when greedy strands a pair', () => {
      // This specifically tests the case where greedy ordering would strand
      // two teams whose only remaining pairing is a blocked history match.
      // The swap pass should reorganize existing matches to fix this.
      const teams: Team[] = [
        createMockTeam('a', 'Alpha', 'Tier 1', 1),
        createMockTeam('b', 'Bravo', 'Tier 1', 1),
        createMockTeam('c', 'Charlie', 'Tier 1', 1),
        createMockTeam('d', 'Delta', 'Tier 1', 1),
        createMockTeam('e', 'Echo', 'Tier 1', 1),
        createMockTeam('f', 'Foxtrot', 'Tier 1', 1),
      ];

      // History: a-b, c-d, e-f (each historical pair blocks a rematch)
      const historyPairs: Array<[string, string]> = [
        ['a', 'b'],
        ['c', 'd'],
        ['e', 'f'],
      ];

      const result = generateScheduleGreedyWithTracking({
        teams,
        historyPairs,
        slots: ['8:30', '9:00'],
      });

      // Should have 6 matches (3 per slot), all non-rematches
      expect(result.matches).toHaveLength(6);

      const historySet = new Set(historyPairs.map(([a, b]) => pairKey(a, b)));
      const rematches = result.matches.filter((m) => historySet.has(pairKey(m.teamAId, m.teamBId)));
      expect(rematches).toHaveLength(0);

      // No relaxation should have been needed
      expect(result.diagnostics.relaxationApplied).toBe(0);
    });

    it('pairKey should normalize regardless of argument order', () => {
      expect(pairKey('abc', 'xyz')).toBe(pairKey('xyz', 'abc'));
      expect(pairKey('1', '2')).toBe('1||2');
      expect(pairKey('2', '1')).toBe('1||2');
    });
  });
});
