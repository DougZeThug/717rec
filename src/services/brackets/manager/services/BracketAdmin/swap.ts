import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError, ValidationError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, errorLog, successLog } from '@/utils/logger';

import type {
  StorageGroup,
  StorageMatch,
  StorageParticipant,
  StorageRound,
  StorageStage,
} from '../../types/BracketServiceTypes';
import { markBracketCompleteIfDone } from '../BracketUpdate/completion';
import type { NextRoundTarget } from './placement';
import {
  applyWinnerPlacement,
  findNextRoundMatch,
  resolveWinnerPlacement,
  slotState,
} from './placement';
import type { MatchUpdateFields, OpponentSide } from './shapes';
import {
  destinationBlockReason,
  idField,
  matchBlockReason,
  otherSide,
  resultFields,
  shapeOf,
  slotFields,
  winnerSideOf,
} from './shapes';
import type { BracketAdminDeps } from './types';

export interface SwapLoserSlotsParams {
  sourceMatchId: number;
  sourceSide: OpponentSide;
  targetMatchId: number;
  targetSide: OpponentSide;
}

export interface SwapLoserSlotsResult {
  sourceMatchId: number;
  targetMatchId: number;
  /** Matches that became team-vs-BYE and were auto-completed as walkovers. */
  walkoverCompletedMatchIds: number[];
  /** Next-round matches from which a stale walkover winner was removed. */
  downstreamClearedMatchIds: number[];
  message: string;
}

export interface LoserSwapSlot {
  matchId: number;
  matchNumber: number;
  side: OpponentSide;
  participantId: number | null;
  participantName: string | null;
  isBye: boolean;
  /** True when the other slot of the same match is a stored BYE. */
  partnerIsBye: boolean;
  /** Name of the team in the other slot of the same match, when there is one. */
  partnerName: string | null;
}

export interface LoserSwapEligibilityResult {
  ok: boolean;
  reason?: string;
  roundNumber?: number;
  /** The clicked match's movable (real-team) slots. */
  slots?: LoserSwapSlot[];
  /** Slots in sibling same-round matches available to swap with. */
  candidates?: LoserSwapSlot[];
}

interface RoundContext {
  stage: StorageStage;
  group: StorageGroup;
  round: StorageRound;
  match: StorageMatch;
  roundMatches: StorageMatch[];
}

async function loadRoundContext(
  deps: BracketAdminDeps,
  matchId: number
): Promise<{ context?: RoundContext; reason?: string }> {
  const match = (await deps.storage.select('match', matchId)) as StorageMatch | null;
  if (!match) return { reason: `Match ${matchId} not found` };

  const round = (await deps.storage.select(
    'round',
    match.round_id
  )) as unknown as StorageRound | null;
  if (!round) return { reason: 'Round not found' };

  const group = (await deps.storage.select(
    'group',
    round.group_id
  )) as unknown as StorageGroup | null;
  if (!group) return { reason: 'Group not found' };

  const stage = (await deps.storage.select(
    'stage',
    match.stage_id
  )) as unknown as StorageStage | null;
  if (!stage) return { reason: 'Stage not found' };

  const roundMatchesRaw = await deps.storage.select('match', { round_id: round.id });
  const roundMatches = (
    Array.isArray(roundMatchesRaw) ? roundMatchesRaw : roundMatchesRaw ? [roundMatchesRaw] : []
  ) as StorageMatch[];
  roundMatches.sort((a, b) => a.number - b.number);

  return { context: { stage, group, round, match, roundMatches } };
}

async function loadParticipantNames(
  deps: BracketAdminDeps,
  tournamentId: string
): Promise<Map<number, string | null>> {
  const raw = await deps.storage.select('participant', { tournament_id: tournamentId });
  const list = (Array.isArray(raw) ? raw : raw ? [raw] : []) as StorageParticipant[];
  return new Map(list.map((participant) => [participant.id, participant.name ?? null]));
}

/**
 * Can this losers-bracket match take part in a same-round team swap, and if so,
 * which of its teams can move and which sibling slots can they trade with?
 * Never throws — the UI shows/hides the action off this result.
 */
export async function checkLoserSwapEligibility(
  deps: BracketAdminDeps,
  matchId: number
): Promise<LoserSwapEligibilityResult> {
  try {
    const { context, reason } = await loadRoundContext(deps, matchId);
    if (!context) return { ok: false, reason };
    const { stage, group, round, match, roundMatches } = context;

    if (stage.type !== 'double_elimination') {
      return { ok: false, reason: 'Team swaps are only available in double-elimination brackets.' };
    }
    if (group.number !== 2) {
      return { ok: false, reason: 'Teams can only be swapped between losers-bracket matches.' };
    }
    const blocked = matchBlockReason(match);
    if (blocked) return { ok: false, reason: `This match ${blocked}.` };

    const names = await loadParticipantNames(deps, String(stage.tournament_id));
    const toSlot = (slotMatch: StorageMatch, side: OpponentSide): LoserSwapSlot => {
      const slot = slotMatch[side];
      const participantId = slot?.id ?? null;
      const partner = slotMatch[otherSide(side)];
      const partnerId = partner?.id ?? null;
      return {
        matchId: slotMatch.id,
        matchNumber: slotMatch.number,
        side,
        participantId,
        participantName: participantId != null ? (names.get(participantId) ?? null) : null,
        isBye: slot === null,
        partnerIsBye: partner === null,
        partnerName: partnerId != null ? (names.get(partnerId) ?? null) : null,
      };
    };

    const sides: OpponentSide[] = ['opponent1', 'opponent2'];
    const slots = sides.flatMap((side) =>
      shapeOf(match[side]) === 'team' ? [toSlot(match, side)] : []
    );
    if (slots.length === 0) {
      return { ok: false, reason: 'This match has no team that can be moved.' };
    }

    const candidates: LoserSwapSlot[] = [];
    for (const sibling of roundMatches) {
      if (sibling.id === match.id) continue;
      if (matchBlockReason(sibling)) continue;
      // A BYE-vs-BYE sibling has no next-round spot a team could advance into —
      // moving a team there always fails downstream, so don't offer it.
      if (shapeOf(sibling.opponent1) === 'bye' && shapeOf(sibling.opponent2) === 'bye') continue;
      for (const side of sides) {
        candidates.push(toSlot(sibling, side));
      }
    }
    if (candidates.length === 0) {
      return { ok: false, reason: 'No other match in this round is able to swap right now.' };
    }

    return { ok: true, roundNumber: round.number, slots, candidates };
  } catch (error) {
    errorLog('Error checking loser swap eligibility:', error);
    return {
      ok: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/** Everything one match needs written, resolved before any write happens. */
interface MatchWritePlan {
  match: StorageMatch;
  side: OpponentSide;
  incoming: StorageMatch['opponent1'];
  fields: MatchUpdateFields;
  becomesWalkover: boolean;
  newWinnerId: number | null;
  staleWinnerId: number | null;
  nextTarget: NextRoundTarget | null;
}

function buildMatchWritePlan(
  match: StorageMatch,
  side: OpponentSide,
  incoming: StorageMatch['opponent1']
): Omit<MatchWritePlan, 'nextTarget'> {
  const partnerSide = otherSide(side);
  const partner = match[partnerSide];
  const incomingIsTeam = incoming != null && incoming.id != null;
  const partnerIsTeam = shapeOf(partner) === 'team';

  const staleWinnerSide = winnerSideOf(match);
  const staleWinnerId = staleWinnerSide ? (match[staleWinnerSide]?.id ?? null) : null;

  // The whole slot travels: id, feeder-position marker, and BYE sentinel. The
  // position is what the viewer's "Loser of WB x.y" labels and the library's
  // reverse traversal read, so it must follow the occupant. Prior results and
  // scores never carry across — they are recomputed from the new match shape.
  let fields: MatchUpdateFields = slotFields(side, {
    id: incoming?.id ?? null,
    position: incoming?.position ?? null,
    score: null,
    result: incoming === null ? 'bye' : null,
  });

  let becomesWalkover = false;
  let newWinnerId: number | null = null;
  if (incomingIsTeam && partnerIsTeam) {
    fields = { ...fields, ...resultFields(partnerSide, null, null), status: 2 };
  } else {
    becomesWalkover = true;
    const winnerSide = incomingIsTeam ? side : partnerSide;
    newWinnerId = (incomingIsTeam ? incoming?.id : partner?.id) ?? null;
    fields = { ...fields, ...resultFields(winnerSide, 'win', 0), status: 4 };
  }

  return { match, side, incoming, fields, becomesWalkover, newWinnerId, staleWinnerId };
}

/**
 * Admin-only: swap two opponent slots between two losers-bracket matches in the
 * same round.
 *
 * The library routes each winners-bracket loser into the losers bracket
 * dynamically when the result is entered, so this tool only accepts matches
 * whose every slot is already resolved (a real team or a stored BYE) — at that
 * point the routing has happened and nothing will overwrite the swap. Within a
 * round, a swap preserves the bracket's structure: each slot still feeds the
 * same next-round match.
 *
 * Walkover state is recomputed after the swap: a team newly facing a BYE is
 * advanced automatically, and a team pulled off a BYE has its automatic
 * advancement undone (refused if the downstream match has been played).
 *
 * All validation happens before the first write. Not transactional: a database
 * failure mid-sequence fails loudly, and Repair Bracket is the recovery tool —
 * the same stance as adminCompleteByeMatch.
 */
export async function adminSwapLoserBracketSlots(
  deps: BracketAdminDeps,
  params: SwapLoserSlotsParams
): Promise<SwapLoserSlotsResult> {
  const { sourceMatchId, sourceSide, targetMatchId, targetSide } = params;
  bracketLog('Admin losers-bracket swap requested', { ...params });

  const { source, target, sourceSlot, targetSlot } = await loadValidatedSwapContexts(deps, params);

  const names = await loadParticipantNames(deps, String(source.stage.tournament_id));
  const nameOf: NameOf = (participantId) =>
    (participantId != null ? names.get(participantId) : null) ?? 'the team';

  // Resolve every write before performing any. Each match receives the other's
  // named slot; walkover changes are planned against the next round.
  const plans = await buildSwapPlans(deps, source, target, params, sourceSlot, targetSlot);
  const clears = planDownstreamChanges(plans, nameOf);

  const outcome = await executeSwapWrites(deps, plans, clears);

  await markBracketCompleteIfDone({ storage: deps.storage }, String(source.stage.tournament_id));

  const message = buildSwapMessage(nameOf, sourceSlot, targetSlot, plans, clears, outcome);
  successLog(
    `Admin swapped losers-bracket slots: match ${sourceMatchId} (${sourceSide}) ↔ ` +
      `match ${targetMatchId} (${targetSide})`,
    message
  );

  return {
    sourceMatchId,
    targetMatchId,
    walkoverCompletedMatchIds: outcome.walkoverCompletedMatchIds,
    downstreamClearedMatchIds: outcome.downstreamClearedMatchIds,
    message,
  };
}

type NameOf = (participantId: number | null | undefined) => string;

interface ValidatedSwapContexts {
  source: RoundContext;
  target: RoundContext;
  sourceSlot: StorageMatch['opponent1'];
  targetSlot: StorageMatch['opponent1'];
}

/** Load both matches and refuse everything the swap must not touch. Read-only. */
async function loadValidatedSwapContexts(
  deps: BracketAdminDeps,
  params: SwapLoserSlotsParams
): Promise<ValidatedSwapContexts> {
  const { sourceMatchId, sourceSide, targetMatchId, targetSide } = params;

  if (sourceMatchId === targetMatchId) {
    throw new ValidationError('Choose two different matches to swap between.');
  }

  const sourceLoad = await loadRoundContext(deps, sourceMatchId);
  if (!sourceLoad.context) throw new ValidationError(sourceLoad.reason ?? 'Match not found');
  const targetLoad = await loadRoundContext(deps, targetMatchId);
  if (!targetLoad.context) throw new ValidationError(targetLoad.reason ?? 'Match not found');
  const source = sourceLoad.context;
  const target = targetLoad.context;

  if (source.match.stage_id !== target.match.stage_id) {
    throw new ValidationError('Both matches must belong to the same bracket.');
  }
  if (source.stage.type !== 'double_elimination') {
    throw new ValidationError('Team swaps are only available in double-elimination brackets.');
  }
  if (source.group.number !== 2 || target.group.number !== 2) {
    throw new ValidationError('Teams can only be swapped between losers-bracket matches.');
  }
  if (source.match.round_id !== target.match.round_id) {
    throw new ValidationError(
      'Teams can only be swapped between matches in the same losers-bracket round.'
    );
  }

  for (const context of [source, target]) {
    const blocked = matchBlockReason(context.match);
    if (blocked) {
      throw new BusinessLogicError(`Match ${context.match.number} ${blocked}.`);
    }
  }

  const sourceSlot = source.match[sourceSide] ?? null;
  const targetSlot = target.match[targetSide] ?? null;
  const sourcePartner = source.match[otherSide(sourceSide)] ?? null;
  const targetPartner = target.match[otherSide(targetSide)] ?? null;

  if (shapeOf(sourceSlot) !== 'team' && shapeOf(targetSlot) !== 'team') {
    throw new ValidationError('Nothing to swap — both selected spots are BYEs.');
  }
  if (
    (shapeOf(targetSlot) === 'bye' && shapeOf(sourcePartner) === 'bye') ||
    (shapeOf(sourceSlot) === 'bye' && shapeOf(targetPartner) === 'bye')
  ) {
    throw new ValidationError(
      'This swap would leave a match with two BYEs and no teams. Swap the two teams directly instead.'
    );
  }

  return { source, target, sourceSlot, targetSlot };
}

/** Build both matches' write plans, with their next-round targets resolved. Read-only. */
async function buildSwapPlans(
  deps: BracketAdminDeps,
  source: RoundContext,
  target: RoundContext,
  params: SwapLoserSlotsParams,
  sourceSlot: StorageMatch['opponent1'],
  targetSlot: StorageMatch['opponent1']
): Promise<MatchWritePlan[]> {
  const partials = [
    buildMatchWritePlan(source.match, params.sourceSide, targetSlot),
    buildMatchWritePlan(target.match, params.targetSide, sourceSlot),
  ];
  const nextTargets = await Promise.all(
    partials.map((partial) => findNextRoundMatch(deps, partial.match))
  );
  return partials.map((partial, index) => ({ ...partial, nextTarget: nextTargets[index] }));
}

interface DownstreamClear {
  matchId: number;
  side: OpponentSide;
  demote: boolean;
  staleWinnerId: number;
}

/**
 * Work out which stale walkover winners must be un-placed downstream, and
 * verify every new walkover has an open landing spot. Throws before any write
 * when a downstream match has been built on. Read-only.
 */
function planDownstreamChanges(plans: MatchWritePlan[], nameOf: NameOf): DownstreamClear[] {
  // Simulated slot states of the next-round matches, shared across both plans —
  // sibling matches in a halved round feed the SAME destination, so one plan's
  // cleared slot can be the other plan's landing spot.
  const destinationStates = new Map<number, Record<OpponentSide, ReturnType<typeof slotState>>>();
  const getDestinationState = (destination: StorageMatch): Record<OpponentSide, string> => {
    let state = destinationStates.get(destination.id);
    if (!state) {
      state = {
        opponent1: slotState(destination.opponent1),
        opponent2: slotState(destination.opponent2),
      };
      destinationStates.set(destination.id, state);
    }
    return state;
  };

  const clears: DownstreamClear[] = [];
  for (const plan of plans) {
    if (
      plan.staleWinnerId == null ||
      plan.staleWinnerId === plan.newWinnerId ||
      plan.nextTarget === null
    ) {
      continue;
    }
    const destination = plan.nextTarget.nextMatch;
    const staleSide: OpponentSide | null =
      destination.opponent1?.id === plan.staleWinnerId
        ? 'opponent1'
        : destination.opponent2?.id === plan.staleWinnerId
          ? 'opponent2'
          : null;
    if (!staleSide) continue; // walkover recorded but never propagated — nothing to undo

    const blocked = destinationBlockReason(destination);
    if (blocked) {
      throw new BusinessLogicError(
        `Cannot swap: ${nameOf(plan.staleWinnerId)} already advanced to a match that ${blocked}. ` +
          'Undo that advancement first (Reopen + Clear Downstream in the BYE editor), then retry.'
      );
    }
    clears.push({
      matchId: destination.id,
      side: staleSide,
      demote: destination.status === 2,
      staleWinnerId: plan.staleWinnerId,
    });
    getDestinationState(destination)[staleSide] = 'empty';
  }

  for (const plan of plans) {
    if (!plan.becomesWalkover || plan.newWinnerId == null || plan.nextTarget === null) continue;
    const state = getDestinationState(plan.nextTarget.nextMatch);
    const freeSide = (['opponent1', 'opponent2'] as const).find((side) => state[side] === 'empty');
    if (!freeSide) {
      throw new BusinessLogicError(
        `Cannot move ${nameOf(plan.newWinnerId)} there: the next round has no open spot ` +
          'for the automatic advancement it would trigger.'
      );
    }
    state[freeSide] = 'taken';
  }

  return clears;
}

interface SwapWriteOutcome {
  walkoverCompletedMatchIds: number[];
  downstreamClearedMatchIds: number[];
  cascadePending: boolean;
}

/**
 * Perform the writes, in dependency order: undo stale advancements, rewrite
 * the two matches, then apply the new automatic advancements. Each write
 * awaits the previous ON PURPOSE — the fixed order is what keeps a
 * mid-sequence database failure diagnosable and recoverable, and the
 * placement step re-reads storage, so it must see the writes that precede it.
 * Do not parallelize with Promise.all.
 */
async function executeSwapWrites(
  deps: BracketAdminDeps,
  plans: MatchWritePlan[],
  clears: DownstreamClear[]
): Promise<SwapWriteOutcome> {
  const downstreamClearedMatchIds: number[] = [];
  for (const clear of clears) {
    const fields: MatchUpdateFields = idField(clear.side, null);
    if (clear.demote) fields.status = 1;
    const { error } = await supabase.from('match').update(fields).eq('id', clear.matchId);
    if (error) {
      handleDatabaseError(error, `Failed to undo the advancement in match ${clear.matchId}`);
    }
    downstreamClearedMatchIds.push(clear.matchId);
    bracketLog(`Cleared stale walkover winner ${clear.staleWinnerId} from match ${clear.matchId}`);
  }

  for (const plan of plans) {
    const { error } = await supabase.from('match').update(plan.fields).eq('id', plan.match.id);
    if (error) {
      handleDatabaseError(error, `Failed to update match ${plan.match.id} during swap`);
    }
  }

  // Sequential on purpose: two placements can land in the SAME next-round
  // match, and resolveWinnerPlacement picks a slot from a fresh read — the
  // second placement must see the first, or both take the same slot.
  const walkoverCompletedMatchIds: number[] = [];
  let cascadePending = false;
  for (const plan of plans) {
    if (!plan.becomesWalkover || plan.newWinnerId == null) continue;
    walkoverCompletedMatchIds.push(plan.match.id);
    const placement = await resolveWinnerPlacement(deps, plan.match, plan.newWinnerId);
    if (placement) {
      await applyWinnerPlacement(placement, plan.newWinnerId);
      if (placement.nextMatch[otherSide(placement.slot)] === null) cascadePending = true;
    }
  }

  return { walkoverCompletedMatchIds, downstreamClearedMatchIds, cascadePending };
}

/** Assemble the plain-language summary shown in the admin's success toast. */
function buildSwapMessage(
  nameOf: NameOf,
  sourceSlot: StorageMatch['opponent1'],
  targetSlot: StorageMatch['opponent1'],
  plans: MatchWritePlan[],
  clears: DownstreamClear[],
  outcome: SwapWriteOutcome
): string {
  const movedNames = [sourceSlot?.id, targetSlot?.id]
    .filter((id): id is number => id != null)
    .map((id) => nameOf(id));
  const parts: string[] = [];
  parts.push(
    movedNames.length === 2
      ? `Swapped ${movedNames[0]} and ${movedNames[1]}.`
      : `Moved ${movedNames[0]} to the other match; a BYE took its old spot.`
  );
  for (const clear of clears) {
    parts.push(`${nameOf(clear.staleWinnerId)}'s automatic advancement was undone.`);
  }
  for (const plan of plans) {
    if (plan.becomesWalkover && plan.newWinnerId != null) {
      parts.push(
        `${nameOf(plan.newWinnerId)} has no opponent in match ${plan.match.number} and advances automatically.`
      );
    }
  }
  if (outcome.cascadePending) {
    parts.push(
      'A follow-up automatic advancement may be waiting in a later round — use the BYE editor or Repair Bracket if a team looks stuck.'
    );
  }
  return parts.join(' ');
}
