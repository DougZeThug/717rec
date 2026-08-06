import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LoserSwapSlot } from '@/services/brackets/manager/services/BracketAdmin/swap';

vi.mock('@/hooks/playoffs/usePlayoffLoserSwap', () => ({
  useLoserSwapEligibility: vi.fn(),
  usePlayoffSwapLoserSlots: vi.fn(),
}));

import {
  useLoserSwapEligibility,
  usePlayoffSwapLoserSlots,
} from '@/hooks/playoffs/usePlayoffLoserSwap';

import SwapLoserSlotsDialog from '../SwapLoserSlotsDialog';

const slot = (
  matchId: number,
  matchNumber: number,
  side: 'opponent1' | 'opponent2',
  participant: { id: number; name: string } | null,
  partnerIsBye = false,
  partnerName: string | null = null
): LoserSwapSlot => ({
  matchId,
  matchNumber,
  side,
  participantId: participant?.id ?? null,
  participantName: participant?.name ?? null,
  isBye: participant === null,
  partnerIsBye,
  partnerName,
});

const mutateMock = vi.fn();

function wireEligibility(data: unknown, isLoading = false): void {
  vi.mocked(useLoserSwapEligibility).mockReturnValue({ data, isLoading } as ReturnType<
    typeof useLoserSwapEligibility
  >);
}

function renderDialog(): void {
  render(
    <SwapLoserSlotsDialog open onOpenChange={vi.fn()} bracketId="bracket-uuid-1" matchId={201} />
  );
}

beforeAll(() => {
  // Radix Select relies on pointer capture and scrollIntoView, which jsdom lacks.
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.mocked(usePlayoffSwapLoserSlots).mockReturnValue({
    mutate: mutateMock,
    isPending: false,
  } as unknown as ReturnType<typeof usePlayoffSwapLoserSlots>);
  mutateMock.mockClear();
});

describe('SwapLoserSlotsDialog', () => {
  it('shows the reason and keeps the confirm disabled when the match is not eligible', () => {
    wireEligibility({ ok: false, reason: 'This match has already been played.' });
    renderDialog();

    expect(screen.getByText('This match has already been played.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move team/i })).toBeDisabled();
  });

  it('fires the mutation with the chosen team and destination slot', async () => {
    wireEligibility({
      ok: true,
      roundNumber: 2,
      slots: [
        slot(201, 1, 'opponent1', { id: 5, name: 'T5' }),
        slot(201, 1, 'opponent2', { id: 9, name: 'T9' }),
      ],
      candidates: [
        slot(204, 4, 'opponent1', { id: 7, name: 'T7' }, true),
        slot(204, 4, 'opponent2', null, false, 'T7'),
      ],
    });
    renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText(/which team do you want to move/i));
    await user.click(screen.getByRole('option', { name: 'T5' }));

    await user.click(screen.getByLabelText(/where should they go/i));
    // The BYE spot is labeled with its real effect: the mover would PLAY the
    // team whose walkover gets undone, not advance automatically.
    expect(
      screen.getByRole('option', { name: /match 4: take the BYE spot and play T7/i })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /match 4: swap with T7/i }));

    await user.click(screen.getByRole('button', { name: /^move team$/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      {
        sourceMatchId: 201,
        sourceSide: 'opponent1',
        targetMatchId: 204,
        targetSide: 'opponent1',
      },
      expect.anything()
    );
  });

  it('clears the picked destination when the team to move changes', async () => {
    // The destination is relative to the moving team, so a stale pick must
    // not survive a team change — otherwise the save silently pairs the new
    // team with the old destination.
    wireEligibility({
      ok: true,
      roundNumber: 2,
      slots: [
        slot(201, 1, 'opponent1', { id: 5, name: 'T5' }),
        slot(201, 1, 'opponent2', { id: 9, name: 'T9' }),
      ],
      candidates: [
        slot(204, 4, 'opponent1', { id: 7, name: 'T7' }, true),
        slot(204, 4, 'opponent2', null, false, 'T7'),
      ],
    });
    renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText(/which team do you want to move/i));
    await user.click(screen.getByRole('option', { name: 'T5' }));
    await user.click(screen.getByLabelText(/where should they go/i));
    await user.click(screen.getByRole('option', { name: /match 4: swap with T7/i }));

    await user.click(screen.getByLabelText(/which team do you want to move/i));
    await user.click(screen.getByRole('option', { name: 'T9' }));

    // The destination is back to unpicked and the save cannot fire.
    expect(screen.queryByText(/match 4: swap with T7/i)).not.toBeInTheDocument();
    expect(screen.getByText('Select destination')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^move team$/i })).toBeDisabled();
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('does not offer a BYE spot to a team whose own match partner is a BYE', async () => {
    // Moving that team onto another BYE would leave its old match with two
    // BYEs — the service refuses it, so the dialog must not offer it.
    wireEligibility({
      ok: true,
      roundNumber: 2,
      slots: [slot(204, 4, 'opponent1', { id: 7, name: 'T7' }, true)],
      candidates: [
        slot(201, 1, 'opponent1', { id: 5, name: 'T5' }),
        slot(202, 2, 'opponent2', null, false),
      ],
    });
    renderDialog();
    const user = userEvent.setup();

    // The only movable team is preselected; open the destination list.
    await user.click(screen.getByLabelText(/where should they go/i));

    expect(screen.getByRole('option', { name: /match 1: swap with T5/i })).toBeInTheDocument();
    expect(screen.queryByText(/take the BYE spot/i)).not.toBeInTheDocument();
  });
});
