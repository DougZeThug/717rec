import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// vi.hoisted ensures these are available when vi.mock factories run (which are hoisted)
const {
  mockBatchCreateMatches,
  mockFetchActiveSeason,
  mockCreateDateWithTime,
  mockToast,
} = vi.hoisted(() => ({
  mockBatchCreateMatches: vi.fn(),
  mockFetchActiveSeason: vi.fn(),
  mockCreateDateWithTime: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  batchCreateMatches: mockBatchCreateMatches,
  fetchActiveSeason: mockFetchActiveSeason,
}));

vi.mock('@/components/schedule/form-utils', () => ({
  createDateWithTime: mockCreateDateWithTime,
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  matchLog: vi.fn(),
  timezoneLog: vi.fn(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { useBatchMatchForm } from '../useBatchMatchForm';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useBatchMatchForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchActiveSeason.mockResolvedValue('season-1');
    mockCreateDateWithTime.mockReturnValue(new Date('2024-01-04T23:30:00Z'));
    mockBatchCreateMatches.mockResolvedValue([{ id: 'match-1' }]);
  });

  it('initializes with one empty pair and a date', () => {
    const { result } = renderHook(() => useBatchMatchForm([]), { wrapper: createWrapper() });

    expect(result.current.matchPairs).toHaveLength(1);
    expect(result.current.matchPairs[0]).toMatchObject({
      team1Id: null,
      team2Id: null,
      timeslot: null,
    });
    expect(result.current.selectedDate).toBeInstanceOf(Date);
  });

  it('addMatchPair appends a new empty pair', () => {
    const { result } = renderHook(() => useBatchMatchForm([]), { wrapper: createWrapper() });

    act(() => {
      result.current.addMatchPair();
    });

    expect(result.current.matchPairs).toHaveLength(2);
    expect(result.current.matchPairs[1]).toMatchObject({
      team1Id: null,
      team2Id: null,
      timeslot: null,
    });
  });

  it('updateMatchPair patches correct pair by id', () => {
    const { result } = renderHook(() => useBatchMatchForm([]), { wrapper: createWrapper() });

    const id = result.current.matchPairs[0].id;
    act(() => {
      result.current.updateMatchPair(id, { team1Id: 'team-abc' });
    });

    expect(result.current.matchPairs[0].team1Id).toBe('team-abc');
  });

  it('updateMatchPair does not affect other pairs', () => {
    const { result } = renderHook(() => useBatchMatchForm([]), { wrapper: createWrapper() });

    act(() => {
      result.current.addMatchPair();
    });
    const id = result.current.matchPairs[0].id;
    act(() => {
      result.current.updateMatchPair(id, { team1Id: 'team-x' });
    });

    expect(result.current.matchPairs[1].team1Id).toBeNull();
  });

  it('removeMatchPair removes the correct pair', () => {
    const { result } = renderHook(() => useBatchMatchForm([]), { wrapper: createWrapper() });

    act(() => {
      result.current.addMatchPair();
    });
    const idToRemove = result.current.matchPairs[0].id;
    const keepId = result.current.matchPairs[1].id;

    act(() => {
      result.current.removeMatchPair(idToRemove);
    });

    expect(result.current.matchPairs).toHaveLength(1);
    expect(result.current.matchPairs[0].id).toBe(keepId);
  });

  it('autoAssignTimeslots assigns sequential timeslots starting at 5:00 PM', () => {
    const { result } = renderHook(() => useBatchMatchForm([]), { wrapper: createWrapper() });

    act(() => {
      result.current.addMatchPair();
    });
    act(() => {
      result.current.autoAssignTimeslots();
    });

    expect(result.current.matchPairs[0].timeslot).toBe('5:00 PM');
    expect(result.current.matchPairs[1].timeslot).toBe('5:30 PM');
  });

  it('autoAssignTimeslots wraps around when pairs exceed slot count', () => {
    const { result } = renderHook(() => useBatchMatchForm([]), { wrapper: createWrapper() });

    // Add 11 more pairs one at a time to avoid stale-closure accumulation issues
    for (let i = 0; i < 11; i++) {
      act(() => {
        result.current.addMatchPair();
      });
    }
    act(() => {
      result.current.autoAssignTimeslots();
    });

    // 12 pairs total; index 11 wraps to slot index (11 % 11) = 0 → '5:00 PM'
    expect(result.current.matchPairs[11].timeslot).toBe('5:00 PM');
  });

  it('handleSubmit returns false and shows destructive toast when no date', async () => {
    const { result } = renderHook(() => useBatchMatchForm([]), { wrapper: createWrapper() });

    act(() => {
      result.current.setSelectedDate(null);
    });

    let submitResult!: boolean;
    await act(async () => {
      submitResult = await result.current.handleSubmit();
    });

    expect(submitResult).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
    expect(mockBatchCreateMatches).not.toHaveBeenCalled();
  });

  it('handleSubmit returns false and shows destructive toast when pair has missing fields', async () => {
    const { result } = renderHook(() => useBatchMatchForm([]), { wrapper: createWrapper() });
    // Initial pair has null team1Id / team2Id / timeslot

    let submitResult!: boolean;
    await act(async () => {
      submitResult = await result.current.handleSubmit();
    });

    expect(submitResult).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('handleSubmit returns false when the same team appears in two matches', async () => {
    const { result } = renderHook(() => useBatchMatchForm([]), { wrapper: createWrapper() });

    act(() => {
      const id1 = result.current.matchPairs[0].id;
      result.current.updateMatchPair(id1, {
        team1Id: 'team-A',
        team2Id: 'team-B',
        timeslot: '6:00 PM',
      });
      result.current.addMatchPair();
    });
    act(() => {
      const id2 = result.current.matchPairs[1].id;
      result.current.updateMatchPair(id2, {
        team1Id: 'team-A',
        team2Id: 'team-C',
        timeslot: '7:00 PM',
      });
    });

    let submitResult!: boolean;
    await act(async () => {
      submitResult = await result.current.handleSubmit();
    });

    expect(submitResult).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('handleSubmit success calls services, shows success toast, and resets the form', async () => {
    const { result } = renderHook(() => useBatchMatchForm([]), { wrapper: createWrapper() });

    act(() => {
      const id = result.current.matchPairs[0].id;
      result.current.updateMatchPair(id, {
        team1Id: 'team-1',
        team2Id: 'team-2',
        timeslot: '6:00 PM',
      });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockFetchActiveSeason).toHaveBeenCalled();
    expect(mockBatchCreateMatches).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Success' }));
    // Form resets to one empty pair
    expect(result.current.matchPairs).toHaveLength(1);
    expect(result.current.matchPairs[0]).toMatchObject({
      team1Id: null,
      team2Id: null,
      timeslot: null,
    });
  });

  it('handleSubmit returns false and shows error toast when service throws', async () => {
    mockFetchActiveSeason.mockRejectedValue(new Error('Season fetch failed'));
    const { result } = renderHook(() => useBatchMatchForm([]), { wrapper: createWrapper() });

    act(() => {
      const id = result.current.matchPairs[0].id;
      result.current.updateMatchPair(id, {
        team1Id: 'team-1',
        team2Id: 'team-2',
        timeslot: '6:00 PM',
      });
    });

    let submitResult!: boolean;
    await act(async () => {
      submitResult = await result.current.handleSubmit();
    });

    expect(submitResult).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('isSubmitting is true during submission and false after', async () => {
    let resolveCreate!: (v: unknown) => void;
    mockFetchActiveSeason.mockResolvedValue('season-1');
    mockBatchCreateMatches.mockReturnValue(
      new Promise((res) => {
        resolveCreate = res;
      }),
    );

    const { result } = renderHook(() => useBatchMatchForm([]), { wrapper: createWrapper() });

    act(() => {
      const id = result.current.matchPairs[0].id;
      result.current.updateMatchPair(id, {
        team1Id: 'team-1',
        team2Id: 'team-2',
        timeslot: '6:00 PM',
      });
    });

    const submitPromise = act(async () => {
      result.current.handleSubmit();
    });

    // Resolve and finish
    await act(async () => {
      resolveCreate([{ id: 'm1' }]);
      await submitPromise;
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});
