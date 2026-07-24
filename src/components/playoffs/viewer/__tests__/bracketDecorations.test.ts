import { beforeEach, describe, expect, it } from 'vitest';

import type {
  BracketGroupRow,
  BracketRoundRow,
  ViewerMatch,
  ViewerParticipant,
} from '@/services/brackets/viewer/types';

import {
  BracketDecorationData,
  buildParticipantSeedMap,
  decorateBracketDom,
  SEED_BADGE_CLASS,
} from '../bracketDecorations';

type Opponent = NonNullable<ViewerMatch['opponent1']>;

const makeOpponent = (id: number | null, extra: Partial<Opponent> = {}): Opponent => ({
  id,
  ...extra,
});

const makeMatch = (
  id: number,
  round_id: number,
  number: number,
  opponent1: ViewerMatch['opponent1'],
  opponent2: ViewerMatch['opponent2'],
  overrides: Partial<ViewerMatch> = {}
): ViewerMatch => ({
  id,
  stage_id: 1,
  group_id: 1,
  round_id,
  number,
  status: 'ready',
  opponent1,
  opponent2,
  ...overrides,
});

const makeParticipant = (id: number, name: string, position?: number): ViewerParticipant => ({
  id,
  tournament_id: 1,
  name,
  ...(position !== undefined ? { position } : {}),
});

// ─── Data fixture: 4-team single elim (two semis feeding a final) ────────────

const groups: BracketGroupRow[] = [{ id: 1, stage_id: 1, number: 1 }];
const rounds: BracketRoundRow[] = [
  { id: 1, group_id: 1, number: 1 },
  { id: 2, group_id: 1, number: 2 },
];

const makeData = (overrides: Partial<BracketDecorationData> = {}): BracketDecorationData => ({
  matches: [
    makeMatch(1, 1, 1, makeOpponent(101), makeOpponent(102)),
    makeMatch(2, 1, 2, makeOpponent(103), makeOpponent(104)),
    makeMatch(
      3,
      2,
      1,
      makeOpponent(null, { source_node_id: '1', source_type: 'winner' }),
      makeOpponent(null, { source_node_id: '2', source_type: 'winner' }),
      { status: 'locked' }
    ),
  ],
  groups,
  rounds,
  participants: [
    makeParticipant(101, 'Team A', 1),
    makeParticipant(102, 'Team B', 4),
    makeParticipant(103, 'Team C', 2),
    makeParticipant(104, 'Team D', 3),
  ],
  stageType: 'single_elimination',
  ...overrides,
});

// ─── DOM fixture mirroring brackets-viewer output ────────────────────────────

interface SlotSpec {
  participantId?: number;
  name?: string;
  nameClass?: string;
  slotClass?: string;
}

let container: HTMLElement;

const appendMatchDom = (matchId: number | string, slots: SlotSpec[]): HTMLElement => {
  const match = document.createElement('div');
  match.className = 'match';
  match.setAttribute('data-match-id', String(matchId));

  for (const slot of slots) {
    const participant = document.createElement('div');
    participant.className = `participant${slot.slotClass ? ` ${slot.slotClass}` : ''}`;
    if (slot.participantId !== undefined) {
      participant.setAttribute('data-participant-id', String(slot.participantId));
    }
    const name = document.createElement('div');
    name.className = `name${slot.nameClass ? ` ${slot.nameClass}` : ''}`;
    if (slot.name) name.textContent = slot.name;
    participant.appendChild(name);
    match.appendChild(participant);
  }

  container.appendChild(match);
  return match;
};

const namesOf = (matchEl: HTMLElement): HTMLElement[] =>
  Array.from(matchEl.querySelectorAll<HTMLElement>('.name'));

beforeEach(() => {
  container = document.createElement('div');
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('decorateBracketDom', () => {
  it('injects hint class, title and text into empty TBD slots', () => {
    const finalEl = appendMatchDom(3, [{}, {}]);

    decorateBracketDom(container, makeData());

    const [top, bottom] = namesOf(finalEl);
    expect(top.textContent).toBe('Winner of Semi 1');
    expect(top.classList.contains('hint')).toBe(true);
    expect(top.title).toBe('Winner of Semi 1');
    expect(bottom.textContent).toBe('Winner of Semi 2');
  });

  it('adds a seed badge to filled slots without a native origin badge', () => {
    const semiEl = appendMatchDom(1, [
      { participantId: 101, name: 'Team A' },
      { participantId: 102, name: 'Team B' },
    ]);

    decorateBracketDom(container, makeData());

    const [top, bottom] = namesOf(semiEl);
    expect(top.textContent).toBe('#1 Team A');
    expect(top.querySelector(`.${SEED_BADGE_CLASS}`)?.textContent).toBe('#1 ');
    expect(bottom.textContent).toBe('#4 Team B');
  });

  it('is idempotent across repeated runs', () => {
    const finalEl = appendMatchDom(3, [{}, {}]);
    const semiEl = appendMatchDom(1, [
      { participantId: 101, name: 'Team A' },
      { participantId: 102, name: 'Team B' },
    ]);

    const data = makeData();
    decorateBracketDom(container, data);
    decorateBracketDom(container, data);

    expect(namesOf(finalEl)[0].textContent).toBe('Winner of Semi 1');
    expect(namesOf(semiEl)[0].querySelectorAll(`.${SEED_BADGE_CLASS}`)).toHaveLength(1);
    expect(namesOf(semiEl)[0].textContent).toBe('#1 Team A');
  });

  it('skips slots whose data opponent carries a position (native WB R1 badge)', () => {
    const data = makeData({
      matches: [
        makeMatch(1, 1, 1, makeOpponent(101, { position: 1 }), makeOpponent(102, { position: 4 })),
        makeMatch(2, 1, 2, makeOpponent(103), makeOpponent(104)),
        makeMatch(3, 2, 1, makeOpponent(null), makeOpponent(null), { status: 'locked' }),
      ],
    });
    const semiEl = appendMatchDom(1, [
      { participantId: 101, name: '#1 Team A' },
      { participantId: 102, name: '#4 Team B' },
    ]);

    decorateBracketDom(container, data);

    expect(namesOf(semiEl)[0].querySelector(`.${SEED_BADGE_CLASS}`)).toBeNull();
    expect(namesOf(semiEl)[0].textContent).toBe('#1 Team A');
  });

  it('leaves native hints, byes, and non-empty name cells untouched', () => {
    const nativeHintEl = appendMatchDom(3, [
      { nameClass: 'hint', name: 'Seed 3' },
      { slotClass: 'bye', name: '' },
    ]);

    decorateBracketDom(container, makeData());

    const [hinted, bye] = namesOf(nativeHintEl);
    expect(hinted.textContent).toBe('Seed 3');
    expect(bye.textContent).toBe('');
    expect(bye.classList.contains('hint')).toBe(false);
  });

  it('skips filled slots whose participant has no stored seed', () => {
    const semiEl = appendMatchDom(1, [
      { participantId: 101, name: 'Team A' },
      { participantId: 102, name: 'Team B' },
    ]);

    decorateBracketDom(
      container,
      makeData({
        participants: [makeParticipant(101, 'Team A'), makeParticipant(102, 'Team B')],
      })
    );

    expect(namesOf(semiEl)[0].querySelector(`.${SEED_BADGE_CLASS}`)).toBeNull();
    expect(namesOf(semiEl)[0].textContent).toBe('Team A');
  });

  it('no-ops for data missing groups or rounds and for unknown match ids', () => {
    const knownEl = appendMatchDom(3, [{}, {}]);
    decorateBracketDom(container, makeData({ groups: undefined }));
    decorateBracketDom(container, makeData({ rounds: [] }));
    expect(namesOf(knownEl)[0].textContent).toBe('');

    const unknownEl = appendMatchDom(999, [{}, {}]);
    decorateBracketDom(container, makeData());
    expect(namesOf(unknownEl)[0].textContent).toBe('');
    expect(namesOf(unknownEl)[0].classList.contains('hint')).toBe(false);
  });
});

describe('buildParticipantSeedMap', () => {
  it('maps only participants with a stored position', () => {
    const seeds = buildParticipantSeedMap([
      makeParticipant(101, 'Team A', 1),
      makeParticipant(102, 'Team B'),
      makeParticipant(103, 'Team C', 3),
    ]);

    expect(seeds.get(101)).toBe(1);
    expect(seeds.has(102)).toBe(false);
    expect(seeds.get(103)).toBe(3);
  });

  it('returns an empty map for missing participant data', () => {
    expect(buildParticipantSeedMap(undefined).size).toBe(0);
  });
});
