import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MatchQualityMetrics, Team, TeamPairingMap, TimeBlockTeamsMap } from '@/types';
import {
  logCrossBlockViolations,
  validateNoCrossBlockMatches,
} from '@/utils/autoSchedule/validationUtils';

import { usePairingOperations } from '../usePairingOperations';

const mockLoadAutoScheduleState = vi.fn();
const mockSaveAutoScheduleState = vi.fn();
const mockGenerateMatchPairings = vi.fn();
const mockToast = vi.fn();
const mockValidateScheduleDate = vi.fn();
const mockCalculateComprehensiveQualityMetrics = vi.fn();
const mockLogQualityAnalysis = vi.fn();
const mockScheduleLog = vi.fn();
const mockErrorLog = vi.fn();

vi.mock('../storage', () => ({
  loadAutoScheduleState: () => mockLoadAutoScheduleState(),
  saveAutoScheduleState: (state: unknown) => mockSaveAutoScheduleState(state),
}));

vi.mock('@/hooks/scheduling/usePairingGenerator', () => ({
  usePairingGenerator: () => ({
    isGenerating: false,
    generateMatchPairings: (...args: unknown[]) => mockGenerateMatchPairings(...args),
    teamBlockMap: {},
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: (...args: unknown[]) => mockToast(...args),
  }),
}));

vi.mock('@/utils/autoSchedule/dateUtils', () => ({
  validateScheduleDate: (...args: unknown[]) => mockValidateScheduleDate(...args),
  normalizeScheduleDate: (date: Date | string | null) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },
}));

vi.mock('@/utils/autoSchedule/qualityAnalysis', () => ({
  calculateComprehensiveQualityMetrics: (...args: unknown[]) =>
    mockCalculateComprehensiveQualityMetrics(...args),
  logQualityAnalysis: (...args: unknown[]) => mockLogQualityAnalysis(...args),
}));

vi.mock('@/utils/autoSchedule/validationUtils', () => ({
  validateNoCrossBlockMatches: vi.fn(() => ({ isValid: true, violations: [] })),
  logCrossBlockViolations: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  scheduleLog: (...args: unknown[]) => mockScheduleLog(...args),
  errorLog: (...args: unknown[]) => mockErrorLog(...args),
}));

const buildTeam = (id: string): Team => ({
  id,
  name: `Team ${id}`,
});

const buildPairings = (): TeamPairingMap => ({
  Early: [
    {
      team1: buildTeam('1'),
      team2: buildTeam('2'),
      compatibilityScore: 8,
      hasPlayedBefore: true,
    },
    {
      team1: buildTeam('3'),
      team2: buildTeam('4'),
      compatibilityScore: 6,
      hasPlayedBefore: false,
    },
  ],
});

const metrics: MatchQualityMetrics = {
  totalMatches: 2,
  rematchCount: 1,
  averageCompatibilityScore: 7,
  qualityRating: 'Good',
  opponentDiversity: {
    duplicateOpponents: 0,
    uniqueOpponents: 4,
    diversityScore: 100,
  },
  powerScoreAnalysis: {
    averagePowerScoreDifference: 10,
    balancedMatches: 2,
    unbalancedMatches: 0,
  },
  performanceMetrics: {
    generationTimeMs: 1,
    algorithmsUsed: ['standard'],
    optimizationLevel: 'basic',
  },
  feedback: {
    strengths: ['balanced'],
    improvements: [],
    recommendations: [],
  },
};

describe('usePairingOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadAutoScheduleState.mockReturnValue(null);
    mockValidateScheduleDate.mockReturnValue(true);
    mockCalculateComprehensiveQualityMetrics.mockReturnValue(metrics);
  });

  it('guards handleGenerateClick for no date, invalid date, and zero loaded teams', async () => {
    const setActiveTab = vi.fn();
    const setIsProcessing = vi.fn();
    const { result } = renderHook(() => usePairingOperations(setActiveTab));

    await act(async () => {
      await result.current.handleGenerateClick(
        null,
        { Early: [buildTeam('1')] },
        null,
        false,
        false,
        false,
        setIsProcessing
      );
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Please select a date first.' })
    );

    mockValidateScheduleDate.mockReturnValue(false);
    await act(async () => {
      await result.current.handleGenerateClick(
        new Date('2026-04-20T00:00:00.000Z'),
        { Early: [buildTeam('1')] },
        null,
        false,
        false,
        false,
        setIsProcessing
      );
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Invalid date selected. Please choose a valid date.' })
    );

    mockValidateScheduleDate.mockReturnValue(true);
    await act(async () => {
      await result.current.handleGenerateClick(
        new Date('2026-04-20T00:00:00.000Z'),
        {},
        null,
        false,
        false,
        false,
        setIsProcessing
      );
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('No teams found') })
    );
    expect(mockGenerateMatchPairings).not.toHaveBeenCalled();
  });

  describe('stale loaded-teams guard', () => {
    const loadedTeams: TimeBlockTeamsMap = {
      Early: [buildTeam('1'), buildTeam('2'), buildTeam('3'), buildTeam('4')],
    };

    it('refuses to generate when teams were loaded for a different calendar day', async () => {
      const setIsProcessing = vi.fn();
      const { result } = renderHook(() => usePairingOperations(vi.fn()));

      await act(async () => {
        await result.current.handleGenerateClick(
          new Date(2026, 3, 21, 10, 0, 0, 0), // selected date
          loadedTeams,
          new Date(2026, 3, 20, 10, 0, 0, 0), // teams loaded a day earlier
          false,
          false,
          false,
          setIsProcessing
        );
      });

      expect(mockGenerateMatchPairings).not.toHaveBeenCalled();
      expect(result.current.generationDate).toBeNull();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Teams Out of Date', variant: 'destructive' })
      );
    });

    it('generates when teams were loaded for the same day at a different time', async () => {
      mockGenerateMatchPairings.mockResolvedValue({
        pairings: buildPairings(),
        unmatchedTeamIds: [],
      });
      const setIsProcessing = vi.fn();
      const { result } = renderHook(() => usePairingOperations(vi.fn()));

      await act(async () => {
        await result.current.handleGenerateClick(
          new Date(2026, 3, 20, 0, 0, 0, 0),
          loadedTeams,
          new Date(2026, 3, 20, 18, 45, 0, 0),
          false,
          false,
          false,
          setIsProcessing
        );
      });

      expect(mockGenerateMatchPairings).toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Teams Out of Date' })
      );
    });

    it('generates when the load date is unknown (state saved before it was tracked)', async () => {
      mockGenerateMatchPairings.mockResolvedValue({
        pairings: buildPairings(),
        unmatchedTeamIds: [],
      });
      const setIsProcessing = vi.fn();
      const { result } = renderHook(() => usePairingOperations(vi.fn()));

      await act(async () => {
        await result.current.handleGenerateClick(
          new Date(2026, 3, 20, 0, 0, 0, 0),
          loadedTeams,
          null,
          false,
          false,
          false,
          setIsProcessing
        );
      });

      expect(mockGenerateMatchPairings).toHaveBeenCalled();
    });
  });

  it('generates successfully, wires config flags/weights, updates state, and activates matches tab', async () => {
    const pairings = buildPairings();
    mockGenerateMatchPairings.mockResolvedValue({ pairings, unmatchedTeamIds: ['99'] });

    const setActiveTab = vi.fn();
    const setIsProcessing = vi.fn();
    const { result } = renderHook(() => usePairingOperations(setActiveTab));

    const selectedDate = new Date('2026-04-20T00:00:00.000Z');
    const timeBlockTeams: TimeBlockTeamsMap = {
      Early: [buildTeam('1'), buildTeam('2'), buildTeam('3'), buildTeam('4')],
    };

    await act(async () => {
      await result.current.handleGenerateClick(
        selectedDate,
        timeBlockTeams,
        selectedDate,
        true,
        true,
        true,
        setIsProcessing
      );
    });

    const firstGenerateCall = mockGenerateMatchPairings.mock.calls[0];
    expect(firstGenerateCall[0]).toEqual(selectedDate);
    expect(firstGenerateCall[1]).toEqual(timeBlockTeams);
    expect(firstGenerateCall[2]).toEqual(
      expect.objectContaining({
        avoidRematches: true,
        prioritizeQuality: true,
        dualMatchMode: true,
        weights: expect.objectContaining({
          powerScoreWeight: 5,
          sosWeight: 3,
          recordWeight: 3.5,
          gameRecordWeight: 2,
        }),
      })
    );
    expect(firstGenerateCall[3]).toBeUndefined();

    expect(result.current.generatedPairings).toEqual(pairings);
    expect(result.current.unmatchedTeamIds).toEqual(['99']);
    expect(result.current.qualityMetrics).toEqual(metrics);
    expect(setActiveTab).toHaveBeenCalledWith('matches');
    expect(setIsProcessing).toHaveBeenNthCalledWith(1, true);
    expect(setIsProcessing).toHaveBeenLastCalledWith(false);

    await waitFor(() => {
      expect(mockSaveAutoScheduleState).toHaveBeenCalledWith({
        generatedPairings: pairings,
        unmatchedTeamIds: ['99'],
        generationDate: selectedDate.toISOString(),
      });
    });

    // weights omitted when prioritizeQuality === false
    await act(async () => {
      await result.current.handleGenerateClick(
        selectedDate,
        timeBlockTeams,
        selectedDate,
        false,
        false,
        false,
        setIsProcessing
      );
    });

    const lastGenerateCall = mockGenerateMatchPairings.mock.calls.at(-1);
    expect(lastGenerateCall?.[0]).toEqual(selectedDate);
    expect(lastGenerateCall?.[1]).toEqual(timeBlockTeams);
    expect(lastGenerateCall?.[2]).toEqual(
      expect.objectContaining({
        avoidRematches: false,
        prioritizeQuality: false,
        dualMatchMode: false,
        weights: undefined,
      })
    );
    expect(lastGenerateCall?.[3]).toBeUndefined();
  });

  it('handles generation failure (null result) and thrown errors with finally cleanup', async () => {
    const setActiveTab = vi.fn();
    const setIsProcessing = vi.fn();
    const { result } = renderHook(() => usePairingOperations(setActiveTab));

    mockGenerateMatchPairings.mockResolvedValueOnce(null);

    await act(async () => {
      await result.current.handleGenerateClick(
        new Date('2026-04-20T00:00:00.000Z'),
        { Early: [buildTeam('1'), buildTeam('2')] },
        null,
        false,
        false,
        false,
        setIsProcessing
      );
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Generation Failed', variant: 'destructive' })
    );
    expect(setIsProcessing).toHaveBeenLastCalledWith(false);

    mockGenerateMatchPairings.mockRejectedValueOnce(new Error('boom'));

    await act(async () => {
      await result.current.handleGenerateClick(
        new Date('2026-04-21T00:00:00.000Z'),
        { Early: [buildTeam('1'), buildTeam('2')] },
        null,
        false,
        false,
        false,
        setIsProcessing
      );
    });

    expect(mockErrorLog).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description:
          'An unexpected error occurred while generating the schedule. Please try again.',
        variant: 'destructive',
      })
    );
    expect(setIsProcessing).toHaveBeenLastCalledWith(false);
  });

  it('guards handleApplySchedule for missing date and empty pairings', () => {
    const { result } = renderHook(() => usePairingOperations(vi.fn()));
    const setGeneratedMatches = vi.fn();
    const setMatchQualityMetrics = vi.fn();

    const missingDate = result.current.handleApplySchedule(
      buildPairings(),
      null,
      false,
      setGeneratedMatches,
      setMatchQualityMetrics
    );
    expect(missingDate).toBeNull();

    const noPairings = result.current.handleApplySchedule(
      {},
      new Date('2026-04-20T00:00:00.000Z'),
      false,
      setGeneratedMatches,
      setMatchQualityMetrics
    );
    expect(noPairings).toBeNull();

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'No date selected for schedule application.' })
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'No generated schedule to apply. Please generate a schedule first.',
      })
    );
  });

  it('applies schedule by converting pairings to matches, aggregates metrics path, and supports editable callback', () => {
    const setGeneratedMatches = vi.fn();
    const setMatchQualityMetrics = vi.fn();
    const setEditableMatches = vi.fn();

    const { result } = renderHook(() => usePairingOperations(vi.fn()));

    const pairings = buildPairings();
    const selectedDate = new Date('2026-04-22T00:00:00.000Z');

    const applied = result.current.handleApplySchedule(
      pairings,
      selectedDate,
      true,
      setGeneratedMatches,
      setMatchQualityMetrics,
      setEditableMatches
    );

    expect(applied).toEqual([
      {
        id: 'Early-0',
        team1Id: '1',
        team2Id: '2',
        timeslot: '6:30 PM',
        date: selectedDate,
        blockType: 'primary',
      },
      {
        id: 'Early-1',
        team1Id: '3',
        team2Id: '4',
        timeslot: '6:30 PM',
        date: selectedDate,
        blockType: 'primary',
      },
    ]);

    expect(mockCalculateComprehensiveQualityMetrics).toHaveBeenCalledWith(pairings, 0, ['basic']);
    expect(setMatchQualityMetrics).toHaveBeenCalledWith(metrics);
    expect(setGeneratedMatches).toHaveBeenCalledWith(applied);
    expect(setEditableMatches).toHaveBeenCalledWith(applied);
    expect(mockScheduleLog).toHaveBeenCalledWith(
      expect.stringContaining('Applied schedule: 2 matches, 1 rematches')
    );

    const withoutEditable = result.current.handleApplySchedule(
      pairings,
      selectedDate,
      false,
      setGeneratedMatches,
      setMatchQualityMetrics
    );
    expect(withoutEditable).not.toBeNull();
  });

  it('aborts the apply and warns when the pairings cross block boundaries', () => {
    // This branch only runs when the hook is given a block map and a team list.
    const teams = [buildTeam('1'), buildTeam('2'), buildTeam('3'), buildTeam('4')];
    const { result } = renderHook(() =>
      usePairingOperations(vi.fn(), { '1': ['Early'], '2': ['Late'] }, teams)
    );

    vi.mocked(validateNoCrossBlockMatches).mockReturnValueOnce({
      isValid: false,
      violations: [
        {
          matchId: 'Early-0',
          team1: { id: '1', name: 'Team 1', block: 'Early' },
          team2: { id: '2', name: 'Team 2', block: 'Late' },
          timeslot: '6:30 PM',
        },
      ],
    });

    const applied = result.current.handleApplySchedule(
      buildPairings(),
      new Date('2026-04-22T00:00:00.000Z'),
      false,
      vi.fn(),
      vi.fn()
    );

    expect(applied).toBeNull();
    expect(logCrossBlockViolations).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('1 cross-block matches'),
        variant: 'destructive',
      })
    );
  });

  it('reports an error and applies nothing when the conversion throws', () => {
    const { result } = renderHook(() => usePairingOperations(vi.fn()));

    mockCalculateComprehensiveQualityMetrics.mockImplementationOnce(() => {
      throw new Error('metrics exploded');
    });

    const applied = result.current.handleApplySchedule(
      buildPairings(),
      new Date('2026-04-22T00:00:00.000Z'),
      false,
      vi.fn(),
      vi.fn()
    );

    expect(applied).toBeNull();
    expect(mockErrorLog).toHaveBeenCalledWith('Error applying schedule:', expect.any(Error));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'Failed to apply the generated schedule. Please try again.',
        variant: 'destructive',
      })
    );
  });

  it('resolves block names to their real start time and passes clock times through', () => {
    const { result } = renderHook(() => usePairingOperations(vi.fn()));
    const selectedDate = new Date('2026-04-22T00:00:00.000Z');

    // Standard mode keys pairings by block name; dual mode keys them by clock time.
    // Both must reach the match as something `parseTimeString` can read.
    const pairings: TeamPairingMap = {
      SuperLate: [
        {
          team1: buildTeam('1'),
          team2: buildTeam('2'),
          compatibilityScore: 8,
          hasPlayedBefore: false,
        },
      ],
      '7:00 PM': [
        {
          team1: buildTeam('3'),
          team2: buildTeam('4'),
          compatibilityScore: 8,
          hasPlayedBefore: false,
        },
      ],
    };

    const applied = result.current.handleApplySchedule(
      pairings,
      selectedDate,
      false,
      vi.fn(),
      vi.fn()
    );

    expect(applied?.map((match) => match.timeslot)).toEqual(['9:00 PM', '7:00 PM']);
  });

  it('spreads a block\u2019s two rounds over its two slots so no team is double-booked', () => {
    const { result } = renderHook(() => usePairingOperations(vi.fn()));
    const selectedDate = new Date('2026-04-22T00:00:00.000Z');

    // Standard mode runs blossom twice per block and returns both rounds in one array,
    // so every team appears twice. Early is the 6:30/7:00 PM pair.
    const pairings: TeamPairingMap = {
      Early: [
        // Round 1
        {
          team1: buildTeam('1'),
          team2: buildTeam('2'),
          compatibilityScore: 8,
          hasPlayedBefore: false,
        },
        {
          team1: buildTeam('3'),
          team2: buildTeam('4'),
          compatibilityScore: 8,
          hasPlayedBefore: false,
        },
        // Round 2
        {
          team1: buildTeam('1'),
          team2: buildTeam('3'),
          compatibilityScore: 8,
          hasPlayedBefore: false,
        },
        {
          team1: buildTeam('2'),
          team2: buildTeam('4'),
          compatibilityScore: 8,
          hasPlayedBefore: false,
        },
      ],
    };

    const applied = result.current.handleApplySchedule(
      pairings,
      selectedDate,
      false,
      vi.fn(),
      vi.fn()
    );

    expect(applied?.map((match) => match.timeslot)).toEqual([
      '6:30 PM',
      '6:30 PM',
      '7:00 PM',
      '7:00 PM',
    ]);

    // The whole point: this is what validateMatchSchedule would otherwise refuse.
    const slotsByTeam = new Map<string, string[]>();
    applied?.forEach((match) => {
      [match.team1Id, match.team2Id].forEach((teamId) => {
        slotsByTeam.set(teamId, [...(slotsByTeam.get(teamId) ?? []), match.timeslot]);
      });
    });
    slotsByTeam.forEach((slots) => {
      expect(new Set(slots).size).toBe(slots.length);
    });
  });

  describe('stale pairing date comparison', () => {
    const setupWithGenerationDate = async (generationDate: Date) => {
      const pairings = buildPairings();
      mockGenerateMatchPairings.mockResolvedValue({ pairings, unmatchedTeamIds: [] });
      const { result } = renderHook(() => usePairingOperations(vi.fn()));

      await act(async () => {
        await result.current.handleGenerateClick(
          generationDate,
          { Early: [buildTeam('1'), buildTeam('2'), buildTeam('3'), buildTeam('4')] },
          generationDate,
          false,
          false,
          false,
          vi.fn()
        );
      });

      return { result, pairings };
    };

    it('applies when generation and selected dates are the same calendar day but different times', async () => {
      const generationDate = new Date(2026, 3, 20, 10, 30, 0, 0);
      const { result, pairings } = await setupWithGenerationDate(generationDate);

      // Calendar reselects same day at midnight (what react-day-picker returns)
      const reselectedDate = new Date(2026, 3, 20, 0, 0, 0, 0);

      const setGeneratedMatches = vi.fn();
      const setMatchQualityMetrics = vi.fn();

      const applied = result.current.handleApplySchedule(
        pairings,
        reselectedDate,
        false,
        setGeneratedMatches,
        setMatchQualityMetrics
      );

      expect(applied).not.toBeNull();
      expect(setGeneratedMatches).toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Schedule Stale' })
      );
    });

    it('rejects as stale when generation and selected dates are different calendar days', async () => {
      const generationDate = new Date(2026, 3, 20, 10, 30, 0, 0);
      const { result, pairings } = await setupWithGenerationDate(generationDate);

      const differentDay = new Date(2026, 3, 21, 10, 30, 0, 0);

      const setGeneratedMatches = vi.fn();
      const setMatchQualityMetrics = vi.fn();

      const applied = result.current.handleApplySchedule(
        pairings,
        differentDay,
        false,
        setGeneratedMatches,
        setMatchQualityMetrics
      );

      expect(applied).toBeNull();
      expect(setGeneratedMatches).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Schedule Stale', variant: 'destructive' })
      );
    });

    it('applies when generation and selected dates are identical timestamps', async () => {
      const generationDate = new Date(2026, 3, 20, 10, 30, 0, 0);
      const { result, pairings } = await setupWithGenerationDate(generationDate);

      const setGeneratedMatches = vi.fn();
      const setMatchQualityMetrics = vi.fn();

      const applied = result.current.handleApplySchedule(
        pairings,
        new Date(generationDate.getTime()),
        false,
        setGeneratedMatches,
        setMatchQualityMetrics
      );

      expect(applied).not.toBeNull();
      expect(setGeneratedMatches).toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Schedule Stale' })
      );
    });
  });
});
