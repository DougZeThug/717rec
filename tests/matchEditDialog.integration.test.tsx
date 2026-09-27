/**
 * The Schedule page's match form, driven through the real hooks behind it.
 *
 * `useMatchManagement` joins two sub-hooks: `useMatchCreation` owns whether the
 * form is open, and `useMatchUpdates` owns which match it edits. A saved edit
 * used to leave the form open, and the form then offered its submit button
 * again, still filled in with the match just saved. Only the service layer is
 * mocked, so these tests read the same state the page renders the form from.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match, Team } from '@/types';

const mockCreateMatch = vi.fn();
const mockUpdateMatch = vi.fn();
const mockReopenMatchResult = vi.fn();
const mockResubmitMatchResult = vi.fn();
const mockToast = vi.fn();

vi.mock('@/services/matches/MatchWriteService', () => ({
  createMatch: (...args: unknown[]) => mockCreateMatch(...args),
  updateMatch: (...args: unknown[]) => mockUpdateMatch(...args),
  reopenMatchResult: (...args: unknown[]) => mockReopenMatchResult(...args),
  resubmitMatchResult: (...args: unknown[]) => mockResubmitMatchResult(...args),
  deleteMatchWithStatsReversal: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(Object.keys(actual).map((key) => [key, vi.fn()]));
});

import { useMatchManagement } from '@/hooks/useMatchManagement';

const TEAMS: Team[] = [];

const scheduled = {
  id: 'm1',
  team1Id: 't1',
  team2Id: 't2',
  date: '2026-10-01T22:30:00.000Z',
  location: 'Court 1',
  iscompleted: false,
} as unknown as Match;

// A module constant, not a literal in the render callback: the hook copies its
// argument into state from an effect keyed on the array itself, so a new array
// on every render would re-sync forever.
const INITIAL_MATCHES: Match[] = [scheduled];

// What the form submits after the admin moves the match half an hour later.
const movedLater = {
  ...scheduled,
  date: '2026-10-01T23:00:00.000Z',
} as unknown as Omit<Match, 'id'>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const renderManagement = () =>
  renderHook(() => useMatchManagement(INITIAL_MATCHES), { wrapper: createWrapper() });

type Management = ReturnType<typeof renderManagement>['result'];

// What the pencil on a match card does: pick the match, then open the form.
const openOn = (result: Management, match: Match) => {
  act(() => {
    result.current.setEditingMatch(match);
    result.current.setIsFormOpen(true);
  });
};

describe('the Schedule match form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMatch.mockImplementation((matchId: string, payload: { date?: string }) =>
      Promise.resolve({
        id: matchId,
        team1_id: 't1',
        team2_id: 't2',
        date: payload.date ?? scheduled.date,
        location: 'Court 1',
        iscompleted: false,
        round_number: 0,
      })
    );
    mockResubmitMatchResult.mockResolvedValue({
      applied: true,
      reversed_previous: false,
      previous_winner_id: null,
    });
  });

  it('closes after a saved edit', async () => {
    const { result } = renderManagement();
    openOn(result, scheduled);
    expect(result.current.isFormOpen).toBe(true);

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.handleUpdateMatch(movedLater, TEAMS);
    });

    expect(saved).toBe(true);
    expect(mockUpdateMatch).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({ date: movedLater.date })
    );
    expect(result.current.isFormOpen).toBe(false);
    expect(mockCreateMatch).not.toHaveBeenCalled();
  });

  // Guards the obvious other fix, closing the form whenever it is open with no
  // match to edit: that would also shut a create form the moment it opened.
  it('leaves a form opened with no match to edit open', () => {
    const { result } = renderManagement();

    act(() => {
      result.current.setIsFormOpen(true);
    });

    expect(result.current.isFormOpen).toBe(true);
    expect(result.current.editingMatch).toBeUndefined();
  });
});
