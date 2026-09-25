import { BusinessLogicError, ServiceError, ValidationError } from '@/types/errors';
import { bracketLog, failureLog, successLog } from '@/utils/logger';

import { markBracketCompleteIfDone } from '../../BracketUpdate/completion';
import type { TeamSummary } from '../participants';
import { ensureParticipantRow, lookupTeam } from '../participants';
import type { MatchUpdateFields, OpponentSide } from '../shapes';
import { shapeOf, slotFields } from '../shapes';
import type { BracketAdminDeps, EditMatchParticipantsResult } from '../types';
import { updateMatchRowOrThrow } from '../writes';
import type { EditTeamsContext } from './context';
import { loadEditTeamsContext } from './context';
import {
  findParticipantElsewhere,
  isWinnersRoundOne,
  matchLabel,
  winnersRoundOneBlockReason,
} from './rules';
import type { EditMatchTeamsParams, TeamChoice } from './types';

const SIDES: OpponentSide[] = ['opponent1', 'opponent2'];

const STALE_MESSAGE =
  'This match changed since Edit teams was opened. Close it and open it again to continue.';
const NOT_SAVED_MESSAGE = 'Not saved — only admins can edit brackets. Nothing was changed.';

/** A picked team, resolved against the bracket before anything is written. */
interface ResolvedTeam {
  team: TeamSummary;
  /** The team's participant id, or null when it is not in the bracket yet. */
  participantId: number | null;
}

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
  if (SIDES.some((side) => shapeOf(match[side]) !== 'team')) {
    throw new BusinessLogicError(
      'This match has a BYE or an empty spot. Changing BYEs with Edit teams is not available yet.'
    );
  }
}

async function resolveChoice(ctx: EditTeamsContext, choice: TeamChoice): Promise<ResolvedTeam> {
  if (choice.kind === 'bye') {
    throw new ValidationError('Choosing a BYE is not available yet.');
  }
  const participant = ctx.participants.find((p) => p.team_id === choice.teamId);
  if (participant) {
    return {
      team: { id: choice.teamId, name: participant.name ?? 'The team' },
      participantId: participant.id,
    };
  }
  return { team: await lookupTeam(choice.teamId), participantId: null };
}

/**
 * Admin operation: change the teams of a winners-bracket round 1 match — the
 * seeding fix this tool exists for.
 *
 * Every check runs before the first write: the match must be an unplayed
 * round 1 match with a real team on each side, still hold the teams the
 * screen was opened with, and every picked team must not already sit in
 * another match. Only then is a participant row created for a team new to
 * the bracket and the match rewritten — ids, cleared scores and results, and
 * the slot's own feeder marker. A write that reaches no row (row-level
 * security for a non-admin) fails loudly instead of reporting success.
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

    if (SIDES.some((side) => (match[side]?.id ?? null) !== expectedIdOf(params, side))) {
      throw new BusinessLogicError(STALE_MESSAGE);
    }

    const [resolved1, resolved2] = await Promise.all([
      resolveChoice(ctx, params.opponent1),
      resolveChoice(ctx, params.opponent2),
    ]);
    if (resolved1.team.id === resolved2.team.id) {
      throw new ValidationError("A team can't be on both sides of a match.");
    }
    const resolved: Record<OpponentSide, ResolvedTeam> = {
      opponent1: resolved1,
      opponent2: resolved2,
    };

    for (const side of SIDES) {
      const { participantId, team } = resolved[side];
      if (participantId === null) continue;
      const elsewhere = findParticipantElsewhere(ctx, participantId, [match.id]);
      if (elsewhere) {
        throw new BusinessLogicError(
          `${team.name} is already in ${matchLabel(ctx, elsewhere)}. A team can only be in one match.`
        );
      }
    }

    if (SIDES.every((side) => resolved[side].participantId === match[side]?.id)) {
      throw new ValidationError('Nothing to change — those teams are already in this match.');
    }

    // Every check passed: now it is safe to write.
    const ids = {} as Record<OpponentSide, number>;
    for (const side of SIDES) {
      ids[side] =
        resolved[side].participantId ??
        (await ensureParticipantRow(stage.tournament_id, resolved[side].team, ctx.participants));
    }

    const fields: MatchUpdateFields = { status: 2 };
    for (const side of SIDES) {
      Object.assign(
        fields,
        slotFields(side, {
          id: ids[side],
          position: match[side]?.position ?? null,
          score: null,
          result: null,
        })
      );
    }
    await updateMatchRowOrThrow(match.id, fields, NOT_SAVED_MESSAGE);
    await markBracketCompleteIfDone({ storage: deps.storage }, stage.tournament_id);

    successLog(
      `Admin edited the teams of match ${match.id}`,
      `opponent1_id=${ids.opponent1}, opponent2_id=${ids.opponent2}`
    );
    return {
      matchId: match.id,
      opponent1_id: ids.opponent1,
      opponent2_id: ids.opponent2,
      message: `${matchLabel(ctx, match)} is now ${resolved1.team.name} vs ${resolved2.team.name}.`,
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
