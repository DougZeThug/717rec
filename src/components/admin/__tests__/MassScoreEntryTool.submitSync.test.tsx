import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MatchWithTeams } from '../mass-score-entry/types';

// ---------------------------------------------------------------------------
// Shared spies for the lowest-level seams we mock. Everything else (the real
// useScoreEntryData hook, the real MatchesTable + MatchRow + score buttons)
// runs for real so we exercise the true submit -> table-sync path.
// ---------------------------------------------------------------------------
const mockHandleSubmitScore = vi.fn();
const mockFetchMatches = vi.fn();
const mockToast = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/matches/useMatchSubmission', () => ({
  useMatchSubmission: () => ({ handleSubmitScore: mockHandleSubmitScore }),
}));

vi.mock('@/hooks/matches/utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/components/admin/mass-score-entry/hooks/fetching/useMatchesFetching', () => ({
  useMatchesFetching: () => ({
    fetchMatches: mockFetchMatches,
    fetchMatchesOrThrow: mockFetchMatches,
  }),
}));

vi.mock('@/components/admin/mass-score-entry/hooks/useMatchEventListeners', () => ({
  useMatchEventListeners: vi.fn(),
}));

vi.mock('@/hooks/brackets/useBracketsQuery', () => ({
  useBracketsQuery: () => ({ brackets: [], error: null, isLoading: false, refetch: vi.fn() }),
}));

vi.mock('@/utils/logger', () => ({
  scoreLog: vi.fn(),
  errorLog: vi.fn(),
  filterLog: vi.fn(),
  debugLog: vi.fn(),
  validationLog: vi.fn(),
  matchLog: vi.fn(),
}));

vi.mock('@/components/admin/AdminSectionWrapper', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ theme: 'light' }),
  default: () => ({ isWinterTheme: false }),
}));

// framer-motion primitives -> plain DOM elements. Use a Proxy so ANY tag
// (m.div, m.button, m.h3, m.p, m.a, ...) resolves to a passthrough element,
// because the real tree renders several different motion tags.
vi.mock('framer-motion', () => {
  const MOTION_PROPS = new Set([
    'whileTap',
    'whileHover',
    'initial',
    'animate',
    'exit',
    'transition',
    'variants',
    'layout',
    'layoutId',
  ]);
  const makeComponent =
    (Tag: string) =>
    ({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => {
      const domProps: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(rest)) {
        if (!MOTION_PROPS.has(key)) domProps[key] = val;
      }
      return React.createElement(Tag, domProps, children as React.ReactNode);
    };
  const primitives = new Proxy(
    {},
    {
      get: (_target, prop: string) => makeComponent(prop),
    }
  );
  return {
    motion: primitives,
    m: primitives,
    AnimatePresence: ({ children }: React.PropsWithChildren) => children,
  };
});

// NOTE: MatchesTable is intentionally NOT mocked — we render it for real.
import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';

import MassScoreEntryTool from '../MassScoreEntryTool';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeMatch = (overrides: Partial<MatchWithTeams> = {}): MatchWithTeams => ({
  id: 'm1',
  team1Id: 't1',
  team2Id: 't2',
  team1: { id: 't1', name: 'Alpha Team' } as MatchWithTeams['team1'],
  team2: { id: 't2', name: 'Bravo Team' } as MatchWithTeams['team2'],
  team1Score: 0,
  team2Score: 0,
  team1_game_wins: 0,
  team2_game_wins: 0,
  iscompleted: false,
  isEdited: false,
  isValid: false,
  date: '2026-03-05T18:00:00.000Z',
  ...overrides,
});

// The hook auto-sets the date filter on initial mount, which re-runs the mount
// effect and triggers a SECOND fetch before any user interaction. So we drive
// fetchMatches from a mutable "current result" rather than call-order-based
// mockResolvedValueOnce: every pre-submit mount fetch returns the initial data,
// and tests flip `currentFetchResult` right before submitting to control the
// single post-submit refetch.
let currentFetchResult: MatchWithTeams[] = [];
const setFetchResult = (matches: MatchWithTeams[]) => {
  currentFetchResult = matches;
};

const renderTool = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MassScoreEntryTool />
    </QueryClientProvider>
  );
};

// The "2–0" score button (there is one per rendered match row). Selecting it
// sets scores 1-0 / game wins 2-0, marks the row edited+valid, and
// auto-completes it — so a single click produces a submittable row.
const clickScoreButton = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
  const buttons = screen.getAllByRole('button', { name: label });
  await user.click(buttons[0]);
};

describe('MassScoreEntryTool submit -> table sync (real hook + real MatchesTable)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleSubmitScore.mockResolvedValue(true);
    currentFetchResult = [];
    // fetchMatches always resolves the current mutable result (a fresh copy so
    // the hook can't mutate our fixtures across renders).
    mockFetchMatches.mockImplementation(() =>
      Promise.resolve(currentFetchResult.map((m) => ({ ...m })))
    );
  });

  it('success: submits the edited row and syncs the table back to a clean state', async () => {
    const user = userEvent.setup();

    // Initial load returns one incomplete match.
    setFetchResult([makeMatch({ id: 'm1' })]);

    renderTool();

    // Row is rendered for real.
    await screen.findByText('Alpha Team');
    await waitFor(() => expect(mockFetchMatches).toHaveBeenCalled());

    // One click on "2–0" edits + validates + completes the row.
    await clickScoreButton(user, '2–0');

    // Submit button now reflects one pending valid edit and is enabled.
    const submitBtn = await screen.findByRole('button', { name: /submit \(1\) changes/i });
    expect(submitBtn).toBeEnabled();

    const fetchesBeforeSubmit = mockFetchMatches.mock.calls.length;

    // Post-submit refetch returns the SAME id but now official/complete (server
    // truth), so the succeeded row is replaced by clean server data.
    setFetchResult([makeMatch({ id: 'm1', iscompleted: true, isEdited: false })]);

    await user.click(submitBtn);

    // Real submission ran with the 2–0 option payload.
    await waitFor(() =>
      expect(mockHandleSubmitScore).toHaveBeenCalledWith(
        {
          matchId: 'm1',
          team1Score: 1,
          team2Score: 0,
          team1GameWins: 2,
          team2GameWins: 0,
        },
        expect.objectContaining({ suppressToast: true, suppressInvalidation: true })
      )
    );
    expect(mockHandleSubmitScore).toHaveBeenCalledTimes(1);

    // Success toast fired.
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '✅ Matches Submitted',
        description: expect.stringContaining('1 match(es) successfully submitted.'),
      })
    );

    // A post-submit refetch happened (beyond the mount fetches).
    await waitFor(() =>
      expect(mockFetchMatches.mock.calls.length).toBeGreaterThan(fetchesBeforeSubmit)
    );

    // TABLE SYNC PROOF: the succeeded row was replaced by fresh server data, so
    // isEdited cleared -> submit button flips back to "Submit All Changes" and
    // becomes disabled.
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /submit all changes/i });
      expect(btn).toBeDisabled();
    });
  });

  it('failure: keeps the row edited and shows the retry error in the table', async () => {
    const user = userEvent.setup();
    mockHandleSubmitScore.mockResolvedValue(false);

    setFetchResult([makeMatch({ id: 'm1' })]);

    renderTool();

    await screen.findByText('Alpha Team');
    await clickScoreButton(user, '2–0');

    const submitBtn = await screen.findByRole('button', { name: /submit \(1\) changes/i });
    await user.click(submitBtn);

    // Row-level failure text is rendered by the real MatchRow.
    expect(await screen.findByText(/submission failed - please retry/i)).toBeInTheDocument();

    // All-fail toast.
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Error', variant: 'destructive' })
    );

    // Row is still edited, so the submit button remains enabled for a retry.
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /submit \(1\) changes/i });
      expect(btn).toBeEnabled();
    });
  });

  it('mixed: one row succeeds and syncs clean while the failed row shows retry', async () => {
    const user = userEvent.setup();

    const two = () => [
      makeMatch({
        id: 'm1',
        team1: { id: 't1', name: 'Alpha Team' } as MatchWithTeams['team1'],
        team2: { id: 't2', name: 'Bravo Team' } as MatchWithTeams['team2'],
      }),
      makeMatch({
        id: 'm2',
        team1Id: 't3',
        team2Id: 't4',
        team1: { id: 't3', name: 'Charlie Team' } as MatchWithTeams['team1'],
        team2: { id: 't4', name: 'Delta Team' } as MatchWithTeams['team2'],
      }),
    ];

    setFetchResult(two());

    // Keyed by matchId (robust to submission ordering): m1 succeeds, m2 fails.
    mockHandleSubmitScore.mockImplementation(({ matchId }: { matchId: string }) =>
      Promise.resolve(matchId === 'm1')
    );

    renderTool();

    await screen.findByText('Alpha Team');
    await screen.findByText('Charlie Team');

    // Edit both rows (each "2–0" button belongs to a distinct row). Re-query
    // between clicks: editing a row re-renders the table and replaces the DOM
    // nodes, so a reference captured before the first click would be stale.
    expect(screen.getAllByRole('button', { name: '2–0' }).length).toBe(2);
    await user.click(screen.getAllByRole('button', { name: '2–0' })[0]);
    await screen.findByRole('button', { name: /submit \(1\) changes/i });
    await user.click(screen.getAllByRole('button', { name: '2–0' })[1]);

    const submitBtn = await screen.findByRole('button', { name: /submit \(2\) changes/i });
    await user.click(submitBtn);

    await waitFor(() => expect(mockHandleSubmitScore).toHaveBeenCalledTimes(2));

    // Partial-success toast: 1 succeeded, 1 failed.
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '✅ Matches Submitted',
          description: expect.stringContaining('1 match(es) successfully submitted.'),
        })
      )
    );
    const partialCall = mockToast.mock.calls.find(([arg]) => arg?.title === '✅ Matches Submitted');
    expect(partialCall?.[0].description).toContain('1 failed.');

    // Exactly one row shows the retry text (the failed m2).
    const retryTexts = await screen.findAllByText(/submission failed - please retry/i);
    expect(retryTexts.length).toBe(1);
  });

  it('partial failure: banner shows the saved/failed summary and retry submits only failed rows', async () => {
    const user = userEvent.setup();

    setFetchResult([
      makeMatch({ id: 'm1', team1: { id: 't1', name: 'Alpha Team' } as MatchWithTeams['team1'] }),
      makeMatch({
        id: 'm2',
        team1Id: 't3',
        team2Id: 't4',
        team1: { id: 't3', name: 'Charlie Team' } as MatchWithTeams['team1'],
        team2: { id: 't4', name: 'Delta Team' } as MatchWithTeams['team2'],
      }),
      makeMatch({
        id: 'm3',
        team1Id: 't5',
        team2Id: 't6',
        team1: { id: 't5', name: 'Echo Team' } as MatchWithTeams['team1'],
        team2: { id: 't6', name: 'Foxtrot Team' } as MatchWithTeams['team2'],
      }),
    ]);

    mockHandleSubmitScore.mockImplementation(({ matchId }: { matchId: string }) =>
      Promise.resolve(matchId !== 'm2')
    );

    renderTool();
    await screen.findByText('Alpha Team');

    for (let index = 0; index < 3; index += 1) {
      await user.click(screen.getAllByRole('button', { name: '2–0' })[index]);
    }

    await user.click(await screen.findByRole('button', { name: /submit \(3\) changes/i }));

    await screen.findByText('2 saved, 1 failed.');
    expect(screen.getByRole('button', { name: /retry failed/i })).toBeInTheDocument();
    expect(mockHandleSubmitScore).toHaveBeenCalledTimes(3);
    expect(invalidateMatchRelatedQueries).toHaveBeenCalledTimes(1);

    mockHandleSubmitScore.mockClear();
    vi.mocked(invalidateMatchRelatedQueries).mockClear();
    mockHandleSubmitScore.mockResolvedValue(true);

    await user.click(screen.getByRole('button', { name: /retry failed/i }));

    await waitFor(() => expect(mockHandleSubmitScore).toHaveBeenCalledTimes(1));
    expect(mockHandleSubmitScore).toHaveBeenCalledWith(
      expect.objectContaining({ matchId: 'm2' }),
      expect.objectContaining({ suppressToast: true, suppressInvalidation: true })
    );
    expect(invalidateMatchRelatedQueries).toHaveBeenCalledTimes(1);
  });

  it('empty refetch does not blank the table', async () => {
    const user = userEvent.setup();
    mockHandleSubmitScore.mockResolvedValue(true);

    // Initial load has the match.
    setFetchResult([makeMatch({ id: 'm1' })]);

    renderTool();

    await screen.findByText('Alpha Team');
    await clickScoreButton(user, '2–0');

    const submitBtn = await screen.findByRole('button', { name: /submit \(1\) changes/i });

    // Let any post-edit reactive fetch fire and settle against the initial
    // data BEFORE we flip the mutable to []. Otherwise a fetch invoked
    // between the edit click and the submit click could capture [] and blank
    // the row before submit even runs.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const settledFetches = mockFetchMatches.mock.calls.length;

    // Post-submit refetch returns [] (fetchMatches returns [] on failure); the
    // hook must NOT blank the list in that case.
    setFetchResult([]);
    await user.click(submitBtn);

    await waitFor(() => expect(mockHandleSubmitScore).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockFetchMatches.mock.calls.length).toBeGreaterThan(settledFetches));

    // The original row is still present because the empty refetch was ignored.
    expect(screen.getByText('Alpha Team')).toBeInTheDocument();
  });
});
