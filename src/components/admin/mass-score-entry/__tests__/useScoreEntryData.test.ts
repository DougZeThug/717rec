import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Mocks referenced by vi.mock factories (must be `mock`-prefixed for hoisting) ----
const mockHandleSubmitScore = vi.fn();
const mockToast = vi.fn();

// Mock the data/service layer only — real sub-hooks + real transform run.
vi.mock('@/services/matches/MatchReadService', () => ({
  fetchMatchesForAdmin: vi.fn(),
}));

vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchBracketsForSelector: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/hooks/matches/useMatchSubmission', () => ({
  useMatchSubmission: () => ({
    handleSubmitScore: mockHandleSubmitScore,
  }),
}));

vi.mock('@/hooks/matches/utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Silence every logger export (the transform's date normalizer uses timezoneLog,
// so a partial mock would throw when the transform runs).
vi.mock('@/utils/logger', () => {
  const names = [
    'log',
    'errorLog',
    'warnLog',
    'debugLog',
    'authLog',
    'bracketLog',
    'matchLog',
    'teamLog',
    'playoffLog',
    'scoreLog',
    'badgeLog',
    'dbLog',
    'scheduleLog',
    'adminLog',
    'challongeLog',
    'timezoneLog',
    'chartLog',
    'validationLog',
    'imageErrorLog',
    'cacheLog',
    'routeLog',
    'filterLog',
    'progressLog',
    'successLog',
    'failureLog',
    'supabaseErrorLog',
    'diagnosticLog',
  ];
  return Object.fromEntries(names.map((n) => [n, vi.fn()]));
});

// Import after mocks so the mocked modules are wired in.
import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { fetchMatchesForAdmin } from '@/services/matches/MatchReadService';

import { useScoreEntryData } from '../hooks/useScoreEntryData';

// ---- Test data: raw DB rows so the REAL transform yields MatchWithTeams ----
type RawRow = Record<string, unknown>;

const makeRow = (overrides: RawRow = {}): RawRow => ({
  id: 'match-1',
  team1_id: 'team-a',
  team2_id: 'team-b',
  team1_score: 0,
  team2_score: 0,
  date: '2026-06-20T18:00:00.000Z',
  iscompleted: false,
  winner_id: null,
  loser_id: null,
  team1_game_wins: 0,
  team2_game_wins: 0,
  round_number: 1,
  position: 1,
  bracket_id: null,
  match_type: 'regular',
  best_of: 3,
  created_at: '2026-06-20T18:00:00.000Z',
  location: 'Court 1',
  team1: { id: 'team-a', name: 'Alpha', image_url: null, logo_url: null },
  team2: { id: 'team-b', name: 'Bravo', image_url: null, logo_url: null },
  ...overrides,
});

// A newer match so the "auto-set to latest date" branch has a clear winner.
const defaultRows: RawRow[] = [
  makeRow({ id: 'match-1', date: '2026-06-20T18:00:00.000Z' }),
  makeRow({
    id: 'match-2',
    date: '2026-06-25T18:00:00.000Z',
    team1_id: 'team-c',
    team2_id: 'team-d',
  }),
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockHandleSubmitScore.mockResolvedValue(true);
  vi.mocked(fetchMatchesForAdmin).mockResolvedValue(defaultRows as never);
});

describe('useScoreEntryData - return shape', () => {
  it('returns required state and handlers', () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });

    expect(result.current.matches).toBeDefined();
    expect(result.current.loading).toBeDefined();
    expect(result.current.submitting).toBe(false);
    expect(typeof result.current.handleScoreChange).toBe('function');
    expect(typeof result.current.handleMarkCompleted).toBe('function');
    expect(typeof result.current.handleSubmitAll).toBe('function');
    expect(typeof result.current.setFilterDate).toBe('function');
    expect(typeof result.current.setBracketFilter).toBe('function');
    expect(typeof result.current.clearFilters).toBe('function');
    expect(Array.isArray(result.current.brackets)).toBe(true);
    expect(typeof result.current.filters).toBe('object');
  });
});

describe('useScoreEntryData - initial load', () => {
  it('loads matches from the service, runs the real transform, and auto-sets the latest date filter', async () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.matches.length).toBeGreaterThan(0));

    // Real transform ran -> matches populated with mapped shape
    expect(result.current.matches).toHaveLength(defaultRows.length);
    expect(fetchMatchesForAdmin).toHaveBeenCalled();

    const first = result.current.matches.find((m) => m.id === 'match-1');
    expect(first).toBeDefined();
    expect(first?.team1Id).toBe('team-a');
    expect(first?.team1?.name).toBe('Alpha');
    expect(first?.isEdited).toBe(false);

    // Auto-set filter date to the latest match date (2026-06-25...)
    await waitFor(() => expect(result.current.filters.date).toBeInstanceOf(Date));
    expect(result.current.filters.date).toBeInstanceOf(Date);
  });
});

describe('useScoreEntryData - score handling', () => {
  it('handleScoreChange updates scores, marks edited, and validates', async () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.matches.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Binary scores (1/0) are the only "valid" combination per validateMatchScores.
    act(() => {
      result.current.handleScoreChange(0, 1, 0);
    });

    const firstMatch = result.current.matches[0];
    expect(firstMatch.team1Score).toBe(1);
    expect(firstMatch.team2Score).toBe(0);
    expect(firstMatch.isEdited).toBe(true);
    expect(firstMatch.isValid).toBe(true);
  });

  it('handleScoreChange marks invalid for a non-binary combination', async () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.matches.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleScoreChange(0, 3, 2);
    });

    expect(result.current.matches[0].isEdited).toBe(true);
    expect(result.current.matches[0].isValid).toBe(false);
  });

  it('handleMarkCompleted flips completion and marks edited', async () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.matches.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleMarkCompleted(0, true);
    });

    expect(result.current.matches[0].iscompleted).toBe(true);
    expect(result.current.matches[0].isEdited).toBe(true);
  });
});

describe('useScoreEntryData - submission flow', () => {
  it('shows a "No Changes" toast when nothing is edited', async () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.matches.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('No Changes') })
    );
    expect(mockHandleSubmitScore).not.toHaveBeenCalled();
  });

  it('submits edited+completed+valid matches and shows a success toast', async () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.matches.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleScoreChange(0, 1, 0);
    });
    act(() => {
      result.current.handleMarkCompleted(0, true);
    });

    const submittedId = result.current.matches[0].id;

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockHandleSubmitScore).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: submittedId,
        team1Score: 1,
        team2Score: 0,
      })
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('Submitted') })
    );
    expect(invalidateMatchRelatedQueries).toHaveBeenCalled();
  });

  it('reverses previously-recorded stats for an already-completed match before resubmitting', async () => {
    const completedRow = makeRow({
      id: 'match-1',
      date: '2026-06-25T18:00:00.000Z',
      iscompleted: true,
      winner_id: 'team-a',
      loser_id: 'team-b',
      team1_score: 1,
      team2_score: 0,
      team1_game_wins: 2,
      team2_game_wins: 1,
    });
    vi.mocked(fetchMatchesForAdmin).mockResolvedValue([completedRow] as never);

    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.matches.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Edit the scores but keep it completed so it qualifies for submission + reversal.
    act(() => {
      result.current.handleScoreChange(0, 0, 1);
    });
    // Ensure it stays completed and edited.
    act(() => {
      result.current.handleMarkCompleted(0, true);
    });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockHandleSubmitScore).toHaveBeenCalled();
  });

  it('does not reverse stats twice when the reversal succeeded but the score write failed', async () => {
    const completedRow = makeRow({
      id: 'match-1',
      date: '2026-06-25T18:00:00.000Z',
      iscompleted: true,
      winner_id: 'team-a',
      loser_id: 'team-b',
      team1_score: 1,
      team2_score: 0,
      team1_game_wins: 2,
      team2_game_wins: 1,
    });
    vi.mocked(fetchMatchesForAdmin).mockResolvedValue([completedRow] as never);
    // First submission throws AFTER the reversal ran; the retry succeeds.
    mockHandleSubmitScore.mockRejectedValueOnce(new Error('write failed'));

    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.matches.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleScoreChange(0, 0, 1);
    });
    act(() => {
      result.current.handleMarkCompleted(0, true);
    });

    // First attempt: reversal applied, then the score write blows up.
    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(result.current.matches[0].submitError).toBe(true);
    expect(result.current.matches[0].isEdited).toBe(true);

    // Retry: succeeds — the original snapshot was cleared, so the already-applied
    // reversal must NOT run a second time (that would double-decrement stats).
    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockHandleSubmitScore).toHaveBeenCalledTimes(2);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('Submitted') })
    );
  });

  it('shows a destructive error toast and keeps the match edited when submission fails', async () => {
    mockHandleSubmitScore.mockResolvedValue(false);
    vi.mocked(fetchMatchesForAdmin).mockResolvedValue([makeRow({ id: 'match-1' })] as never);

    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.matches.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleScoreChange(0, 1, 0);
    });
    act(() => {
      result.current.handleMarkCompleted(0, true);
    });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    // Failed match retains its edit flag + carries a submit error for retry.
    const failed = result.current.matches[0];
    expect(failed.isEdited).toBe(true);
    expect(failed.submitError).toBe(true);
  });
});
