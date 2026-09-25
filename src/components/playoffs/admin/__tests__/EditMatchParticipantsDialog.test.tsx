import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EditTeamsOptions } from '@/services/brackets/manager/services/BracketAdmin/editTeams/options';

vi.mock('@/hooks/playoffs/useEditTeams', () => ({
  useEditTeamsOptions: vi.fn(),
  useEditTeamsPreview: vi.fn(),
}));
vi.mock('@/hooks/playoffs/usePlayoffEditMatchParticipants', () => ({
  usePlayoffEditMatchParticipants: vi.fn(),
}));

import { useEditTeamsOptions, useEditTeamsPreview } from '@/hooks/playoffs/useEditTeams';
import { usePlayoffEditMatchParticipants } from '@/hooks/playoffs/usePlayoffEditMatchParticipants';
import { openRadixTrigger } from '@/test/radix';

import EditMatchParticipantsDialog from '../EditMatchParticipantsDialog';

const mutateMock = vi.fn();

/** Winners Round 1 Match 2 = T4 vs T5 in a 6-team bracket, T3/T6 already played. */
const options = (overrides: Partial<EditTeamsOptions> = {}): EditTeamsOptions => ({
  ok: true,
  reason: null,
  matchLabel: 'Winners Round 1 Match 2',
  slots: [
    { side: 'opponent1', kind: 'team', teamId: 'uuid-4', name: 'T4' },
    { side: 'opponent2', kind: 'team', teamId: 'uuid-5', name: 'T5' },
  ],
  expectedOpponent1Id: 4,
  expectedOpponent2Id: 5,
  expectedPickLocations: { 'uuid-1': 11, 'uuid-4': 12, 'uuid-5': 12, 'uuid-7': null },
  candidates: [
    { teamId: 'uuid-4', name: 'T4', group: 'here', where: null, reason: null, sameDivision: true },
    { teamId: 'uuid-5', name: 'T5', group: 'here', where: null, reason: null, sameDivision: true },
    {
      teamId: 'uuid-1',
      name: 'T1',
      group: 'trade',
      where: 'Winners Round 1 Match 1',
      reason: null,
      sameDivision: true,
    },
    {
      teamId: 'uuid-7',
      name: 'T7',
      group: 'available',
      where: null,
      reason: null,
      sameDivision: false,
    },
    {
      teamId: 'uuid-3',
      name: 'T3',
      group: 'taken',
      where: 'Winners Round 1 Match 4',
      reason: 'has already been played',
      sameDivision: true,
    },
  ],
  ...overrides,
});

function wire(data: EditTeamsOptions, preview?: unknown): void {
  vi.mocked(useEditTeamsOptions).mockReturnValue({
    data,
    isLoading: false,
    error: null,
  } as unknown as ReturnType<typeof useEditTeamsOptions>);
  vi.mocked(useEditTeamsPreview).mockImplementation(
    (params) =>
      ({
        data: params ? preview : undefined,
        isLoading: false,
      }) as unknown as ReturnType<typeof useEditTeamsPreview>
  );
}

const renderDialog = () =>
  render(<EditMatchParticipantsDialog open onOpenChange={vi.fn()} bracketId="b1" matchId={12} />);

async function pick(sideLabel: string, optionName: RegExp) {
  await openRadixTrigger(screen.getByLabelText(sideLabel));
  await userEvent.click(await screen.findByRole('option', { name: optionName }));
}

beforeAll(() => {
  // Radix Select relies on pointer capture and scrollIntoView, which jsdom lacks.
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.mocked(usePlayoffEditMatchParticipants).mockReturnValue({
    mutate: mutateMock,
    isPending: false,
  } as unknown as ReturnType<typeof usePlayoffEditMatchParticipants>);
  mutateMock.mockClear();
});

describe('EditMatchParticipantsDialog', () => {
  it('explains why a match cannot be edited', () => {
    wire(
      options({
        ok: false,
        reason: 'Edit teams only works on first-round matches of the winners bracket.',
        candidates: [],
      })
    );
    renderDialog();

    expect(
      screen.getByText('Edit teams only works on first-round matches of the winners bracket.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review changes/i })).not.toBeInTheDocument();
  });

  it('lists teams grouped by how they can be picked, with the ones that cannot disabled', async () => {
    wire(options());
    renderDialog();

    expect(screen.getByRole('button', { name: /review changes/i })).toBeDisabled();
    await openRadixTrigger(screen.getByLabelText('Team 2'));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('In this match')).toBeInTheDocument();
    expect(
      within(listbox).getByText('In another round 1 match — picking one trades places')
    ).toBeInTheDocument();
    expect(within(listbox).getByText('Not in a match — other divisions')).toBeInTheDocument();
    expect(
      within(listbox).getByRole('option', { name: 'T1 (Winners Round 1 Match 1)' })
    ).toBeVisible();
    expect(
      within(listbox).getByRole('option', {
        name: 'T3 — Winners Round 1 Match 4, which has already been played',
      })
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('reviews a BYE pick, then saves it with the concurrency token', async () => {
    wire(options(), {
      ok: true,
      problems: [],
      changes: ['Winners Round 1 Match 2 is now T4 vs BYE.'],
      consequences: [
        'T4 has no opponent in Winners Round 1 Match 2 and moves on to Winners Round 2 Match 1 automatically.',
      ],
    });
    renderDialog();

    await pick('Team 2', /BYE \(no opponent\)/);
    await userEvent.click(screen.getByRole('button', { name: /review changes/i }));

    expect(screen.getByText('Winners Round 1 Match 2 is now T4 vs BYE.')).toBeInTheDocument();
    expect(
      screen.getByText(/moves on to Winners Round 2 Match 1 automatically/)
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      {
        matchId: 12,
        opponent1: { kind: 'team', teamId: 'uuid-4' },
        opponent2: { kind: 'bye' },
        expectedOpponent1Id: 4,
        expectedOpponent2Id: 5,
        expectedPickLocations: options().expectedPickLocations,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('shows why a reviewed change would be refused, and does not save it', async () => {
    wire(options(), {
      ok: false,
      problems: [
        'This change needs to change Winners Round 2 Match 1, but that match is currently being played.',
      ],
      changes: [],
      consequences: [],
    });
    renderDialog();

    await pick('Team 2', /^T7$/);
    await userEvent.click(screen.getByRole('button', { name: /review changes/i }));

    expect(screen.getByText(/that match is currently being played/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByRole('button', { name: /review changes/i })).toBeEnabled();
  });

  it('refuses the same team on both sides before review', async () => {
    wire(options());
    renderDialog();

    await pick('Team 2', /^T4$/);
    expect(screen.getByText("A team can't be on both sides of a match.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review changes/i })).toBeDisabled();
  });
});
