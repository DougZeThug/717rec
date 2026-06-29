import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';
import { getBackToBackPair, getPairConfig } from '@/utils/autoSchedule/constants';
import { errorLog } from '@/utils/logger';
import type { GreedySchedulerInput, ScheduledMatch } from '@/utils/scheduling/greedy';
import {
  generateScheduleGreedyWithTracking,
  pairKey,
} from '@/utils/scheduling/greedyBackToBackScheduler';

import { scheduleDualBlockPairings } from '../dualBlockScheduler';

vi.mock('@/utils/autoSchedule/constants', () => ({
  getPairConfig: vi.fn(),
  getBackToBackPair: vi.fn(),
}));

vi.mock('@/utils/scheduling/greedyBackToBackScheduler', () => ({
  generateScheduleGreedyWithTracking: vi.fn(),
  pairKey: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
  errorLog: vi.fn(),
}));

const mockGetPairConfig = vi.mocked(getPairConfig);
const mockGetBackToBackPair = vi.mocked(getBackToBackPair);
const mockGenerateScheduleGreedyWithTracking = vi.mocked(generateScheduleGreedyWithTracking);
const mockPairKey = vi.mocked(pairKey);
const mockErrorLog = vi.mocked(errorLog);

const makeTeam = (id: string, divisionName = 'Intermediate'): Team => ({
  id,
  name: `Team ${id}`,
  divisionName,
});

const makeMatch = (m: {
  teamAId: string;
  teamBId: string;
  slot: string;
  tierA: number;
  tierB: number;
}): ScheduledMatch => ({
  ...m,
  teamAName: `Team ${m.teamAId}`,
  teamBName: `Team ${m.teamBId}`,
  divisionA: 'Intermediate',
  divisionB: 'Intermediate',
});

const defaultDiagnostics = {
  relaxationApplied: 0 as const,
  constraintsRelaxed: [],
  repairAttempted: false,
  rematchesRepaired: 0,
  perTeamRematchAllowances: [],
};

describe('scheduleDualBlockPairings', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockGetBackToBackPair.mockReturnValue('S3' as never);
    mockGetPairConfig.mockImplementation(((pairName: string) => {
      if (pairName === 'Early') {
        return { primary: 'S1', secondary: 'S2', label: 'Early Pair' };
      }
      if (pairName === 'Mid') {
        return { primary: 'S3', secondary: 'S4', label: 'Mid Pair' };
      }
      return null;
    }) as never);
    mockPairKey.mockImplementation((a: string, b: string) => [a, b].sort().join('::'));
    mockGenerateScheduleGreedyWithTracking.mockReturnValue({
      matches: [],
      newPairs: new Set(),
      diagnostics: defaultDiagnostics,
    });
  });

  it('throws and triggers a destructive toast when no blocks contain teams', async () => {
    const toast = vi.fn();

    await expect(scheduleDualBlockPairings({}, {}, {}, [], toast)).rejects.toThrow(
      'No teams found in any time blocks'
    );

    expect(toast).toHaveBeenCalledWith({
      title: 'No Teams Found',
      description: 'Please load teams for a specific date first.',
      variant: 'destructive',
    });
    expect(mockGenerateScheduleGreedyWithTracking).not.toHaveBeenCalled();
  });

  it('logs invalid pair config and skips scheduling for that block', async () => {
    const teams = [makeTeam('A'), makeTeam('B')];
    const toast = vi.fn();

    const result = await scheduleDualBlockPairings(
      {
        Early: teams,
        InvalidPair: teams,
      },
      {},
      {
        A: ['Early'],
        B: ['Early'],
      },
      [],
      toast
    );

    expect(mockErrorLog).toHaveBeenCalledWith('Invalid pair configuration for: InvalidPair');
    expect(mockGenerateScheduleGreedyWithTracking).toHaveBeenCalledTimes(1);
    expect(result.pairings).toEqual({});
    expect(result.unmatchedTeamIds).toEqual(['A', 'B']);
  });

  it('uses match.slot as output key, reads hasPlayedBefore from history, and collects unmatched ids', async () => {
    const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C')];
    const toast = vi.fn();

    mockGenerateScheduleGreedyWithTracking.mockReturnValueOnce({
      matches: [
        makeMatch({
          teamAId: 'A',
          teamBId: 'B',
          slot: 'S2',
          tierA: 1,
          tierB: 1,
        }),
      ],
      newPairs: new Set(['A::B']),
      diagnostics: defaultDiagnostics,
    });

    const result = await scheduleDualBlockPairings(
      { Early: teams },
      {},
      {
        A: ['Early'],
        B: ['Early'],
        C: ['Early'],
      },
      [['B', 'A']],
      toast
    );

    expect(result.pairings.S2).toHaveLength(1);
    expect(result.pairings.S2[0].team1.id).toBe('A');
    expect(result.pairings.S2[0].team2.id).toBe('B');
    expect(result.pairings.S2[0].hasPlayedBefore).toBe(true);
    expect(result.unmatchedTeamIds).toEqual(['C']);
  });

  it('aggregates diagnostics across blocks by max relaxation, unioned constraints, and any repair flag', async () => {
    const earlyTeams = [makeTeam('A'), makeTeam('B')];
    const midTeams = [makeTeam('C'), makeTeam('D')];

    mockGenerateScheduleGreedyWithTracking
      .mockReturnValueOnce({
        matches: [
          makeMatch({
            teamAId: 'A',
            teamBId: 'B',
            slot: 'S1',
            tierA: 1,
            tierB: 2,
          }),
        ],
        newPairs: new Set(['A::B']),
        diagnostics: {
          ...defaultDiagnostics,
          relaxationApplied: 1,
          constraintsRelaxed: ['tier_constraints'],
        },
      })
      .mockReturnValueOnce({
        matches: [
          makeMatch({
            teamAId: 'C',
            teamBId: 'D',
            slot: 'S3',
            tierA: 2,
            tierB: 2,
          }),
        ],
        newPairs: new Set(['C::D']),
        diagnostics: {
          ...defaultDiagnostics,
          relaxationApplied: 3,
          constraintsRelaxed: ['season_rematches', 'tier_constraints'],
          repairAttempted: true,
        },
      });

    const result = await scheduleDualBlockPairings(
      {
        Early: earlyTeams,
        Mid: midTeams,
      },
      {},
      {
        A: ['Early'],
        B: ['Early'],
        C: ['Mid'],
        D: ['Mid'],
      },
      [],
      vi.fn()
    );

    expect(result.diagnostics).toEqual({
      relaxationApplied: 3,
      constraintsRelaxed: expect.arrayContaining(['tier_constraints', 'season_rematches']),
      repairAttempted: true,
    });
    expect(result.diagnostics.constraintsRelaxed).toHaveLength(2);
  });

  it('skips matches when blockMap does not include current pair assignment', async () => {
    const teams = [makeTeam('A'), makeTeam('B')];

    mockGenerateScheduleGreedyWithTracking.mockReturnValueOnce({
      matches: [
        makeMatch({
          teamAId: 'A',
          teamBId: 'B',
          slot: 'S1',
          tierA: 1,
          tierB: 1,
        }),
      ],
      newPairs: new Set(['A::B']),
      diagnostics: defaultDiagnostics,
    });

    const result = await scheduleDualBlockPairings(
      { Early: teams },
      {},
      {
        A: ['Early'],
        B: ['Mid'],
      },
      [],
      vi.fn()
    );

    expect(result.pairings).toEqual({});
    expect(mockErrorLog).toHaveBeenCalledWith(
      expect.stringContaining('CROSS-BLOCK MATCH DETECTED:')
    );
  });

  it('passes accumulated forbidden/session pairs between block scheduler calls', async () => {
    const earlyTeams = [makeTeam('A'), makeTeam('B')];
    const midTeams = [makeTeam('A'), makeTeam('C')];
    const forbiddenPairsSnapshots: string[][] = [];

    mockGenerateScheduleGreedyWithTracking.mockImplementation((({
      teams,
      forbiddenPairs,
    }: GreedySchedulerInput) => {
      forbiddenPairsSnapshots.push(Array.from(forbiddenPairs || []));

      const teamIds = teams.map((team) => team.id).sort();
      if (teamIds.join(',') === 'A,B') {
        return {
          matches: [
            makeMatch({
              teamAId: 'A',
              teamBId: 'B',
              slot: 'S1',
              tierA: 1,
              tierB: 1,
            }),
          ],
          newPairs: new Set(['A::B']),
          diagnostics: defaultDiagnostics,
        };
      }

      return {
        matches: [
          makeMatch({
            teamAId: 'A',
            teamBId: 'C',
            slot: 'S3',
            tierA: 1,
            tierB: 2,
          }),
        ],
        newPairs: new Set(['A::C']),
        diagnostics: defaultDiagnostics,
      };
    }) as never);

    await scheduleDualBlockPairings(
      {
        Early: earlyTeams,
        Mid: midTeams,
      },
      {},
      {
        A: ['Early', 'Mid'],
        B: ['Early'],
        C: ['Mid'],
      },
      [],
      vi.fn()
    );

    expect(mockGenerateScheduleGreedyWithTracking).toHaveBeenCalledTimes(2);
    expect(forbiddenPairsSnapshots).toEqual([[], ['A::B']]);
  });
});
