import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BracketAdminDeps } from '../../types';
import { editMatchTeams } from '../apply';

const mocks = vi.hoisted(() => ({
  plan: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../plan', () => ({
  planEdit: mocks.plan,
  STALE_MESSAGE: 'stale message',
}));
vi.mock('../../writes', () => ({ updateMatchRowOrThrow: mocks.update }));
vi.mock('../../participants', () => ({ ensureParticipantRow: vi.fn() }));
vi.mock('../../../BracketUpdate/completion', () => ({
  markBracketCompleteIfDone: vi.fn().mockResolvedValue(undefined),
}));

const deps = { storage: {} } as unknown as BracketAdminDeps;
const params = {
  matchId: 4,
  opponent1: { kind: 'bye' },
  opponent2: { kind: 'bye' },
  expectedOpponent1Id: null,
  expectedOpponent2Id: null,
} as never;

const matchRow = (id: number, status: number) => ({
  id,
  status,
  number: id,
  group_id: 1,
  round_id: 1,
  opponent1: null,
  opponent2: null,
});

beforeEach(() => {
  mocks.update.mockResolvedValue(undefined);
});

describe('editMatchTeams write guard', () => {
  it('guards each write with the status the plan was checked against', async () => {
    mocks.plan.mockResolvedValue({
      ctx: {
        match: matchRow(4, 2),
        stage: { tournament_id: 'b1' },
        stageMatches: [matchRow(3, 1), matchRow(4, 2)],
        groupNumberById: new Map([[1, 1]]),
        roundNumberById: new Map([[1, 1]]),
        participants: [],
      },
      wanted: [{ opponent1: { kind: 'bye' }, opponent2: { kind: 'bye' } }],
      writes: [
        { matchId: 3, fields: { opponent2_id: 9 } },
        { matchId: 4, fields: { opponent1_id: 9 } },
      ],
      newTeams: new Map(),
      changes: [],
      consequences: [],
    });

    await editMatchTeams(deps, params);

    expect(mocks.update).toHaveBeenNthCalledWith(
      1,
      3,
      expect.anything(),
      expect.any(String),
      expect.objectContaining({ expectedStatus: 1, staleMessage: 'stale message' })
    );
    expect(mocks.update).toHaveBeenNthCalledWith(
      2,
      4,
      expect.anything(),
      expect.any(String),
      expect.objectContaining({ expectedStatus: 2 })
    );
  });

  // The context reads the edited match first and the stage's matches later. A
  // scoring between the two reads leaves ctx.match unplayed (what the plan
  // checked) and stageMatches played. The guard must use the checked status.
  it('guards the edited match with the status it was checked at, not a later read', async () => {
    mocks.plan.mockResolvedValue({
      ctx: {
        match: matchRow(4, 2),
        stage: { tournament_id: 'b1' },
        stageMatches: [matchRow(4, 4)],
        groupNumberById: new Map([[1, 1]]),
        roundNumberById: new Map([[1, 1]]),
        participants: [],
      },
      wanted: [{ opponent1: { kind: 'bye' }, opponent2: { kind: 'bye' } }],
      writes: [{ matchId: 4, fields: { opponent1_id: 9 } }],
      newTeams: new Map(),
      changes: [],
      consequences: [],
    });

    await editMatchTeams(deps, params);

    expect(mocks.update).toHaveBeenCalledWith(
      4,
      expect.anything(),
      expect.any(String),
      expect.objectContaining({ expectedStatus: 2 })
    );
  });
});
