import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '../../../../tests/__mocks__/supabase';

const mockCreateScoreSubmission = vi.fn();
const mockFetchPendingScoresMatches = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase,
}));

vi.mock('@/services/matches/MatchReadService', () => ({
  fetchPendingScoresMatches: (...args: unknown[]) => mockFetchPendingScoresMatches(...args),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  createScoreSubmission: (...args: unknown[]) => mockCreateScoreSubmission(...args),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ shouldApplyWinter: false, isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

import PendingScoresCard from '../PendingScoresCard';

const pendingMatch = {
  id: 'match-1',
  team1_id: 'team-alpha-id',
  team2_id: 'team-beta-id',
  team1_name: 'Team Alpha',
  team2_name: 'Team Beta',
  team1_logo: null,
  team2_logo: null,
  date: '2025-01-04T23:30:00Z',
  location: 'Court 1',
};

const renderWithQueryClient = (queryClient: QueryClient) =>
  render(
    <QueryClientProvider client={queryClient}>
      <PendingScoresCard />
    </QueryClientProvider>
  );

describe('PendingScoresCard score submission integration', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateScoreSubmission.mockResolvedValue(true);
    mockFetchPendingScoresMatches.mockResolvedValue([pendingMatch]);
  });

  it('submits a pending match score report and invalidates the pending scores query', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    let scoreSubmitted = false;
    mockCreateScoreSubmission.mockImplementation(() => {
      scoreSubmitted = true;
      return Promise.resolve(true);
    });
    mockFetchPendingScoresMatches.mockImplementation(() =>
      Promise.resolve(scoreSubmitted ? [] : [pendingMatch])
    );

    queryClient.setQueryData(['matches', 'pending-scores'], [pendingMatch]);

    renderWithQueryClient(queryClient);

    expect(await screen.findByText('Team Alpha')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /report/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Enter your name'), 'John Doe');
    await user.type(screen.getByPlaceholderText('e.g., Team Alpha'), 'Team Alpha');
    await user.type(
      screen.getByPlaceholderText(/e\.g\., Team Alpha beat/i),
      'Team Alpha beat Team Beta 2-1'
    );

    await user.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => {
      expect(mockCreateScoreSubmission).toHaveBeenCalledWith({
        match_id: 'match-1',
        submitter_name: 'John Doe',
        submitter_team: 'Team Alpha',
        message: 'Team Alpha beat Team Beta 2-1',
      });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['matches', 'pending-scores'] });
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(['matches', 'pending-scores'])).toEqual([]);
    });
    expect(screen.queryByText('Team Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('No pending score reports')).toBeInTheDocument();
  });
});
