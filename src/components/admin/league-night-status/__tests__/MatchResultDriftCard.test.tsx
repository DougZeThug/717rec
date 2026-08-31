import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MatchResultDrift } from '@/services/admin/MatchResultDriftService';

const fetchMatchResultDrift = vi.fn();
const useActiveSeason = vi.fn();
const refetchSeason = vi.fn();

vi.mock('@/services/admin/MatchResultDriftService', () => ({
  MatchResultDriftService: {
    fetchMatchResultDrift: (seasonId: string) => fetchMatchResultDrift(seasonId),
  },
}));

vi.mock('@/hooks/useSeasons', () => ({
  useActiveSeason: () => useActiveSeason(),
}));

import MatchResultDriftCard from '../MatchResultDriftCard';

const renderCard = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MatchResultDriftCard />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const drift = (over: Partial<MatchResultDrift> = {}): MatchResultDrift => ({
  id: 'm-1',
  date: '2026-08-20T23:00:00Z',
  seasonId: 's-1',
  team1Name: 'Sweat Bandits',
  team2Name: 'Corn Stars',
  kind: 'match-winner',
  recorded: 'recorded as won by Corn Stars',
  derived: 'its games give it to Sweat Bandits',
  ...over,
});

describe('MatchResultDriftCard', () => {
  beforeEach(() => {
    fetchMatchResultDrift.mockReset();
    useActiveSeason.mockReset();
    refetchSeason.mockReset();
    refetchSeason.mockResolvedValue({ data: { id: 's-1' } });
    useActiveSeason.mockReturnValue({
      data: { id: 's-1' },
      isLoading: false,
      isError: false,
      refetch: refetchSeason,
    });
  });

  it('says it is checking while the query runs', () => {
    fetchMatchResultDrift.mockReturnValue(new Promise(() => {}));
    renderCard();

    expect(screen.getByText('Checking…')).toBeInTheDocument();
  });

  it('offers a retry when the check fails', async () => {
    fetchMatchResultDrift.mockRejectedValue(new Error('boom'));
    renderCard();

    expect(await screen.findByText('Couldn’t check for disagreeing matches.')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(fetchMatchResultDrift).toHaveBeenCalledTimes(2));
  });

  it('says why it cannot check with no active season, rather than claiming all clear', () => {
    useActiveSeason.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: refetchSeason,
    });
    renderCard();

    expect(screen.getByText(/No active season — nothing to check/)).toBeInTheDocument();
    expect(screen.queryByText(/All clear/)).not.toBeInTheDocument();
    expect(fetchMatchResultDrift).not.toHaveBeenCalled();
  });

  it('reports a failed season read as an error, not as "no active season"', async () => {
    useActiveSeason.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: refetchSeason,
    });
    renderCard();

    expect(await screen.findByText('Couldn’t check for disagreeing matches.')).toBeInTheDocument();
    expect(screen.queryByText(/No active season/)).not.toBeInTheDocument();
    expect(screen.queryByText(/All clear/)).not.toBeInTheDocument();
  });

  it('retries the season read when that is what failed, so Retry is not dead', async () => {
    useActiveSeason.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: refetchSeason,
    });
    refetchSeason.mockResolvedValue({ data: undefined });
    renderCard();

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(refetchSeason).toHaveBeenCalledTimes(1));
    // No season came back, so the disabled drift query is not asked either.
    expect(fetchMatchResultDrift).not.toHaveBeenCalled();
  });

  it('reports all clear when nothing disagrees', async () => {
    fetchMatchResultDrift.mockResolvedValue([]);
    renderCard();

    expect(
      await screen.findByText(/every live-scored match agrees with its own rounds/)
    ).toBeInTheDocument();
  });

  it('names the match and says what disagrees with what', async () => {
    fetchMatchResultDrift.mockResolvedValue([drift()]);
    renderCard();

    expect(await screen.findByText(/1 match no longer/)).toBeInTheDocument();
    expect(screen.getByText('Sweat Bandits v Corn Stars')).toBeInTheDocument();
    expect(
      screen.getByText('recorded as won by Corn Stars, but its games give it to Sweat Bandits.')
    ).toBeInTheDocument();
  });

  it('links each match to its live page', async () => {
    fetchMatchResultDrift.mockResolvedValue([drift()]);
    renderCard();

    const link = await screen.findByRole('link', {
      name: 'Open Sweat Bandits versus Corn Stars',
    });
    expect(link).toHaveAttribute('href', '/matches/m-1/live');
  });

  it('caps the list at ten and counts the rest', async () => {
    fetchMatchResultDrift.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => drift({ id: `m-${i}` }))
    );
    renderCard();

    expect(await screen.findByText('…and 2 more')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(10);
    expect(screen.getByText(/12 matches no longer/)).toBeInTheDocument();
  });

  it('falls back to "no date" for a match with no date', async () => {
    fetchMatchResultDrift.mockResolvedValue([drift({ date: null })]);
    renderCard();

    expect(await screen.findByText(/· no date/)).toBeInTheDocument();
  });
});
