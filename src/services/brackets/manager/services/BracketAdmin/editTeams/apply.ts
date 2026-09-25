import { BusinessLogicError, ServiceError, ValidationError } from '@/types/errors';
import { bracketLog, failureLog, successLog } from '@/utils/logger';

import { computeStageSlotLayout } from '../../../utils/lbFeederMarkers';
import { markBracketCompleteIfDone } from '../../BracketUpdate/completion';
import type { TeamSummary } from '../participants';
import { ensureParticipantRow, lookupTeam } from '../participants';
import type { MatchUpdateFields, OpponentSide } from '../shapes';
import type { BracketAdminDeps, EditMatchParticipantsResult } from '../types';
import { updateMatchRowOrThrow } from '../writes';
import type { EditTeamsContext } from './context';
import { loadEditTeamsContext } from './context';
import { assertFootprint } from './footprint';
import { planOccupancy } from './occupancy';
import {
  isWinnersRoundOne,
  matchLabel,
  occupantId,
  occupantOf,
  SIDES,
  winnersRoundOneBlockReason,
} from './rules';
import type { EditMatchTeamsParams, Occupant, TeamChoice } from './types';
import type { PlannedWrite } from './winnersPlan';
import { planWinnersChanges } from './winnersPlan';

const STALE_MESSAGE =
  'This match changed since Edit teams was opened. Close it and open it again to continue.';
const NOT_SAVED_MESSAGE = 'Not saved — only admins can edit brackets. Nothing was changed.';

const expectedIdOf = (params: EditMatchTeamsParams, side: OpponentSide): number | null =>
  side === 'opponent1' ? params.expectedOpponent1Id : params.expectedOpponent2Id;

function assertEditableMatch(ctx: EditTeamsContext): void {
  const { match, stage } = ctx;
  if (stage.type !== 'single_elimination' && stage.type !== 'double_elimination') {
    throw new ValidationError('Edit teams only works in elimination brackets.');
  }
  if ((stage.settings as { skipFirstRound?: boolean }).skipFirstRound === true) {
    throw new ValidationError("Edit teams doesn't support this bracket's layout.");
  }
  if (!isWinnersRoundOne(ctx, match)) {
    throw new ValidationError(
      'Edit teams only works on first-round matches of the winners bracket. ' +
        'Later matches fill in from the results of earlier ones.'
    );
  }
  if ((match.child_count ?? 0) > 0) {
    throw new ValidationError("This match has several games, so Edit teams can't change it.");
  }
  const blocked = winnersRoundOneBlockReason(match);
  if (blocked) throw new BusinessLogicError(`This match ${blocked}, so its teams can't change.`);
}

/**
 * Resolve a pick to an occupant. A team not in the bracket yet gets a
 * placeholder (negative) participant id: its real participant row is only
 * inserted once every check has passed.
 */
async function resolvePick(
  ctx: EditTeamsContext,
  choice: TeamChoice,
  placeholderId: number,
  newTeams: Map<number, TeamSummary>
): Promise<Occupant> {
  if (choice.kind === 'bye') return { kind: 'bye' };
  const participant = ctx.participants.find((p) => p.team_id === choice.teamId);
  if (participant) {
    return { kind: 'team', participantId: participant.id, name: participant.name ?? 'The team' };
  }
  const team = await lookupTeam(choice.teamId);
  newTeams.set(placeholderId, team);
  return { kind: 'team', participantId: placeholderId, name: team.name };
}

/** Swap placeholder participant ids for the real ones in a planned write. */
function withRealIds(write: PlannedWrite, realIds: Map<number, number>): PlannedWrite {
  const fields: MatchUpdateFields = { ...write.fields };
  for (const side of SIDES) {
    const key = `${side}_id` as const;
    const id = fields[key];
    if (typeof id === 'number' && realIds.has(id)) fields[key] = realIds.get(id);
  }
  return { matchId: write.matchId, fields };
}

/**
 * Admin operation: change who plays in a winners-bracket round 1 match — a
 * team for another team, a team for a BYE, or a BYE for a team.
 *
 * Every check runs before the first write: the match must be an unplayed
 * round 1 match that still holds what the screen was opened with, and every
 * picked team must not already play in another match. The plan then covers
 * the knock-on changes too — a walkover's team moving on to round 2 by itself,
 * or a team taken back out of round 2 when its BYE goes — and is replayed on
 * a copy of the stage to prove no team ends up in two matches.
 *
 * Writes run one at a time, knock-on changes first and the edited match last.
 * The plan is declarative, so if a write fails part-way the edited match
 * still holds its old teams and saving the same edit again finishes the job
 * (Repair Bracket does not reconcile these links). A write that reaches no
 * row — row-level security for a non-admin — fails loudly.
 */
export async function editMatchTeams(
  deps: BracketAdminDeps,
  params: EditMatchTeamsParams
): Promise<EditMatchParticipantsResult> {
  bracketLog('Admin Edit teams requested', { ...params });

  try {
    const ctx = await loadEditTeamsContext(deps, params.matchId);
    const { match, stage } = ctx;
    assertEditableMatch(ctx);

    if (
      SIDES.some((side) => occupantId(occupantOf(ctx, match[side])) !== expectedIdOf(params, side))
    ) {
      throw new BusinessLogicError(STALE_MESSAGE);
    }

    if (
      params.opponent1.kind === 'team' &&
      params.opponent2.kind === 'team' &&
      params.opponent1.teamId === params.opponent2.teamId
    ) {
      throw new ValidationError("A team can't be on both sides of a match.");
    }
    const newTeams = new Map<number, TeamSummary>();
    const [pick1, pick2] = await Promise.all([
      resolvePick(ctx, params.opponent1, -1, newTeams),
      resolvePick(ctx, params.opponent2, -2, newTeams),
    ]);

    const wanted = planOccupancy(ctx, { opponent1: pick1, opponent2: pick2 });
    const layout = await computeStageSlotLayout(stage);
    const winners = planWinnersChanges(ctx, wanted, layout.wbRoundOneSeedOf);
    if (stage.type === 'double_elimination' && winners.byeChanges.length > 0) {
      throw new BusinessLogicError(
        'Adding or removing a BYE in a double-elimination bracket is not available yet.'
      );
    }

    // The edited match is written last, so an interrupted edit can be saved again.
    const editedWrites = winners.roundOneWrites.filter((write) => write.matchId === match.id);
    const writes = [
      ...winners.roundTwoWrites,
      ...winners.roundOneWrites.filter((write) => write.matchId !== match.id),
      ...editedWrites,
    ];
    assertFootprint(ctx, wanted, writes);

    // Every check passed: now it is safe to write.
    const realIds = new Map<number, number>();
    for (const [placeholderId, team] of newTeams) {
      realIds.set(
        placeholderId,
        await ensureParticipantRow(stage.tournament_id, team, ctx.participants)
      );
    }
    const partialMessage =
      `Only part of this change was saved. Open Edit teams on ${matchLabel(ctx, match)} ` +
      'again and save the same teams to finish.';
    for (const [index, write] of writes.map((w) => withRealIds(w, realIds)).entries()) {
      await updateMatchRowOrThrow(
        write.matchId,
        write.fields,
        index === 0 ? NOT_SAVED_MESSAGE : partialMessage
      );
    }
    await markBracketCompleteIfDone({ storage: deps.storage }, stage.tournament_id);

    const nameOf = (occupant: Occupant) => (occupant.kind === 'team' ? occupant.name : 'BYE');
    const message = [
      `${matchLabel(ctx, match)} is now ${nameOf(pick1)} vs ${nameOf(pick2)}.`,
      ...winners.consequences,
    ].join(' ');
    const idOf = (occupant: Occupant) => {
      const id = occupantId(occupant);
      return id === null ? null : (realIds.get(id) ?? id);
    };
    successLog(`Admin edited the teams of match ${match.id}`, message);
    return {
      matchId: match.id,
      opponent1_id: idOf(pick1),
      opponent2_id: idOf(pick2),
      message,
    };
  } catch (error) {
    failureLog('Admin Edit teams failed', error);
    if (error instanceof ServiceError) throw error;
    throw new BusinessLogicError(
      `Failed to edit match teams: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error
    );
  }
}
