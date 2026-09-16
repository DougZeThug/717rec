import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUseTeamsQuery = vi.fn();

/**
 * The team query is mocked, the rankings hook is not.
 *
 * What is under test is whether this section reports a failure of the list it
 * depends on, and that folding lives inside useCareerRankings — so mocking the
 * rankings hook would assert nothing about it. Mocking one level down also
 * means the same setup drives the hook this section used to call and the one it
 * calls now, which is what makes these tests fail for the right reason.
 */
vi.mock('@/hooks/teams', () => ({
  useTeamsQuery: (options: unknown) => mockUseTeamsQuery(options),
}));

// Mocked to keep the Supabase client out of this file. Most cases never reach
// it — the rankings query stays disabled while the team list is missing — but
// the export case below drives it to produce real rows.
const mockComputeAllTeamsTotals = vi.fn();
vi.mock('@/hooks/career/computeAllTeamsTotals', () => ({
  computeAllTeamsTotals: (teams: unknown) => mockComputeAllTeamsTotals(teams),
}));

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
  useSeasonalTheme: () => ({ isWinterTheme: false }),
}));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));

import CareerRankingsSection from '../CareerRankingsSection';

// The rankings table links to team pages, so the subtree needs a router as
// well as a query client — the same two it has in the app.
const renderSection = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <CareerRankingsSection />
      </QueryClientProvider>
    </MemoryRouter>
  );

/** The team list failed, so the rankings query never gets to run. */
const teamsFailed = (refetch = vi.fn().mockResolvedValue({ error: new Error('still down') })) =>
  mockUseTeamsQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: new Error('teams down'),
    refetch,
  });

/** Career totals for one team, enough for the hook to build a ranking row. */
const totals = () => ({
  career_match_wins: 8,
  career_match_losses: 2,
  career_game_wins: 18,
  career_game_losses: 6,
  career_playoff_wins: 3,
  career_playoff_losses: 1,
  championships: 1,
  runner_ups: 0,
  career_sweep_rate: 0.4,
  career_clutch_win_pct: 0.6,
  career_clutch_game3s: 5,
  career_power_score: 71.25,
  career_sos: 0.52,
  playoff_finishes: [],
});

/**
 * Captures what the Export button would have downloaded. jsdom has no
 * object-URL support and no real download, so the blob handed to
 * `URL.createObjectURL` is the only place the finished CSV can be read.
 */
const captureDownloadedCsv = () => {
  const blobs: Blob[] = [];
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: (blob: Blob) => {
      blobs.push(blob);
      return 'blob:captured';
    },
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  return async () => await blobs[0].text();
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CareerRankingsSection', () => {
  // The defect. The rankings query is disabled until the team list arrives, so
  // it cannot report the team fetch's own failure: the section used to render
  // an ordinary collapsed card hiding "No career statistics available."
  it('reports a failed team list instead of an empty league', () => {
    teamsFailed();

    renderSection();

    expect(screen.getByRole('alert')).toHaveTextContent(/career statistics/i);
    // The ordinary card is gone, so there is nothing left to expand into the
    // empty-state message.
    expect(
      screen.queryByRole('button', { name: /expand career statistics/i })
    ).not.toBeInTheDocument();
  });

  it('offers a way out, not just a message', () => {
    teamsFailed();

    renderSection();

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('retries the team list, which is the fetch that actually failed', async () => {
    const refetchTeams = vi.fn().mockResolvedValue({ error: new Error('still down') });
    teamsFailed(refetchTeams);

    renderSection();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(refetchTeams).toHaveBeenCalled();
  });

  // A disabled query is pending but not fetching, so the rankings `isLoading`
  // stayed false for the whole time the team list was in flight — and anyone
  // who expanded the section in that window was told there was nothing to show.
  it('shows the spinner, not the no-data message, while the team list is still arriving', async () => {
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderSection();
    await userEvent.click(screen.getByRole('button', { name: /expand career statistics/i }));

    expect(screen.getByRole('status')).toHaveTextContent('Loading career stats...');
    expect(screen.queryByText('No career statistics available.')).not.toBeInTheDocument();
  });

  /**
   * The Division column of the CSV reads `divisionName` off the ranking row.
   * That field lives on useCareerRankings, which four of its five consumers
   * never touch — and the export's own parameter type declares it optional, so
   * dropping it from the row raises no type error anywhere. Nothing else would
   * notice; this walks the whole path, hook to file, so something does.
   */
  it('carries each team division through to the exported CSV', async () => {
    mockUseTeamsQuery.mockReturnValue({
      data: [{ id: 't1', name: 'Baggers', divisionName: 'Premier' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockComputeAllTeamsTotals.mockResolvedValue(new Map([['t1', totals()]]));

    const readCsv = captureDownloadedCsv();
    renderSection();

    await userEvent.click(screen.getByRole('button', { name: /expand career statistics/i }));
    await userEvent.click(await screen.findByRole('button', { name: /export/i }));

    const [header, row] = (await readCsv()).split('\n');
    expect(header.split(',')[2]).toBe('Division');
    expect(row.split(',')[2]).toBe('Premier');
  });
});
