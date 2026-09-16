import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockNavigate, mockCreateBracket } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockCreateBracket: vi.fn(),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/services/bracket-creator', () => ({
  createBracket: mockCreateBracket,
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  validationLog: vi.fn(),
  cacheLog: vi.fn(),
  playoffLog: vi.fn(),
}));

const DIVISION_ID = '11111111-1111-4111-8111-111111111111';

// The form is not what is under test here; a stub that fires one valid submit
// keeps this about what happens after the bracket comes back.
vi.mock('../BracketForm', () => ({
  default: ({ onSubmit }: { onSubmit: (values: Record<string, unknown>) => void }) => (
    <button
      type="button"
      onClick={() =>
        onSubmit({
          title: 'Cup',
          divisionId: '11111111-1111-4111-8111-111111111111',
          format: 'Single Elimination',
          teams: ['t1', 't2'],
          grandFinalType: 'simple',
        })
      }
    >
      Create Bracket
    </button>
  ),
}));

import BracketCreationDialog from '../BracketCreationDialog';

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const teams = [
  { id: 't1', name: 'Alpha' },
  { id: 't2', name: 'Bravo' },
];

const renderDialog = (
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
) => {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <BracketCreationDialog
          open
          onOpenChange={vi.fn()}
          divisions={[{ id: DIVISION_ID, name: 'Competitive' }]}
          teams={teams}
          seasonId="s1"
        />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Submit, then let the cache refresh settle so the delayed jump is scheduled. */
const submitAndWaitForTheTimerToBeSet = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Create Bracket' }));
  await waitFor(() => expect(mockCreateBracket).toHaveBeenCalled());
  await act(async () => {
    await wait(50);
  });
};

describe('BracketCreationDialog delayed navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateBracket.mockResolvedValue({ id: 'b-1', division_id: DIVISION_ID });
  });

  it('opens the new bracket when the reader is still there', async () => {
    renderDialog();
    await submitAndWaitForTheTimerToBeSet();

    await waitFor(
      () =>
        expect(mockNavigate).toHaveBeenCalledWith(`/playoffs?division=${DIVISION_ID}&bracket=b-1`),
      { timeout: 3000 }
    );
  });

  // The jump is a second late on purpose, so a reader can leave before it. If it
  // still fires, it drags them back from wherever they went.
  it('does not drag the reader back after they have left the page', async () => {
    const { unmount } = renderDialog();
    await submitAndWaitForTheTimerToBeSet();

    unmount();
    await wait(1200);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // The other window: the reader leaves while the cache refresh is still
  // running, so the timer is created after the dialog has already gone and
  // there is nothing left to cancel it.
  it('does not schedule the jump when they leave during the refresh', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    // Hold the refresh open so the unmount lands inside it.
    let releaseRefresh!: () => void;
    const refreshHeld = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    let refreshStarted!: () => void;
    const refreshReached = new Promise<void>((resolve) => {
      refreshStarted = resolve;
    });
    queryClient.refetchQueries = vi.fn(() => {
      refreshStarted();
      return refreshHeld;
    }) as unknown as typeof queryClient.refetchQueries;

    const user = userEvent.setup();
    const { unmount } = renderDialog(queryClient);

    await user.click(screen.getByRole('button', { name: 'Create Bracket' }));
    await refreshReached;

    unmount();
    await act(async () => {
      releaseRefresh();
      await wait(1200);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
