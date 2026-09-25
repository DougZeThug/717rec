import { BusinessLogicError, ValidationError } from '@/types/errors';

import { computeStageSlotLayout } from '../../../utils/lbFeederMarkers';
import type { TeamSummary } from '../participants';
import { lookupTeam } from '../participants';
import { loadRearrangeBoard } from '../rearrange/board';
import type { OpponentSide } from '../shapes';
import type { BracketAdminDeps } from '../types';
import type { EditTeamsContext } from './context';
import { loadEditTeamsContext } from './context';
import { assertFootprint } from './footprint';
import { planLosersChanges } from './losersPlan';
import type { WantedMatch } from './occupancy';
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

/** A fully checked edit, ready to write: nothing in it has touched the database. */
export interface EditPlan {
  ctx: EditTeamsContext;
  wanted: WantedMatch[];
  /** In write order: losers bracket, round 2, trade partner, the edited match last. */
  writes: PlannedWrite[];
  /** Teams new to the bracket, by the placeholder participant id the writes use. */
  newTeams: Map<number, TeamSummary>;
  /** "Winners Round 1 Match 2 is now T4 vs BYE." — one line per changed round 1 match. */
  changes: string[];
  /** The automatic knock-on changes, in plain language. */
  consequences: string[];
}

/** Refuse a match Edit teams can never change, whatever the admin picks. */
export function assertEditableMatch(ctx: EditTeamsContext): void {
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

/** The winners round 1 match a team sits in, or null when it is in none. */
export function roundOneLocationOf(ctx: EditTeamsContext, teamId: string): number | null {
  const participant = ctx.participants.find((p) => p.team_id === teamId);
  if (!participant) return null;
  const home = ctx.stageMatches.find(
    (candidate) =>
      isWinnersRoundOne(ctx, candidate) &&
      SIDES.some((side) => candidate[side]?.id === participant.id)
  );
  return home?.id ?? null;
}

const expectedIdOf = (params: EditMatchTeamsParams, side: OpponentSide): number | null =>
  side === 'opponent1' ? params.expectedOpponent1Id : params.expectedOpponent2Id;

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

/**
 * Check an edit completely and plan every write, without writing anything —
 * the same function backs the review screen and the save, so what the admin
 * reviews is exactly what gets written. Throws the plain-language reason when
 * the edit is refused.
 */
export async function planEdit(
  deps: BracketAdminDeps,
  params: EditMatchTeamsParams
): Promise<EditPlan> {
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

  for (const choice of [params.opponent1, params.opponent2]) {
    if (choice.kind !== 'team' || !params.expectedPickLocations) continue;
    if (!(choice.teamId in params.expectedPickLocations)) continue;
    if (roundOneLocationOf(ctx, choice.teamId) !== params.expectedPickLocations[choice.teamId]) {
      throw new BusinessLogicError(STALE_MESSAGE);
    }
  }

  const wanted = planOccupancy(ctx, { opponent1: pick1, opponent2: pick2 });
  const [layout, board] = await Promise.all([
    computeStageSlotLayout(stage),
    stage.type === 'double_elimination'
      ? loadRearrangeBoard(deps, stage.tournament_id)
      : Promise.resolve(null),
  ]);
  const winners = planWinnersChanges(ctx, wanted, layout.wbRoundOneSeedOf);
  const losers = board
    ? planLosersChanges(
        ctx,
        board.snapshot,
        wanted,
        new Set(winners.byeChanges.map((change) => change.match.id))
      )
    : { writes: [], consequences: [] };

  // The edited match is written last, so an interrupted edit can be saved again.
  const writes = [
    ...losers.writes,
    ...winners.roundTwoWrites,
    ...winners.roundOneWrites.filter((write) => write.matchId !== match.id),
    ...winners.roundOneWrites.filter((write) => write.matchId === match.id),
  ];
  assertFootprint(ctx, wanted, writes);

  const nameOf = (occupant: Occupant) => (occupant.kind === 'team' ? occupant.name : 'BYE');
  return {
    ctx,
    wanted,
    writes,
    newTeams,
    changes: wanted.map(
      (entry) =>
        `${matchLabel(ctx, entry.match)} is now ${nameOf(entry.opponent1)} vs ${nameOf(entry.opponent2)}.`
    ),
    consequences: [...winners.consequences, ...losers.consequences],
  };
}
