import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Season } from '@/types/season';

const toastMock = vi.fn();
const finalizeMock = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => toastMock(...args),
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/hooks/useSeasonMutations', () => ({
  useSeasonMutations: () => ({
    finalizePlayoffs: { mutateAsync: finalizeMock },
  }),
}));

import SeasonFinalizePlayoffsDialog from '../SeasonFinalizePlayoffsDialog';

const season: Season = {
  id: 's-1',
  name: 'Winter 2025',
  is_active: false,
  is_archived: false,
  playoffs_active: true,
  start_date: '2025-12-01',
  end_date: null,
  created_at: '2025-12-01T00:00:00Z',
  champion_team_id: null,
  runner_up_team_id: null,
};

describe('SeasonFinalizePlayoffsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls finalizePlayoffs with all-null team ids and closes on success', async () => {
    const onClose = vi.fn();
    finalizeMock.mockResolvedValue({ id: 's-1', is_archived: true });
    render(<SeasonFinalizePlayoffsDialog isOpen onClose={onClose} season={season} />);

    await userEvent.click(screen.getByRole('button', { name: /finalize playoffs/i }));

    await waitFor(() =>
      expect(finalizeMock).toHaveBeenCalledWith({
        seasonId: 's-1',
        championTeamId: null,
        runnerUpTeamId: null,
        thirdPlaceTeamId: null,
      })
    );
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringMatching(/finalized/i) })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an error toast and keeps the dialog open on failure', async () => {
    const onClose = vi.fn();
    finalizeMock.mockRejectedValue(new Error('rpc failed'));
    render(<SeasonFinalizePlayoffsDialog isOpen onClose={onClose} season={season} />);

    await userEvent.click(screen.getByRole('button', { name: /finalize playoffs/i }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: 'rpc failed' })
      )
    );
    // Dialog must stay open on failure so the user can retry.
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call the mutation when Cancel is clicked', async () => {
    render(<SeasonFinalizePlayoffsDialog isOpen onClose={vi.fn()} season={season} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(finalizeMock).not.toHaveBeenCalled();
  });

  it('shows "Finalizing..." and disables the action while the mutation is pending', async () => {
    let resolveFn: (value: unknown) => void = () => {};
    finalizeMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFn = resolve;
        })
    );
    render(<SeasonFinalizePlayoffsDialog isOpen onClose={vi.fn()} season={season} />);

    await userEvent.click(screen.getByRole('button', { name: /finalize playoffs/i }));

    const pendingButton = await screen.findByRole('button', { name: /finalizing\.\.\./i });
    expect(pendingButton).toBeDisabled();

    resolveFn({ id: 's-1', is_archived: true });
    await waitFor(() => expect(finalizeMock).toHaveBeenCalled());
  });
});
