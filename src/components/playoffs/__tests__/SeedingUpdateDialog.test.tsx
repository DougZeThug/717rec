import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SeedingUpdateDialog } from '@/components/playoffs/SeedingUpdateDialog';
import type { PlayoffBracket, PlayoffMatch } from '@/utils/playoffs/playoffTypes';

const updateSeeding = vi.fn();
vi.mock('@/services/brackets/manager', () => ({
  // Referenced lazily: vi.mock factories are hoisted above the const above.
  bracketManagerService: {
    updateSeeding: (...args: unknown[]) => updateSeeding(...args),
  },
}));

const toast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast }),
}));

const participants = [
  { id: 1, name: 'Alpha', position: 1, team_id: 't-1' },
  { id: 2, name: 'Bravo', position: 2, team_id: 't-2' },
];

const onOpenChange = vi.fn();

const renderDialog = (matches: unknown[], bracketState: PlayoffBracket['state'] = 'pending') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SeedingUpdateDialog
        open
        onOpenChange={onOpenChange}
        bracketId="b-1"
        bracketName="Summer Finals"
        currentParticipants={participants}
        bracketState={bracketState}
        matches={matches as PlayoffMatch[]}
      />
    </QueryClientProvider>
  );
};

const submitButton = () => screen.getByRole('button', { name: /update seeding/i });

const notStarted = [{ id: 'm1', team1Id: 't-1', team2Id: 't-2', winnerId: null, status: 'ready' }];

describe('SeedingUpdateDialog seeding lock', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    updateSeeding.mockResolvedValue(undefined); // skipcq: JS-W1042
  });

  it('lets an admin re-seed a bracket that has not started', () => {
    renderDialog([{ id: 'm1', team1Id: 't-1', team2Id: 't-2', winnerId: null, status: 'ready' }]);

    expect(submitButton()).not.toBeDisabled();
    expect(screen.queryByText(/cannot update seeding/i)).not.toBeInTheDocument();
  });

  // Nothing in the app writes an in-progress state to a bracket, so a live
  // tournament still reads as 'pending'. The matches are the only evidence.
  it('locks re-seeding once a match has been played, while the state says pending', () => {
    renderDialog([
      {
        id: 'm1',
        team1Id: 't-1',
        team2Id: 't-2',
        winnerId: 't-1',
        team1Score: 21,
        team2Score: 15,
        status: 'completed',
      },
    ]);

    expect(submitButton()).toBeDisabled();
    expect(screen.getByText(/cannot update seeding after matches have started/i)).toBeVisible();
  });

  it('says the bracket is in progress rather than repeating the stale pending state', () => {
    renderDialog([
      { id: 'm1', team1Id: 't-1', team2Id: 't-2', winnerId: 't-1', status: 'completed' },
    ]);

    expect(screen.getByText(/currently in progress/i)).toBeInTheDocument();
    expect(screen.queryByText(/currently pending/i)).not.toBeInTheDocument();
  });

  it('locks re-seeding on a finished bracket and names that state', () => {
    renderDialog([], 'completed');

    expect(submitButton()).toBeDisabled();
    expect(screen.getByText(/currently completed/i)).toBeInTheDocument();
  });

  // A bracket whose team count is not a power of two is drawn with BYE matches,
  // and the bracket library records a win for the team facing the BYE as it
  // draws them. Seeding can still be changed at that point.
  it('leaves a new bracket drawn with a BYE editable', () => {
    renderDialog([
      { id: 'm1', team1Id: 't-1', team2Id: null, winnerId: 't-1', status: 'pending' },
      { id: 'm2', team1Id: 't-2', team2Id: 't-3', winnerId: null, status: 'ready' },
    ]);

    expect(submitButton()).not.toBeDisabled();
    expect(screen.queryByText(/cannot update seeding/i)).not.toBeInTheDocument();
  });
});

describe('SeedingUpdateDialog saving a new seeding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateSeeding.mockResolvedValue(undefined); // skipcq: JS-W1042
  });

  it('sends the current order and closes on success', async () => {
    const user = userEvent.setup();
    renderDialog(notStarted);

    await user.click(submitButton());

    expect(updateSeeding).toHaveBeenCalledWith({
      bracketId: 'b-1',
      newSeeding: [
        { id: 't-1', name: 'Alpha', seed: 1 },
        { id: 't-2', name: 'Bravo', seed: 2 },
      ],
      keepSameSize: true,
    });

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Seeding updated' }));
  });

  // The library refuses a re-seed that would move a team out of a match it has
  // already been locked into. The admin has to see why.
  it('reports the reason and stays open when the save is refused', async () => {
    const user = userEvent.setup();
    updateSeeding.mockRejectedValue(new Error('Cannot update seeding of a started match'));
    renderDialog(notStarted);

    await user.click(submitButton());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Update failed',
          description: 'Cannot update seeding of a started match',
          variant: 'destructive',
        })
      )
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('falls back to a plain message when the failure is not an Error', async () => {
    const user = userEvent.setup();
    updateSeeding.mockRejectedValue('nope');
    renderDialog(notStarted);

    await user.click(submitButton());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Update failed',
          description: 'Failed to update seeding',
          variant: 'destructive',
        })
      )
    );
  });

  // The lock has to stop the write, not just grey the button out.
  it('never calls the service while the bracket is locked', async () => {
    const user = userEvent.setup();
    renderDialog([], 'completed');

    await user.click(submitButton());

    expect(updateSeeding).not.toHaveBeenCalled();
  });
});
