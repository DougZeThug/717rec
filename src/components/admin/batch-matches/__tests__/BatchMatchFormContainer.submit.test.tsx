import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Shared spies (hoisted so vi.mock factories can reference them) ---
const mockToast = vi.hoisted(() => vi.fn());
const mockBatchCreateMatches = vi.hoisted(() => vi.fn());
const mockFetchActiveSeason = vi.hoisted(() => vi.fn());

const testTeams = [
  { id: 'team-a', name: 'Alpha', imageUrl: '' },
  { id: 'team-b', name: 'Bravo', imageUrl: '' },
  { id: 'team-c', name: 'Charlie', imageUrl: '' },
];

// --- Mocks (must be declared before importing the component under test) ---
vi.mock('@/hooks/teams', () => ({
  useTeamsQuery: () => ({ data: testTeams, isLoading: false }),
}));

vi.mock('@/services/matches/MatchWriteService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/matches/MatchWriteService')>();
  return {
    ...actual,
    batchCreateMatches: mockBatchCreateMatches,
    fetchActiveSeason: mockFetchActiveSeason,
  };
});

vi.mock('@/components/schedule/form-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/schedule/form-utils')>();
  return {
    ...actual,
    createDateWithTime: vi.fn(() => new Date('2026-01-08T23:30:00.000Z')),
  };
});

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  matchLog: vi.fn(),
  timezoneLog: vi.fn(),
}));

// Stand-in for TeamLogo so option accessible names are exactly the team name
// (the real logo injects a 2-char fallback like "Al" that corrupts the name).
vi.mock('@/components/ui/team/TeamLogo', () => ({
  TeamLogo: () => null,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  m: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

import BatchMatchFormContainer from '../BatchMatchFormContainer';

const ISO_DATE = '2026-01-08T23:30:00.000Z';

const renderContainer = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <BatchMatchFormContainer />
    </QueryClientProvider>
  );
  return { qc, invalidateSpy };
};

// Select an option in a Radix Select trigger (a role="combobox" element).
const chooseOption = async (
  user: ReturnType<typeof userEvent.setup>,
  combobox: HTMLElement,
  optionName: string | RegExp
) => {
  await user.click(combobox);
  await user.click(await screen.findByRole('option', { name: optionName }));
};

describe('BatchMatchFormContainer submission (end-to-end)', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchActiveSeason.mockResolvedValue('season-1');
    mockBatchCreateMatches.mockResolvedValue([{ id: 'match-1' }]);
  });

  it('submits a single valid pair and resets the form', async () => {
    const user = userEvent.setup();
    const { invalidateSpy } = renderContainer();

    // The default pair renders three comboboxes: team1, team2, timeslot.
    const [team1, team2, timeslot] = screen.getAllByRole('combobox');
    await chooseOption(user, team1, 'Alpha');
    await chooseOption(user, team2, 'Bravo');
    await chooseOption(user, timeslot, '6:30 PM');

    await user.click(screen.getByRole('button', { name: /create matches/i }));

    await waitFor(() => expect(mockBatchCreateMatches).toHaveBeenCalledTimes(1));

    expect(mockFetchActiveSeason).toHaveBeenCalled();

    const payload = mockBatchCreateMatches.mock.calls[0][0];
    expect(payload).toHaveLength(1);
    expect(payload[0]).toEqual(
      expect.objectContaining({
        team1_id: 'team-a',
        team2_id: 'team-b',
        date: ISO_DATE,
        location: 'Court 1',
        iscompleted: false,
        round_number: 0,
        team1_score: 0,
        team2_score: 0,
        season_id: 'season-1',
      })
    );

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['matches'] });

    // A success toast fired (hook fires "Success", container fires "Matches Created").
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/success|matches created/i) })
      )
    );

    // Form reset: the previously chosen team name is no longer shown as a trigger value.
    await waitFor(() => {
      const [resetTeam1] = screen.getAllByRole('combobox');
      expect(resetTeam1).not.toHaveTextContent('Alpha');
    });
  });

  it('blocks submission when the pair is incomplete', async () => {
    const user = userEvent.setup();
    renderContainer();

    const [team1] = screen.getAllByRole('combobox');
    await chooseOption(user, team1, 'Alpha');

    await user.click(screen.getByRole('button', { name: /create matches/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: expect.stringMatching(/please fill in all match details/i),
        })
      )
    );
    expect(mockBatchCreateMatches).not.toHaveBeenCalled();
  });

  it('blocks submission when a team is reused across matches', async () => {
    const user = userEvent.setup();
    renderContainer();

    // Fill pair 1: Alpha vs Bravo @ 6:30 PM.
    const firstRow = screen.getAllByRole('combobox');
    await chooseOption(user, firstRow[0], 'Alpha');
    await chooseOption(user, firstRow[1], 'Bravo');
    await chooseOption(user, firstRow[2], '6:30 PM');

    // Add a second pair.
    await user.click(screen.getByRole('button', { name: /add another match/i }));

    // Now 6 comboboxes exist; pair 2 is indices 3,4,5.
    await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(6));
    const allBoxes = screen.getAllByRole('combobox');
    // Pair 2 reuses Alpha (allowed by the UI since it's a different row) vs Charlie.
    await chooseOption(user, allBoxes[3], 'Alpha');
    await chooseOption(user, allBoxes[4], 'Charlie');
    await chooseOption(user, allBoxes[5], '7:00 PM');

    await user.click(screen.getByRole('button', { name: /create matches/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: expect.stringMatching(/teams cannot be used in multiple matches/i),
        })
      )
    );
    expect(mockBatchCreateMatches).not.toHaveBeenCalled();
  });

  it('keeps the form intact when the service rejects', async () => {
    mockBatchCreateMatches.mockRejectedValueOnce(new Error('insert failed'));
    const user = userEvent.setup();
    renderContainer();

    const [team1, team2, timeslot] = screen.getAllByRole('combobox');
    await chooseOption(user, team1, 'Alpha');
    await chooseOption(user, team2, 'Bravo');
    await chooseOption(user, timeslot, '6:30 PM');

    await user.click(screen.getByRole('button', { name: /create matches/i }));

    await waitFor(() => expect(mockBatchCreateMatches).toHaveBeenCalledTimes(1));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: expect.stringMatching(/insert failed/i),
        })
      )
    );

    // Form NOT reset: the chosen team is still shown on the first combobox.
    const [stillTeam1] = screen.getAllByRole('combobox');
    expect(within(stillTeam1).getByText('Alpha')).toBeInTheDocument();
  });
});
