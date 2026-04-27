import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MatchQualityMetrics, Team, TeamPairingMap, TimeBlockTeamsMap } from '@/types';

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
        true,
        true,
        true,
        setIsProcessing
      );
    });

    expect(mockGenerateMatchPairings).toHaveBeenCalledWith(
      selectedDate,
      timeBlockTeams,
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
      }),
      undefined
    );

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
      });
    });

    // weights omitted when prioritizeQuality === false
    await act(async () => {
      await result.current.handleGenerateClick(
        selectedDate,
        timeBlockTeams,
        false,
        false,
        false,
        setIsProcessing
      );
    });

    expect(mockGenerateMatchPairings).toHaveBeenLastCalledWith(
      selectedDate,
      timeBlockTeams,
      expect.objectContaining({
        avoidRematches: false,
        prioritizeQuality: false,
        dualMatchMode: false,
        weights: undefined,
      }),
      undefined
    );
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
        false,
        false,
        false,
        setIsProcessing
      );
    });

    expect(mockErrorLog).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'An unexpected error occurred while generating the schedule. Please try again.',
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
        timeslot: 'Early',
        date: selectedDate,
        blockType: 'primary',
      },
      {
        id: 'Early-1',
        team1Id: '3',
        team2Id: '4',
        timeslot: 'Early',
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
});
