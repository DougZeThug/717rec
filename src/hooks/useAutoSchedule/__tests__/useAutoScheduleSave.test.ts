import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AutoScheduleMatch } from '@/types/autoSchedule';

import { useAutoScheduleSave } from '../useAutoScheduleSave';

const mockToast = vi.fn();

vi.mock('@/services/matches/MatchWriteService', () => ({
  fetchActiveSeasonIdOptional: vi.fn(),
  saveAutoScheduleMatches: vi.fn(),
}));

vi.mock('@/utils/autoSchedule/validation', () => ({
  validateMatchSchedule: vi.fn(),
}));

vi.mock('../storage', () => ({
  clearAutoScheduleState: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
  timezoneLog: vi.fn(),
}));

import {
  fetchActiveSeasonIdOptional,
  saveAutoScheduleMatches,
} from '@/services/matches/MatchWriteService';
import { validateMatchSchedule } from '@/utils/autoSchedule/validation';

import { clearAutoScheduleState } from '../storage';

const makeMatch = (overrides: Partial<AutoScheduleMatch> = {}): AutoScheduleMatch => ({
  id: 'match-1',
  team1Id: 'team-a',
  team2Id: 'team-b',
  timeslot: '6:00 PM',
  date: new Date('2026-07-01T00:00:00Z'),
  blockType: 'primary',
  ...overrides,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const renderSaveHook = () => renderHook(() => useAutoScheduleSave(), { wrapper: createWrapper() });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(validateMatchSchedule).mockResolvedValue({
    isValid: true,
    errors: [],
    warnings: [],
  } as Awaited<ReturnType<typeof validateMatchSchedule>>);
  vi.mocked(fetchActiveSeasonIdOptional).mockResolvedValue('season-1');
  vi.mocked(saveAutoScheduleMatches).mockResolvedValue([{ id: 'm1' }] as Awaited<
    ReturnType<typeof saveAutoScheduleMatches>
  >);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAutoScheduleSave', () => {
  it('exposes isSaving as false at rest', () => {
    const { result } = renderSaveHook();
    expect(result.current.isSaving).toBe(false);
    expect(typeof result.current.saveMatches).toBe('function');
  });

  it('returns false and toasts Error when selectedDate is null (no validation)', async () => {
    const { result } = renderSaveHook();
    let outcome: boolean | undefined;

    await act(async () => {
      outcome = await result.current.saveMatches([makeMatch()], null);
    });

    expect(outcome).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'No matches to save or date not selected',
        variant: 'destructive',
      })
    );
    expect(validateMatchSchedule).not.toHaveBeenCalled();
  });

  it('returns false and toasts Error when matches is empty', async () => {
    const { result } = renderSaveHook();
    let outcome: boolean | undefined;

    await act(async () => {
      outcome = await result.current.saveMatches([], new Date('2026-07-01'));
    });

    expect(outcome).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Error', variant: 'destructive' })
    );
    expect(validateMatchSchedule).not.toHaveBeenCalled();
  });

  it('returns false with destructive toast when validation is invalid', async () => {
    vi.mocked(validateMatchSchedule).mockResolvedValue({
      isValid: false,
      errors: [{ message: 'bad' }],
      warnings: [],
    } as unknown as Awaited<ReturnType<typeof validateMatchSchedule>>);

    const { result } = renderSaveHook();
    let outcome: boolean | undefined;

    await act(async () => {
      outcome = await result.current.saveMatches([makeMatch()], new Date('2026-07-01'));
    });

    expect(outcome).toBe(false);
    expect(saveAutoScheduleMatches).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error Saving Matches',
        variant: 'destructive',
        description: expect.stringContaining('Schedule validation failed'),
      })
    );
  });

  it('saves valid matches, shows rematch + success toasts, clears state, returns true', async () => {
    vi.mocked(validateMatchSchedule).mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [{ type: 'rematch' }],
    } as unknown as Awaited<ReturnType<typeof validateMatchSchedule>>);

    const { result } = renderSaveHook();
    let outcome: boolean | undefined;

    await act(async () => {
      outcome = await result.current.saveMatches([makeMatch()], new Date('2026-07-01'));
    });

    expect(outcome).toBe(true);
    expect(saveAutoScheduleMatches).toHaveBeenCalledTimes(1);

    const insertedPayload = vi.mocked(saveAutoScheduleMatches).mock.calls[0][0] as Array<
      Record<string, unknown>
    >;
    expect(insertedPayload).toHaveLength(1);
    expect(insertedPayload[0]).toMatchObject({
      team1_id: 'team-a',
      team2_id: 'team-b',
      location: 'Court 1',
    });

    expect(clearAutoScheduleState).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rematch Warning' }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Success' }));
  });

  it('returns false with destructive toast when save rejects', async () => {
    vi.mocked(saveAutoScheduleMatches).mockRejectedValue(new Error('db down'));

    const { result } = renderSaveHook();
    let outcome: boolean | undefined;

    await act(async () => {
      outcome = await result.current.saveMatches([makeMatch()], new Date('2026-07-01'));
    });

    expect(outcome).toBe(false);
    expect(clearAutoScheduleState).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error Saving Matches',
        variant: 'destructive',
        description: 'db down',
      })
    );
  });

  it('skips fetchActiveSeasonIdOptional when seasonId is provided', async () => {
    const { result } = renderSaveHook();

    await act(async () => {
      await result.current.saveMatches([makeMatch()], new Date('2026-07-01'), false, 'season-x');
    });

    expect(fetchActiveSeasonIdOptional).not.toHaveBeenCalled();
    const insertedPayload = vi.mocked(saveAutoScheduleMatches).mock.calls[0][0] as Array<
      Record<string, unknown>
    >;
    expect(insertedPayload[0]).toMatchObject({ season_id: 'season-x' });
  });

  it('calls fetchActiveSeasonIdOptional when seasonId is omitted', async () => {
    const { result } = renderSaveHook();

    await act(async () => {
      await result.current.saveMatches([makeMatch()], new Date('2026-07-01'));
    });

    expect(fetchActiveSeasonIdOptional).toHaveBeenCalledTimes(1);
  });
});
