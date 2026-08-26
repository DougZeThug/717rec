import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Season } from '@/types/season';

const toastMock = vi.fn();
const activateMock = vi.fn();
const partialArchiveMock = vi.fn();
const finalizeMock = vi.fn();
let seasonsFromHook: Season[] = [];

vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => toastMock(...args),
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/hooks/useSeasonMutations', () => ({
  useSeasonMutations: () => ({
    activateSeason: { mutateAsync: activateMock },
    activateSeasonWithPartialArchive: { mutateAsync: partialArchiveMock },
    finalizePlayoffs: { mutateAsync: finalizeMock },
  }),
}));

vi.mock('@/hooks/useSeasons', () => ({
  useSeasons: () => ({ data: seasonsFromHook }),
}));

import SeasonsList from '../SeasonsList';

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

// The list renders from its prop while the dialog reads useSeasons(). In the app
// both come from the same cached ['seasons'] entry, so keep them identical here.
const renderList = (seasons: Season[]) => {
  seasonsFromHook = seasons;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SeasonsList seasons={seasons} isLoading={false} onEditSeason={vi.fn()} />
    </QueryClientProvider>
  );
};

describe('SeasonsList activation control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seasonsFromHook = [];
  });

  it('shows an Activate button for a season that is neither active nor archived', () => {
    renderList([makeSeason()]);

    expect(screen.getAllByRole('button', { name: 'Activate' })).toHaveLength(1);
  });

  it('does not show an Activate button for the active season', () => {
    renderList([makeSeason({ is_active: true })]);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activate' })).not.toBeInTheDocument();
  });

  it('does not show an Activate button for an archived season', () => {
    renderList([makeSeason({ is_archived: true })]);

    expect(screen.getByText('Archived')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activate' })).not.toBeInTheDocument();
  });

  it('shows an Activate button for a season whose playoffs are still in progress', () => {
    renderList([makeSeason({ playoffs_active: true })]);

    expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /finalize playoffs/i })).toBeInTheDocument();
  });

  it('opens no dialog until Activate is pressed', () => {
    renderList([makeSeason()]);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('opens the activation dialog for the season whose Activate was pressed', async () => {
    renderList([
      makeSeason({ id: 's-spring', name: 'Spring 2026' }),
      makeSeason({ id: 's-summer', name: 'Summer 2026' }),
    ]);

    await userEvent.click(screen.getAllByRole('button', { name: 'Activate' })[1]);

    expect(
      screen.getByRole('heading', { name: /Activate Season: Summer 2026/ })
    ).toBeInTheDocument();
  });

  it("activates the pressed season with that season's id", async () => {
    activateMock.mockResolvedValue({});
    renderList([makeSeason()]);

    await userEvent.click(screen.getByRole('button', { name: 'Activate' }));
    await userEvent.click(screen.getByRole('button', { name: 'Activate Season' }));

    await waitFor(() => expect(activateMock).toHaveBeenCalledWith('s-target'));
  });
});
