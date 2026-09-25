import { ensureFound } from '@/utils/errorHandler';

import type {
  StorageGroup,
  StorageMatch,
  StorageParticipant,
  StorageRound,
  StorageStage,
} from '../../../types/BracketServiceTypes';
import type { BracketAdminDeps } from '../types';

const asArray = <T>(value: T | T[] | null): T[] =>
  Array.isArray(value) ? value : value ? [value] : [];

/** Everything Edit teams reads, loaded once through the storage adapter. */
export interface EditTeamsContext {
  match: StorageMatch;
  stage: StorageStage;
  /** Group number (1 winners, 2 losers or third place, 3 grand final) per group id. */
  groupNumberById: Map<number, number>;
  /** Round number within its group, per round id. */
  roundNumberById: Map<number, number>;
  /** Every match of the stage, ascending by id. */
  stageMatches: StorageMatch[];
  participants: StorageParticipant[];
}

export async function loadEditTeamsContext(
  deps: BracketAdminDeps,
  matchId: number
): Promise<EditTeamsContext> {
  const match = ensureFound(
    (await deps.storage.select('match', matchId)) as StorageMatch | null,
    'Match',
    String(matchId)
  );

  const stage = ensureFound(
    (await deps.storage.select('stage', match.stage_id)) as unknown as StorageStage | null,
    'Stage',
    String(match.stage_id)
  );

  const [groups, rounds, stageMatches, participants] = await Promise.all([
    deps.storage.select('group', { stage_id: stage.id }),
    deps.storage.select('round', { stage_id: stage.id }),
    deps.storage.select('match', { stage_id: stage.id }),
    deps.storage.select('participant', { tournament_id: stage.tournament_id }),
  ]);

  return {
    match,
    stage,
    groupNumberById: new Map(
      asArray(groups as StorageGroup[] | null).map((group) => [group.id, group.number])
    ),
    roundNumberById: new Map(
      asArray(rounds as StorageRound[] | null).map((round) => [round.id, round.number])
    ),
    stageMatches: asArray(stageMatches as StorageMatch[] | null).sort((a, b) => a.id - b.id),
    participants: asArray(participants as StorageParticipant[] | null),
  };
}
