import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Season } from '@/types/season';

const toastMock = vi.fn();
const activateMock = vi.fn();
const partialArchiveMock = vi.fn();
let seasonsFromHook: Season[] = [];

vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => toastMock(...args),
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/hooks/useSeasonMutations', () => ({
  useSeasonMutations: () => ({
    activateSeason: { mutateAsync: activateMock },
    activateSeasonWithPartialArchive: { mutateAsync: partialArchiveMock },
  }),
}));

vi.mock('@/hooks/useSeasons', () => ({
  useSeasons: () => ({ data: seasonsFromHook }),
}));

import SeasonActivationDialog from '../SeasonActivationDialog';

const makeSeason = (overrides: Partial<Season> = {}): Season => ({
  id: 's-target',
  name: 'Spring 2026',
  is_active: false,
  is_archived: false,
  playoffs_active: false,
  start_date: '2026-01-01',
  end_date: null,
  created_at: '2026-01-01T00:00:00Z',
  champion_team_id: null,
  runner_up_team_id: null,
  ...overrides,
});

const renderDialog = (season: Season) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SeasonActivationDialog isOpen onClose={vi.fn()} season={season} />
    </QueryClientProvider>
  );
};

describe('SeasonActivationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seasonsFromHook = [];
  });

  it('hides the keep-playoffs option when there is no active season', () => {
    seasonsFromHook = [makeSeason({ id: 's-target', is_active: false })];
    renderDialog(makeSeason({ id: 's-target' }));
    expect(screen.queryByLabelText(/keep .* playoffs active/i)).not.toBeInTheDocument();
  });

  it('hides the keep-playoffs option when activating the already-active season', () => {
    const target = makeSeason({ id: 's-target', is_active: true });
    seasonsFromHook = [target];
    renderDialog(target);
    expect(screen.queryByLabelText(/keep .* playoffs active/i)).not.toBeInTheDocument();
  });

  it('shows the keep-playoffs option when a different season is active', () => {
    seasonsFromHook = [
      makeSeason({ id: 's-old', name: 'Winter 2025', is_active: true }),
      makeSeason({ id: 's-target', name: 'Spring 2026' }),
    ];
    renderDialog(makeSeason({ id: 's-target', name: 'Spring 2026' }));
    expect(screen.getByLabelText(/keep .*Winter 2025.* playoffs active/i)).toBeInTheDocument();
  });

  it('calls activateSeason when checkbox is unchecked', async () => {
    seasonsFromHook = [
      makeSeason({ id: 's-old', name: 'Winter 2025', is_active: true }),
      makeSeason({ id: 's-target' }),
    ];
    activateMock.mockResolvedValue({ id: 's-target' });
    renderDialog(makeSeason({ id: 's-target' }));

    await userEvent.click(screen.getByRole('button', { name: /activate season/i }));

    await waitFor(() => expect(activateMock).toHaveBeenCalledWith('s-target'));
    expect(partialArchiveMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringMatching(/now the active season/i) })
    );
  });

  it('calls activateSeasonWithPartialArchive when checkbox is checked', async () => {
    seasonsFromHook = [
      makeSeason({ id: 's-old', name: 'Winter 2025', is_active: true }),
      makeSeason({ id: 's-target' }),
    ];
    partialArchiveMock.mockResolvedValue({ id: 's-target' });
    renderDialog(makeSeason({ id: 's-target' }));

    await userEvent.click(screen.getByLabelText(/keep .* playoffs active/i));
    await userEvent.click(screen.getByRole('button', { name: /activate season/i }));

    await waitFor(() => expect(partialArchiveMock).toHaveBeenCalledWith('s-target'));
    expect(activateMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringMatching(/playoffs remain in progress/i) })
    );
  });

  it('updates the bullet list when toggling the checkbox', async () => {
    seasonsFromHook = [
      makeSeason({ id: 's-old', name: 'Winter 2025', is_active: true }),
      makeSeason({ id: 's-target', name: 'Spring 2026' }),
    ];
    renderDialog(makeSeason({ id: 's-target', name: 'Spring 2026' }));

    expect(screen.getByText(/current active season will be deactivated/i)).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/keep .* playoffs active/i));

    expect(screen.queryByText(/current active season will be deactivated/i)).not.toBeInTheDocument();
    expect(screen.getByText(/regular-season matches will be archived/i)).toBeInTheDocument();
    expect(screen.getByText(/playoff bracket will stay in progress/i)).toBeInTheDocument();
  });

  it('shows an error toast when the mutation rejects', async () => {
    seasonsFromHook = [makeSeason({ id: 's-target' })];
    activateMock.mockRejectedValue(new Error('db down'));
    renderDialog(makeSeason({ id: 's-target' }));

    await userEvent.click(screen.getByRole('button', { name: /activate season/i }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: 'db down' })
      )
    );
  });
});