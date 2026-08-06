import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  RearrangeBoard,
  RearrangeSlotView,
  SnapshotSlot,
} from '@/services/brackets/manager/services/BracketAdmin/rearrange/types';

vi.mock('@/hooks/playoffs/usePlayoffRearrange', () => ({
  useLoserRearrangeBoard: vi.fn(),
  usePlayoffApplyRearrange: vi.fn(),
}));

import {
  useLoserRearrangeBoard,
  usePlayoffApplyRearrange,
} from '@/hooks/playoffs/usePlayoffRearrange';

import type { Arrangement } from '../rearrange/dropLogic';
import { dropFromDragEnd } from '../rearrange/dropLogic';
import RearrangeBracketDialog from '../RearrangeBracketDialog';

const T9 = 9;
const D1 = 21;
const D2 = 22;

const teamSlot = (participantId: number, overrides: Partial<SnapshotSlot> = {}): SnapshotSlot => ({
  shape: 'team',
  participantId,
  position: null,
  result: null,
  score: null,
  isOrigin: true,
  isDerived: false,
  ...overrides,
});

const byeSlot = (overrides: Partial<SnapshotSlot> = {}): SnapshotSlot => ({
  shape: 'bye',
  participantId: null,
  position: null,
  result: 'bye',
  score: null,
  isOrigin: true,
  isDerived: false,
  ...overrides,
});

const tbdSlot = (): SnapshotSlot => ({
  shape: 'tbd',
  participantId: null,
  position: null,
  result: null,
  score: null,
  isOrigin: false,
  isDerived: true,
});

const view = (
  matchId: number,
  side: 'opponent1' | 'opponent2',
  kind: RearrangeSlotView['kind'],
  participantId: number | null = null,
  participantName: string | null = null,
  autoNote: string | null = null
): RearrangeSlotView => ({ matchId, side, kind, participantId, participantName, autoNote });

/**
 * A trimmed 10-team-style losers bracket: round 1 holds T9's walkover and a
 * BYE-vs-BYE placeholder, round 2 holds two drop-ins against what round 1
 * sends up, round 3 is locked (still waiting). The snapshot is internally
 * consistent, so the dialog's real simulation runs against it.
 */
function fixtureBoard(): RearrangeBoard {
  return {
    bracketId: 'bracket-uuid-1',
    stageId: 1,
    rounds: [
      {
        roundNumber: 1,
        matches: [
          {
            matchId: 301,
            matchNumber: 1,
            roundNumber: 1,
            status: 0,
            locked: false,
            lockedReason: null,
            slots: [view(301, 'opponent1', 'bye'), view(301, 'opponent2', 'team', T9, 'T9')],
          },
          {
            matchId: 302,
            matchNumber: 2,
            roundNumber: 1,
            status: 0,
            locked: false,
            lockedReason: null,
            slots: [view(302, 'opponent1', 'bye'), view(302, 'opponent2', 'bye')],
          },
        ],
      },
      {
        roundNumber: 2,
        matches: [
          {
            matchId: 401,
            matchNumber: 1,
            roundNumber: 2,
            status: 2,
            locked: false,
            lockedReason: null,
            slots: [
              view(401, 'opponent1', 'team', D1, 'D1'),
              view(401, 'opponent2', 'derived', T9, 'T9', 'Filled automatically from Match 1'),
            ],
          },
          {
            matchId: 402,
            matchNumber: 2,
            roundNumber: 2,
            status: 0,
            locked: false,
            lockedReason: null,
            slots: [
              view(402, 'opponent1', 'team', D2, 'D2'),
              view(402, 'opponent2', 'derived', null, null, 'Filled automatically from Match 2'),
            ],
          },
        ],
      },
      {
        roundNumber: 3,
        matches: [
          {
            matchId: 501,
            matchNumber: 1,
            roundNumber: 3,
            status: 1,
            locked: true,
            lockedReason: 'is still waiting on a team from an earlier match',
            slots: [
              view(501, 'opponent1', 'derived', null, null, 'Filled automatically from Match 1'),
              view(501, 'opponent2', 'derived', D2, 'D2', 'Filled automatically from Match 2'),
            ],
          },
        ],
      },
    ],
    snapshot: {
      bracketId: 'bracket-uuid-1',
      stageId: 1,
      matches: [
        {
          id: 301,
          number: 1,
          roundNumber: 1,
          status: 0,
          editable: true,
          lockedReason: null,
          opponent1: byeSlot(),
          opponent2: teamSlot(T9, { position: 2, result: 'win' }),
        },
        {
          id: 302,
          number: 2,
          roundNumber: 1,
          status: 0,
          editable: true,
          lockedReason: null,
          opponent1: byeSlot(),
          opponent2: byeSlot(),
        },
        {
          id: 401,
          number: 1,
          roundNumber: 2,
          status: 2,
          editable: true,
          lockedReason: null,
          opponent1: teamSlot(D1, { position: 9 }),
          opponent2: teamSlot(T9, { isOrigin: false, isDerived: true }),
        },
        {
          id: 402,
          number: 2,
          roundNumber: 2,
          status: 0,
          editable: true,
          lockedReason: null,
          opponent1: teamSlot(D2, { position: 10, result: 'win' }),
          opponent2: byeSlot({ isOrigin: false, isDerived: true }),
        },
        {
          id: 501,
          number: 1,
          roundNumber: 3,
          status: 1,
          editable: false,
          lockedReason: 'is still waiting on a team from an earlier match',
          opponent1: tbdSlot(),
          opponent2: teamSlot(D2, { isOrigin: false, isDerived: true }),
        },
      ],
      landings: {
        301: { matchId: 401, side: 'opponent2' },
        302: { matchId: 402, side: 'opponent2' },
        401: { matchId: 501, side: 'opponent1' },
        402: { matchId: 501, side: 'opponent2' },
        501: null,
      },
      names: { [T9]: 'T9', [D1]: 'D1', [D2]: 'D2' },
    },
  };
}

const mutateMock = vi.fn();
const onOpenChange = vi.fn();

function wireBoard(board: RearrangeBoard | null, error: Error | null = null): void {
  vi.mocked(useLoserRearrangeBoard).mockReturnValue({
    data: board,
    isLoading: false,
    error,
  } as unknown as ReturnType<typeof useLoserRearrangeBoard>);
}

function renderDialog(initialWorking?: { arrangement: Arrangement; baseline: Arrangement }): void {
  render(
    <RearrangeBracketDialog
      open
      onOpenChange={onOpenChange}
      bracketId="bracket-uuid-1"
      initialWorking={initialWorking}
    />
  );
}

/** The fixture board's own occupancy of the movable spots. */
function fixtureBaseline(): Arrangement {
  return new Map<string, number | null>([
    ['301:opponent1', null],
    ['301:opponent2', T9],
    ['302:opponent1', null],
    ['302:opponent2', null],
    ['401:opponent1', D1],
    ['402:opponent1', D2],
  ]);
}

/** The edit state after dragging T9 from Match 1 into the placeholder. */
function workingWithT9Moved(): { arrangement: Arrangement; baseline: Arrangement } {
  return {
    arrangement: new Map<string, number | null>([
      ['301:opponent1', null],
      ['301:opponent2', null],
      ['302:opponent1', null],
      ['302:opponent2', T9],
      ['401:opponent1', D1],
      ['402:opponent1', D2],
    ]),
    baseline: fixtureBaseline(),
  };
}

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.mocked(usePlayoffApplyRearrange).mockReturnValue({
    mutate: mutateMock,
    isPending: false,
  } as unknown as ReturnType<typeof usePlayoffApplyRearrange>);
  mutateMock.mockClear();
  onOpenChange.mockClear();
});

describe('RearrangeBracketDialog', () => {
  it('renders rounds, movable teams, BYE spots, auto-filled notes, and locked reasons', () => {
    wireBoard(fixtureBoard());
    renderDialog();

    expect(screen.getByText('Losers Round 1')).toBeInTheDocument();
    expect(screen.getByText('Losers Round 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move T9' })).toBeInTheDocument();
    expect(screen.getAllByText('BYE — drop a team here').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('Filled automatically from Match 2').length).toBeGreaterThan(0);
    expect(
      screen.getByText('This match is still waiting on a team from an earlier match.')
    ).toBeInTheDocument();
    // Nothing moved yet: nothing to review or reset.
    expect(screen.getByRole('button', { name: /review changes/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('walks through review and saves the whole arrangement in one call', async () => {
    wireBoard(fixtureBoard());
    renderDialog(workingWithT9Moved());
    const user = userEvent.setup();

    // The live panel narrates the automatic knock-on changes.
    expect(
      screen.getByText('D1 has no opponent in Round 2 Match 1 and advances automatically.')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /review changes/i }));
    expect(
      screen.getByText('T9 moves from Round 1 Match 1 to Round 1 Match 2.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('T9 has no opponent in Round 1 Match 2 and advances automatically.')
    ).toBeInTheDocument();

    mutateMock.mockImplementation((_input, options) => options?.onSuccess?.());
    await user.click(screen.getByRole('button', { name: 'Save arrangement' }));

    expect(mutateMock).toHaveBeenCalledTimes(1);
    const { assignments, baseline } = mutateMock.mock.calls[0][0];
    expect(assignments).toContainEqual({ matchId: 302, side: 'opponent2', participantId: T9 });
    expect(assignments).toContainEqual({ matchId: 301, side: 'opponent2', participantId: null });
    expect(assignments).toHaveLength(6);
    // The concurrency token: the occupancy the screen was loaded with.
    expect(baseline).toContainEqual({ matchId: 301, side: 'opponent2', participantId: T9 });
    expect(baseline).toContainEqual({ matchId: 302, side: 'opponent2', participantId: null });
    expect(baseline).toHaveLength(6);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('sends the baseline captured at edit time, not one recomputed at save time', async () => {
    wireBoard(fixtureBoard());
    // The edit was started against an older board state: its captured
    // baseline differs from the current board's occupancy (D1 and D2 were
    // since swapped by someone else). The save must send the CAPTURED
    // occupancy so the server can refuse it — a baseline recomputed from the
    // fresh board would always match and let the stale edit through.
    const working = workingWithT9Moved();
    working.baseline.set('401:opponent1', D2);
    working.baseline.set('402:opponent1', D1);
    working.arrangement.set('401:opponent1', D2);
    working.arrangement.set('402:opponent1', D1);
    renderDialog(working);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /review changes/i }));
    await user.click(screen.getByRole('button', { name: 'Save arrangement' }));

    const { baseline } = mutateMock.mock.calls[0][0];
    expect(baseline).toContainEqual({ matchId: 401, side: 'opponent1', participantId: D2 });
    expect(baseline).toContainEqual({ matchId: 402, side: 'opponent1', participantId: D1 });
  });

  it('flags problems live and blocks review for an invalid arrangement', () => {
    wireBoard(fixtureBoard());
    // T9 placed twice: still in Match 1 AND dropped into the placeholder.
    const duplicated = workingWithT9Moved();
    duplicated.arrangement.set('301:opponent2', T9);
    renderDialog(duplicated);

    expect(
      screen.getByText('T9 is placed in 2 spots. Each team can only be in one spot.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review changes/i })).toBeDisabled();
  });

  it('shows the friendly empty state when nothing can be moved', () => {
    const board = fixtureBoard();
    for (const round of board.rounds) {
      for (const match of round.matches) {
        match.locked = true;
        match.slots = match.slots.map((slot) =>
          slot.kind === 'team' || slot.kind === 'bye' ? { ...slot, kind: 'locked' as const } : slot
        ) as typeof match.slots;
      }
    }
    wireBoard(board);
    renderDialog();
    expect(screen.getByText(/nothing can be moved right now/i)).toBeInTheDocument();
  });

  it('surfaces the service explanation when the board cannot load', () => {
    wireBoard(null, new Error('Teams can only be rearranged in a double-elimination bracket.'));
    renderDialog();
    expect(
      screen.getByText('Teams can only be rearranged in a double-elimination bracket.')
    ).toBeInTheDocument();
  });

  it('wires each spot to its drag/drop id, and drag-end maps onto a drop', () => {
    wireBoard(fixtureBoard());
    renderDialog();

    // The cells carry the slot keys the drop handler trades occupants by.
    expect(screen.getByTestId('slot-301:opponent2')).toContainElement(
      screen.getByRole('button', { name: 'Move T9' })
    );
    expect(screen.getByTestId('slot-302:opponent1')).toHaveTextContent('BYE — drop a team here');

    // The dnd-kit event → drop mapping used by the board.
    const over = (id: string | null) => (id === null ? null : { id });
    expect(
      dropFromDragEnd({ active: { id: '301:opponent2' }, over: over('302:opponent1') } as never)
    ).toEqual(['301:opponent2', '302:opponent1']);
    expect(
      dropFromDragEnd({ active: { id: '301:opponent2' }, over: over('301:opponent2') } as never)
    ).toBeNull();
    expect(
      dropFromDragEnd({ active: { id: '301:opponent2' }, over: over(null) } as never)
    ).toBeNull();
  });
});
