import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseCounterDrift, mockUseReconcile, mockToast } = vi.hoisted(() => ({
  mockUseCounterDrift: vi.fn(),
  mockUseReconcile: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock('@/hooks/admin/useCounterDrift', () => ({
  useCounterDrift: () => mockUseCounterDrift(),
  useReconcileCounters: () => mockUseReconcile(),
}));
vi.mock('@/hooks/useToast', () => ({ toast: mockToast }));

import CounterDriftCard from '../CounterDriftCard';

const row = (n: number) => ({
  team_id: `t${n}`,
  name: `Team ${n}`,
  counter_wins: n,
  counter_losses: 0,
  derived_wins: n + 1,
  derived_losses: 0,
});

const drift = (overrides: Record<string, unknown> = {}) => ({
  data: [],
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  ...overrides,
});

/** The "Repair now" inside the confirm dialog is the last one in the document. */
const lastRepairButton = () => {
  const buttons = screen.getAllByRole('button', { name: 'Repair now' });
  return buttons[buttons.length - 1];
};

describe('CounterDriftCard', () => {
  const mutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync.mockResolvedValue(0);
    mockUseReconcile.mockReturnValue({ mutateAsync, isPending: false });
    mockUseCounterDrift.mockReturnValue(drift());
  });

  it('shows a checking message while it loads, with no repair button yet', () => {
    mockUseCounterDrift.mockReturnValue(drift({ isLoading: true, data: undefined }));
    render(<CounterDriftCard />);

    expect(screen.getByText('Checking…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Repair now' })).not.toBeInTheDocument();
  });

  it('offers a retry when the check itself fails', async () => {
    const refetch = vi.fn();
    mockUseCounterDrift.mockReturnValue(drift({ isError: true, data: undefined, refetch }));
    render(<CounterDriftCard />);

    expect(screen.getByText("Couldn't check counter sync.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('says the counters are in sync when no team differs', () => {
    render(<CounterDriftCard />);

    expect(screen.getByText(/In sync/)).toBeInTheDocument();
  });

  it('lists up to ten teams that are out of sync and counts the rest', () => {
    mockUseCounterDrift.mockReturnValue(
      drift({ data: Array.from({ length: 12 }, (_, i) => row(i + 1)) })
    );
    render(<CounterDriftCard />);

    expect(screen.getByText(/12 teams out of sync/)).toBeInTheDocument();
    expect(screen.getByText('Team 10')).toBeInTheDocument();
    expect(screen.queryByText('Team 11')).not.toBeInTheDocument();
    expect(screen.getByText('…and 2 more')).toBeInTheDocument();
  });

  it('says "1 team" for a single difference', () => {
    mockUseCounterDrift.mockReturnValue(drift({ data: [row(1)] }));
    render(<CounterDriftCard />);

    expect(screen.getByText(/1 team out of sync/)).toBeInTheDocument();
  });

  it('asks before repairing, then repairs and reports how many teams changed', async () => {
    const user = userEvent.setup();
    mutateAsync.mockResolvedValue(2);
    mockUseCounterDrift.mockReturnValue(drift({ data: [row(1), row(2)] }));
    render(<CounterDriftCard />);

    await user.click(screen.getByRole('button', { name: 'Repair now' }));
    expect(screen.getByText('Repair standings counters?')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();

    const confirm = lastRepairButton();
    await user.click(confirm);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Counters repaired', description: 'Repaired 2 teams.' })
    );
  });

  it('says "Already in sync" when the repair had nothing to fix', async () => {
    const user = userEvent.setup();
    render(<CounterDriftCard />);

    await user.click(screen.getByRole('button', { name: 'Repair now' }));
    await user.click(lastRepairButton());

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Already in sync' }))
    );
  });

  it('shows an error toast when the repair fails', async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(new Error('db down'));
    render(<CounterDriftCard />);

    await user.click(screen.getByRole('button', { name: 'Repair now' }));
    await user.click(lastRepairButton());

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Repair failed', variant: 'destructive' })
      )
    );
  });

  it('shows "Repairing…" and blocks a second click while a repair runs', () => {
    mockUseReconcile.mockReturnValue({ mutateAsync, isPending: true });
    render(<CounterDriftCard />);

    expect(screen.getByRole('button', { name: 'Repairing…' })).toBeDisabled();
  });
});
