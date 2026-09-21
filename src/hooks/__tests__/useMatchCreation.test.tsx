import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMatchCreation } from '@/hooks/useMatchCreation';
import type { Match } from '@/types';

const mockCreateMatch = vi.fn();
vi.mock('@/services/matches/MatchWriteService', () => ({
  createMatch: (...args: unknown[]) => mockCreateMatch(...args),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children
  );

/** 8:30 PM league time on 20 August 2026, which is the 21st in UTC. */
const STORED = '2026-08-21T00:30:00.000Z';

const payload = (overrides: Partial<Omit<Match, 'id'>> = {}): Omit<Match, 'id'> => ({
  team1Id: 'team-a',
  team2Id: 'team-b',
  date: STORED,
  iscompleted: false,
  timeSlot: '8:30 PM',
  ...overrides,
});

describe('useMatchCreation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateMatch.mockResolvedValue({ id: 'match-1', date: STORED });
  });

  /**
   * buildMatchSubmission has already turned the night and the slot into a UTC
   * instant. This hook used to convert a second time, which read that instant
   * back on the browser's clock — a different calendar day east or west of the
   * league, moving the match a whole night. It only looked harmless while the
   * conversion re-derived the day from the instant itself.
   */
  it('stores the instant it was handed, even though a slot rides along', async () => {
    const { result } = renderHook(() => useMatchCreation([], vi.fn()), { wrapper });

    await act(async () => {
      await result.current.handleCreateMatch(payload(), []);
    });

    expect(mockCreateMatch).toHaveBeenCalledWith(expect.objectContaining({ date: STORED }));
  });

  it('stores it unchanged when no slot rides along either', async () => {
    const { result } = renderHook(() => useMatchCreation([], vi.fn()), { wrapper });

    await act(async () => {
      await result.current.handleCreateMatch(payload({ timeSlot: null }), []);
    });

    expect(mockCreateMatch).toHaveBeenCalledWith(expect.objectContaining({ date: STORED }));
  });

  it('reports a failed create instead of throwing', async () => {
    mockCreateMatch.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useMatchCreation([], vi.fn()), { wrapper });

    let created: boolean | undefined;
    await act(async () => {
      created = await result.current.handleCreateMatch(payload(), []);
    });

    expect(created).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});
