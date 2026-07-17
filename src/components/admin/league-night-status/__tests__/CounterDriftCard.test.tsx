import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchDrift = vi.fn();
const reconcile = vi.fn();

vi.mock('@/services/admin/DriftService', () => ({
  DriftService: {
    fetchDrift: () => fetchDrift(),
    reconcile: () => reconcile(),
  },
}));

vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }));

import CounterDriftCard from '../CounterDriftCard';

const renderCard = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CounterDriftCard />
    </QueryClientProvider>
  );
};

describe('CounterDriftCard', () => {
  beforeEach(() => {
    fetchDrift.mockReset();
    reconcile.mockReset();
  });

  it('shows the in-sync state when no drift rows', async () => {
    fetchDrift.mockResolvedValueOnce([]);
    renderCard();
    expect(await screen.findByText(/in sync/i)).toBeInTheDocument();
  });

  it('lists drifted teams with counters vs derived', async () => {
    fetchDrift.mockResolvedValueOnce([
      {
        team_id: 't-1',
        name: 'Sweat Bandits',
        counter_wins: 1,
        derived_wins: 2,
        counter_losses: 0,
        derived_losses: 0,
        counter_game_wins: 2,
        derived_game_wins: 4,
        counter_game_losses: 1,
        derived_game_losses: 1,
      },
    ]);
    renderCard();
    expect(await screen.findByText(/1 team out of sync/i)).toBeInTheDocument();
    expect(screen.getByText(/Sweat Bandits/)).toBeInTheDocument();
  });

  it('runs reconcile through the confirm dialog', async () => {
    fetchDrift.mockResolvedValue([]);
    reconcile.mockResolvedValueOnce(2);
    renderCard();
    const user = userEvent.setup();
    await screen.findByText(/in sync/i);
    await user.click(screen.getByRole('button', { name: /repair now/i }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: /repair now/i }));
    await waitFor(() => expect(reconcile).toHaveBeenCalledTimes(1));
  });
});
