import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoScheduleSection } from '../useAutoScheduleSection';

const mockHandleGenerateSchedule = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/scheduling', () => ({
  useSchedulePreview: () => ({
    autoScheduleStep: 'teams',
    setAutoScheduleStep: vi.fn(),
    isLoading: false,
    isGenerating: false,
    timeBlockTeams: {},
    generatedPairings: {},
    unmatchedTeamIds: [],
    previewSchedule: vi.fn(),
    handleGenerateSchedule: mockHandleGenerateSchedule,
    convertPairingsToMatches: vi.fn(),
    getTeamCountStatus: () => ({ total: 0, odd: 0 }),
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const night = new Date(2026, 10, 19, 12);

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
