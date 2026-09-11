import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { SeedingUpdateDialog } from '@/components/playoffs/SeedingUpdateDialog';
import type { PlayoffBracket, PlayoffMatch } from '@/utils/playoffs/playoffTypes';

vi.mock('@/services/brackets/manager', () => ({
  bracketManagerService: { updateSeeding: vi.fn() },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const participants = [
  { id: 1, name: 'Alpha', position: 1, team_id: 't-1' },
  { id: 2, name: 'Bravo', position: 2, team_id: 't-2' },
];

const renderDialog = (matches: unknown[], bracketState: PlayoffBracket['state'] = 'pending') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SeedingUpdateDialog
        open
        onOpenChange={vi.fn()}
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

describe('SeedingUpdateDialog seeding lock', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
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
