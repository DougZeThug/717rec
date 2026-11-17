import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TeamPairingMap } from '@/types/autoSchedule';

import { useAutoScheduleSection } from '../useAutoScheduleSection';

const mockHandleGenerateSchedule = vi.hoisted(() => vi.fn());
const mockPreviewSchedule = vi.hoisted(() => vi.fn());
const mockConvertPairingsToMatches = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => vi.fn());
// What the mocked scheduler hands back as the schedule made so far.
const scheduleState = vi.hoisted(() => ({
  generatedPairings: {} as TeamPairingMap | null,
}));

vi.mock('@/hooks/scheduling', () => ({
  useSchedulePreview: () => ({
    autoScheduleStep: 'teams',
    setAutoScheduleStep: vi.fn(),
    isLoading: false,
    isGenerating: false,
    timeBlockTeams: {},
    generatedPairings: scheduleState.generatedPairings,
    unmatchedTeamIds: [],
    previewSchedule: mockPreviewSchedule,
    handleGenerateSchedule: mockHandleGenerateSchedule,
    convertPairingsToMatches: mockConvertPairingsToMatches,
    getTeamCountStatus: () => ({ total: 0, odd: 0 }),
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Preview Teams logs the date it was given. Keep that out of the test output.
vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
  timezoneLog: vi.fn(),
  warnLog: vi.fn(),
}));

const night = new Date(2026, 10, 19, 12);

beforeEach(() => {
  scheduleState.generatedPairings = {};
});

describe('useAutoScheduleSection: what Generate sends for Prioritize Match Quality', () => {
  beforeEach(() => {
    mockHandleGenerateSchedule.mockResolvedValue(null);
  });

  const generate = async (prioritizeQuality: boolean) => {
    const { result } = renderHook(() =>
      useAutoScheduleSection({ selectedDate: night, setMatchPairs: vi.fn() })
    );
    act(() => result.current.setPrioritizeQuality(prioritizeQuality));
    await act(async () => {
      await result.current.handleGenerateScheduleClick();
    });
    return mockHandleGenerateSchedule.mock.calls[0];
  };

  it('starts with the switch OFF', () => {
    const { result } = renderHook(() =>
      useAutoScheduleSection({ selectedDate: night, setMatchPairs: vi.fn() })
    );

    expect(result.current.prioritizeQuality).toBe(false);
  });

  it('sends no weights when the switch is OFF, which is what keeps the standard scheduler on division only', async () => {
    const call = await generate(false);

    expect(call?.[0]).toBe(night);
    expect(call?.[1]).toEqual({ avoidRematches: true, prioritizeQuality: false });
    expect(call?.[1]?.weights).toBeUndefined();
  });

  it('sends all four weights when the switch is ON, the same 5, 3, 3.5 and 2 as the Auto Schedule screen', async () => {
    const call = await generate(true);

    expect(call?.[0]).toBe(night);
    expect(call?.[1]).toStrictEqual({
      avoidRematches: true,
      prioritizeQuality: true,
      weights: { powerScoreWeight: 5, sosWeight: 3, recordWeight: 3.5, gameRecordWeight: 2 },
    });
  });
});

describe('useAutoScheduleSection: Preview Teams', () => {
  it('loads the teams for the picked night and says so', async () => {
    mockPreviewSchedule.mockResolvedValue({ date: night, timeBlocks: {} });
    const { result } = renderHook(() =>
      useAutoScheduleSection({ selectedDate: night, setMatchPairs: vi.fn() })
    );

    await act(async () => {
      await result.current.handlePreviewTeams();
    });

    expect(mockPreviewSchedule).toHaveBeenCalledWith(night);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Teams Loaded',
      description: 'Teams for each time block have been loaded.',
    });
  });

  it('shows no success message when the teams did not load', async () => {
    mockPreviewSchedule.mockResolvedValue(null);
    const { result } = renderHook(() =>
      useAutoScheduleSection({ selectedDate: night, setMatchPairs: vi.fn() })
    );

    await act(async () => {
      await result.current.handlePreviewTeams();
    });

    expect(mockPreviewSchedule).toHaveBeenCalledWith(night);
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('with no date picked: asks for a date in red and loads nothing', async () => {
    const { result } = renderHook(() =>
      useAutoScheduleSection({ selectedDate: null, setMatchPairs: vi.fn() })
    );

    await act(async () => {
      await result.current.handlePreviewTeams();
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Select Date',
      description: 'Please select a date first.',
      variant: 'destructive',
    });
    expect(mockPreviewSchedule).not.toHaveBeenCalled();
  });
});

describe('useAutoScheduleSection: Generate with no date picked', () => {
  it('asks for a date in red and does not start the scheduler', async () => {
    const { result } = renderHook(() =>
      useAutoScheduleSection({ selectedDate: null, setMatchPairs: vi.fn() })
    );

    await act(async () => {
      await result.current.handleGenerateScheduleClick();
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Select Date',
      description: 'Please select a date first.',
      variant: 'destructive',
    });
    expect(mockHandleGenerateSchedule).not.toHaveBeenCalled();
  });
});

describe('useAutoScheduleSection: Apply Schedule', () => {
  const madeMatches = [
    { id: 'match-1', team1Id: 'team-1', team2Id: 'team-2', timeslot: '6:30 PM' },
    { id: 'match-2', team1Id: 'team-3', team2Id: 'team-4', timeslot: '6:30 PM' },
  ];

  it('puts the made matches on the form and says how many', () => {
    scheduleState.generatedPairings = { Early: [] };
    mockConvertPairingsToMatches.mockReturnValue(madeMatches);
    const setMatchPairs = vi.fn();
    const { result } = renderHook(() =>
      useAutoScheduleSection({ selectedDate: night, setMatchPairs })
    );

    act(() => result.current.handleApplySchedule());

    expect(mockConvertPairingsToMatches).toHaveBeenCalledWith({ Early: [] }, night);
    expect(setMatchPairs).toHaveBeenCalledWith(madeMatches);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Schedule Applied',
      description: '2 matches have been added to the form.',
    });
  });

  it('with a date but no schedule made yet: says so in red and leaves the form alone', () => {
    scheduleState.generatedPairings = null;
    const setMatchPairs = vi.fn();
    const { result } = renderHook(() =>
      useAutoScheduleSection({ selectedDate: night, setMatchPairs })
    );

    act(() => result.current.handleApplySchedule());

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'No schedule has been generated yet.',
      variant: 'destructive',
    });
    expect(mockConvertPairingsToMatches).not.toHaveBeenCalled();
    expect(setMatchPairs).not.toHaveBeenCalled();
  });

  it('with no date picked, even when a schedule exists: says so in red and leaves the form alone', () => {
    scheduleState.generatedPairings = { Early: [] };
    const setMatchPairs = vi.fn();
    const { result } = renderHook(() =>
      useAutoScheduleSection({ selectedDate: null, setMatchPairs })
    );

    act(() => result.current.handleApplySchedule());

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'No schedule has been generated yet.',
      variant: 'destructive',
    });
    expect(mockConvertPairingsToMatches).not.toHaveBeenCalled();
    expect(setMatchPairs).not.toHaveBeenCalled();
  });

  it('when the schedule turns into no matches: says so in red and leaves the form alone', () => {
    scheduleState.generatedPairings = { Early: [] };
    mockConvertPairingsToMatches.mockReturnValue([]);
    const setMatchPairs = vi.fn();
    const { result } = renderHook(() =>
      useAutoScheduleSection({ selectedDate: night, setMatchPairs })
    );

    act(() => result.current.handleApplySchedule());

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'No valid match pairings were generated.',
      variant: 'destructive',
    });
    expect(setMatchPairs).not.toHaveBeenCalled();
  });
});
