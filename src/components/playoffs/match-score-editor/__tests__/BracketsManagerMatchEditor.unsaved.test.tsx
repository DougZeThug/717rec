import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearUnsavedWork } from '@/utils/unsavedChanges';

// Phone polish wave 6 (Doug, 2026-11-10): the playoff score pop-up stays
// centred, but a tap outside, Escape or Cancel must ask before it throws typed
// scores away. Save never asks. The real hook and the real Radix dialog run
// here; only the data and the services are fake.

const services = vi.hoisted(() => ({
  updateMatch: vi.fn(),
  checkByeEligibility: vi.fn(),
}));

vi.mock('@/services/brackets/manager', () => ({
  bracketManagerService: {
    updateMatch: services.updateMatch,
    checkByeEligibility: services.checkByeEligibility,
    adminCompleteByeMatch: vi.fn(),
    adminToggleByeReady: vi.fn(),
  },
}));

// Stored score 3-1: the editor opens showing these.
const storedMatch = {
  id: 5,
  status: 2,
  opponent1: { id: 1, name: 'Fake Team One', score: 3, result: null },
  opponent2: { id: 2, name: 'Fake Team Two', score: 1, result: null },
  games: [],
};

vi.mock('@/hooks/playoffs/useBracketsManagerMatch', () => ({
  useBracketsManagerMatch: (matchId: number | null) => ({
    data: matchId === null ? undefined : storedMatch,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted: false }),
}));

vi.mock('@/hooks/playoffs/useEditTeams', () => ({
  useEditTeamsEligibility: () => ({ data: undefined }),
}));

vi.mock('@/hooks/playoffs/usePlayoffLoserSwap', () => ({
  useLoserSwapEligibility: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('@/components/playoffs/admin/EditMatchParticipantsDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/playoffs/admin/SwapLoserSlotsDialog', () => ({
  default: () => null,
}));

import { BracketsManagerMatchEditor } from '../BracketsManagerMatchEditor';

/**
 * Mirrors BracketsViewerComponent: the editor stays mounted, and closing it
 * clears the selected match. "Open match" puts the same match back.
 */
const Harness: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [matchId, setMatchId] = useState<number | null>(5);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMatchId(5);
          setIsOpen(true);
        }}
      >
        Open match
      </button>
      <BracketsManagerMatchEditor
        matchId={matchId}
        bracketId="bracket-1"
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setMatchId(null);
        }}
      />
    </>
  );
};

const renderEditor = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Harness />
    </QueryClientProvider>
  );

const team1Score = () => screen.getByLabelText('Fake Team One Score');

const typeScore = (value: string) => fireEvent.change(team1Score(), { target: { value } });

/** A tap on the dimmed backdrop, outside the pop-up. */
const tapOutside = async () => {
  // Radix starts listening for outside taps one tick after it opens.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  // Radix waits for the click that ends a primary-button press before it
  // treats the press as outside.
  fireEvent.pointerDown(document.body);
  fireEvent.pointerUp(document.body);
  fireEvent.click(document.body);
};

describe('BracketsManagerMatchEditor: unsaved typed scores', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    services.updateMatch.mockResolvedValue(undefined); // skipcq: JS-W1042
    services.checkByeEligibility.mockResolvedValue({ ok: false, meta: { status: 2 } });
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    clearUnsavedWork();
  });

  it('asks before a tap outside throws a typed score away, and stays open when declined', async () => {
    renderEditor();
    typeScore('7');

    await tapOutside();

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(team1Score()).toHaveValue(7);
  });

  it('asks before Escape throws a typed score away, and stays open when declined', async () => {
    const user = userEvent.setup();
    renderEditor();
    typeScore('7');

    await user.keyboard('{Escape}');

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('asks before Cancel throws a typed score away', async () => {
    const user = userEvent.setup();
    renderEditor();
    typeScore('7');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes without asking when nothing was typed', async () => {
    const user = userEvent.setup();
    renderEditor();

    await tapOutside();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Open match' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('closes without asking when the typed score is put back to the stored one', async () => {
    const user = userEvent.setup();
    renderEditor();
    typeScore('7');
    typeScore('3');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(confirmSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('never asks on Save', async () => {
    const user = userEvent.setup();
    renderEditor();
    typeScore('7');

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(services.updateMatch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('shows the stored scores when the same match is reopened after Cancel', async () => {
    confirmSpy.mockReturnValue(true);
    const user = userEvent.setup();
    renderEditor();
    typeScore('7');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(confirmSpy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Open match' }));

    expect(team1Score()).toHaveValue(3);
  });

  it('shows the stored scores when the same match is reopened after a tap outside', async () => {
    confirmSpy.mockReturnValue(true);
    const user = userEvent.setup();
    renderEditor();
    typeScore('7');

    await tapOutside();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Open match' }));

    expect(team1Score()).toHaveValue(3);
  });
});
