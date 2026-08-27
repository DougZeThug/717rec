import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UnsavedLiveMatch } from '@/services/admin/UnsavedLiveMatchesService';

const fetchUnsavedLiveMatches = vi.fn();
const useActiveSeason = vi.fn();

vi.mock('@/services/admin/UnsavedLiveMatchesService', () => ({
  UnsavedLiveMatchesService: {
    fetchUnsavedLiveMatches: (seasonId: string) => fetchUnsavedLiveMatches(seasonId),
  },
}));

vi.mock('@/hooks/useSeasons', () => ({
  useActiveSeason: () => useActiveSeason(),
}));

import UnsavedLiveMatchesCard from '../UnsavedLiveMatchesCard';

const renderCard = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <UnsavedLiveMatchesCard />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const match = (over: Partial<UnsavedLiveMatch> = {}): UnsavedLiveMatch => ({
  id: 'm-1',
  date: '2026-08-20T23:00:00Z',
  seasonId: 's-1',
  team1Name: 'Sweat Bandits',
  team2Name: 'Corn Stars',
  team1GameWins: 2,
  team2GameWins: 0,
  ...over,
});

describe('UnsavedLiveMatchesCard', () => {
  beforeEach(() => {
    fetchUnsavedLiveMatches.mockReset();
    useActiveSeason.mockReset();
    useActiveSeason.mockReturnValue({ data: { id: 's-1' }, isLoading: false });
  });

  it('shows the all-clear state when nothing is outstanding', async () => {
    fetchUnsavedLiveMatches.mockResolvedValueOnce([]);
    renderCard();
    expect(await screen.findByText(/all clear/i)).toBeInTheDocument();
  });

  it('names the teams and the game score of an unsaved match', async () => {
    fetchUnsavedLiveMatches.mockResolvedValueOnce([match()]);
    renderCard();

    expect(await screen.findByText(/1 match was played on live scoring/i)).toBeInTheDocument();
    expect(screen.getByText(/Sweat Bandits v Corn Stars/)).toBeInTheDocument();
    expect(screen.getByText('2–0')).toBeInTheDocument();
  });

  it('pluralises the warning for several matches', async () => {
    fetchUnsavedLiveMatches.mockResolvedValueOnce([
      match(),
      match({ id: 'm-2', team1Name: 'Bag Chasers', team2Name: 'Hole Punchers' }),
    ]);
    renderCard();

    expect(await screen.findByText(/2 matches were played on live scoring/i)).toBeInTheDocument();
  });

  it('links each match to its live scoring screen', async () => {
    fetchUnsavedLiveMatches.mockResolvedValueOnce([match()]);
    renderCard();

    const link = await screen.findByRole('link', {
      name: /save the result for Sweat Bandits versus Corn Stars/i,
    });
    expect(link).toHaveAttribute('href', '/matches/m-1/live');
  });

  it('caps the list at ten and says how many are hidden', async () => {
    fetchUnsavedLiveMatches.mockResolvedValueOnce(
      Array.from({ length: 12 }, (_, i) => match({ id: `m-${i}` }))
    );
    renderCard();

    expect(await screen.findByText(/and 2 more/i)).toBeInTheDocument();
  });

  it('handles a match with no date', async () => {
    fetchUnsavedLiveMatches.mockResolvedValueOnce([match({ date: null })]);
    renderCard();

    expect(await screen.findByText(/no date/i)).toBeInTheDocument();
  });

  it('scopes the query to the active season', async () => {
    fetchUnsavedLiveMatches.mockResolvedValueOnce([]);
    renderCard();

    await screen.findByText(/all clear/i);
    expect(fetchUnsavedLiveMatches).toHaveBeenCalledWith('s-1');
  });

  it('never claims all clear when there is no active season', async () => {
    useActiveSeason.mockReturnValue({ data: null, isLoading: false });
    renderCard();

    expect(await screen.findByText(/no active season/i)).toBeInTheDocument();
    expect(screen.queryByText(/all clear/i)).not.toBeInTheDocument();
    expect(fetchUnsavedLiveMatches).not.toHaveBeenCalled();
  });

  it('offers a retry when the check fails', async () => {
    fetchUnsavedLiveMatches.mockRejectedValueOnce(new Error('boom'));
    renderCard();

    expect(await screen.findByText(/couldn't check for unrecorded matches/i)).toBeInTheDocument();

    fetchUnsavedLiveMatches.mockResolvedValueOnce([]);
    await userEvent.setup().click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(screen.getByText(/all clear/i)).toBeInTheDocument());
  });
});
