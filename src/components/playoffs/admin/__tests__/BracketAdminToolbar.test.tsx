import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BracketAdminToolbar from '@/components/playoffs/admin/BracketAdminToolbar';
import type { PlayoffBracket } from '@/utils/playoffs/playoffTypes';

const recalculate = vi.fn();
const repair = vi.fn();
const fetchFinalStandings = vi.fn();

vi.mock('@/hooks/useRecalculateStandings', () => ({
  useRecalculateStandings: () => ({ recalculate, isRecalculating: false }),
}));

vi.mock('@/hooks/useRepairBracket', () => ({
  useRepairBracket: () => ({ repair, isRepairing: false }),
}));

vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchFinalStandings: (id: string) => fetchFinalStandings(id),
}));

const bracket = {
  id: 'b-1',
  name: 'Summer Finals',
  format: 'Double Elimination',
  state: 'pending',
  uses_brackets_manager: true,
} as unknown as PlayoffBracket;

const renderToolbar = (
  overrides: Partial<PlayoffBracket> = {},
  props: Partial<React.ComponentProps<typeof BracketAdminToolbar>> = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const handlers = {
    onRearrange: vi.fn(),
    onUpdateSeeding: vi.fn(),
    onEdit: vi.fn(),
    ...props,
  };
  render(
    <QueryClientProvider client={queryClient}>
      <BracketAdminToolbar
        bracket={{ ...bracket, ...overrides } as PlayoffBracket}
        bracketId="b-1"
        {...handlers}
      />
    </QueryClientProvider>
  );
  return handlers;
};

describe('BracketAdminToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchFinalStandings.mockResolvedValue([]);
  });

  it('offers seeding and editing on a pending bracket', async () => {
    const { onUpdateSeeding, onEdit } = renderToolbar();

    await userEvent.click(screen.getByRole('button', { name: /update seeding/i }));
    await userEvent.click(screen.getByRole('button', { name: /edit bracket/i }));

    expect(onUpdateSeeding).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('offers Repair Bracket only while the bracket is unfinished', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: /repair bracket/i })).toBeInTheDocument();
  });

  it('hides Repair Bracket and disables seeding once completed', () => {
    renderToolbar({ state: 'completed' } as Partial<PlayoffBracket>);

    expect(screen.queryByRole('button', { name: /repair bracket/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update seeding/i })).toBeDisabled();
  });

  it('offers Rearrange Teams only for a double elimination bracket', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: /rearrange teams/i })).toBeInTheDocument();

    document.body.innerHTML = '';
    renderToolbar({ format: 'Single Elimination' } as Partial<PlayoffBracket>);
    expect(screen.queryByRole('button', { name: /rearrange teams/i })).not.toBeInTheDocument();
  });

  it('offers Delete only when a delete handler is given', () => {
    renderToolbar();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

    document.body.innerHTML = '';
    const onDeleteBracket = vi.fn();
    renderToolbar({}, { onDeleteBracket });
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('names the bracket when asking to delete it', async () => {
    const onDeleteBracket = vi.fn();
    renderToolbar({}, { onDeleteBracket });

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(onDeleteBracket).toHaveBeenCalledWith('b-1', 'Summer Finals');
  });

  it('runs the repair action', async () => {
    renderToolbar();

    await userEvent.click(screen.getByRole('button', { name: /repair bracket/i }));

    expect(repair).toHaveBeenCalledTimes(1);
  });

  it('offers Recalculate Standings on a completed bracket with none stored', async () => {
    fetchFinalStandings.mockResolvedValue([]);
    renderToolbar({ state: 'completed' } as Partial<PlayoffBracket>);

    const button = await screen.findByRole('button', { name: /recalculate standings/i });
    await userEvent.click(button);

    expect(recalculate).toHaveBeenCalledTimes(1);
  });

  it('does not offer Recalculate Standings once standings exist', async () => {
    fetchFinalStandings.mockResolvedValue([{ id: 's-1' }]);
    renderToolbar({ state: 'completed' } as Partial<PlayoffBracket>);

    // The button is shown while the standings query is still in flight, because
    // "not loaded yet" and "missing" look the same to the check. It goes once
    // the query answers.
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /recalculate standings/i })
      ).not.toBeInTheDocument()
    );
  });
});
