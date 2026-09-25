import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import type { Database, SeedOrdering, StageSettings } from 'brackets-model';

import { BusinessLogicError } from '@/types/errors';

import type { StorageStage } from '../types/BracketServiceTypes';

type Side = 'opponent1' | 'opponent2';

const SIDES: Side[] = ['opponent1', 'opponent2'];

const keyOf = (roundNumber: number, matchNumber: number, side: Side): string =>
  `${roundNumber}:${matchNumber}:${side}`;

interface LbFeederMarkers {
  /** The marker the library gives this losers-bracket slot, or null for a slot it leaves unmarked. */
  markerOf(roundNumber: number, matchNumber: number, side: Side): number | null;
}

interface StageSlotLayout {
  /** As LbFeederMarkers.markerOf; always null in a single-elimination stage. */
  lbMarkerOf(roundNumber: number, matchNumber: number, side: Side): number | null;
  /** The seed number a winners-bracket round 1 slot was built for, or null if there is none. */
  wbRoundOneSeedOf(matchNumber: number, side: Side): number | null;
}

/**
 * Create an empty copy of an elimination stage in memory — same type, size
 * and seed orderings, but no seeding — and return its data.
 *
 * Without seeding there are no BYEs, so the library gives every slot its
 * position: winners round 1 slots get the seed number they were built for,
 * and losers-bracket drop-in slots get their feeder marker. Positions depend
 * only on the slot and the orderings, never on the teams. (A stage created
 * with a manual ordering would lay out winners round 1 differently; the app
 * never creates one.)
 *
 * `subject` names what is being worked out, for the error messages.
 */
async function buildEmptyStageLayout(
  stage: Pick<StorageStage, 'type' | 'settings'>,
  subject: string
): Promise<Database> {
  const { type } = stage;
  if (type !== 'single_elimination' && type !== 'double_elimination') {
    throw new BusinessLogicError(`Only an elimination bracket has a ${subject}.`);
  }
  const { size, seedOrdering, skipFirstRound } = stage.settings;
  if (typeof size !== 'number') {
    throw new BusinessLogicError(
      `This bracket's settings have no size, so its ${subject} cannot be worked out.`
    );
  }

  // A fresh object from known keys only: the library writes into the settings
  // it is given, and the grand final (created after the losers bracket) is
  // irrelevant to the positions. Single elimination takes exactly one ordering.
  const settings: StageSettings = { size };
  if (Array.isArray(seedOrdering) && seedOrdering.length > 0) {
    settings.seedOrdering = (
      type === 'single_elimination' ? seedOrdering.slice(0, 1) : [...seedOrdering]
    ) as SeedOrdering[];
  }
  if (type === 'double_elimination') {
    settings.grandFinal = 'none';
    if (skipFirstRound === true) settings.skipFirstRound = true;
  }

  try {
    const manager = new BracketsManager(new InMemoryDatabase());
    const created = await manager.create.stage({ tournamentId: 0, name: 'layout', type, settings });
    return await manager.get.stageData(created.id);
  } catch (error) {
    throw new BusinessLogicError(
      `Could not work out this bracket's ${subject}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      error
    );
  }
}

/** Every slot position of one group's matches, keyed by (round, match, side). */
function positionsOfGroup(data: Database, groupNumber: number): Map<string, number> {
  const group = data.group.find((candidate) => candidate.number === groupNumber);
  const roundNumberById = new Map(
    data.round
      .filter((round) => round.group_id === group?.id)
      .map((round) => [round.id, round.number])
  );
  const positions = new Map<string, number>();
  for (const match of data.match) {
    const roundNumber = roundNumberById.get(match.round_id);
    if (roundNumber === undefined) continue;
    for (const side of SIDES) {
      const position = match[side]?.position;
      if (position !== undefined) positions.set(keyOf(roundNumber, match.number, side), position);
    }
  }
  return positions;
}

/**
 * brackets-manager's own feeder markers for every losers-bracket slot of a
 * double-elimination stage.
 *
 * A marker (`opponentN_position`) belongs to the SLOT, not to whoever sits in
 * it: it is the number of the winners-bracket match whose loser drops into
 * that slot. The library reads it back when a losers-bracket match is scored
 * (round 1 reads both slots, minor rounds read opponent1) to find the feeder
 * match, and it keeps the slot's marker when a team arrives. Admin tools that
 * move teams must therefore leave each slot with ITS marker — a team carrying
 * its old marker into another round sends the library to a winners-bracket
 * match that does not exist ("Match not found.").
 *
 * The stored markers can't be trusted for this: a BYE slot is stored without
 * one, and older rearrangements moved markers with teams. So the layout is
 * rebuilt instead, from an empty copy of the stage (buildEmptyStageLayout).
 */
export async function computeLbFeederMarkers(
  stage: Pick<StorageStage, 'type' | 'settings'>
): Promise<LbFeederMarkers> {
  if (stage.type !== 'double_elimination') {
    throw new BusinessLogicError('Only a double-elimination bracket has a losers bracket.');
  }
  const markers = positionsOfGroup(await buildEmptyStageLayout(stage, 'losers-bracket layout'), 2);
  return {
    markerOf: (roundNumber, matchNumber, side) =>
      markers.get(keyOf(roundNumber, matchNumber, side)) ?? null,
  };
}

/**
 * The library's slot layout of a single- or double-elimination stage: the
 * losers-bracket feeder markers (as computeLbFeederMarkers) and the seed
 * number each winners-bracket round 1 slot was built for. Like the markers,
 * a round 1 slot's seed number belongs to the slot, so a team placed there
 * takes it.
 */
export async function computeStageSlotLayout(
  stage: Pick<StorageStage, 'type' | 'settings'>
): Promise<StageSlotLayout> {
  const data = await buildEmptyStageLayout(stage, 'layout');
  const winners = positionsOfGroup(data, 1);
  const losers =
    stage.type === 'double_elimination' ? positionsOfGroup(data, 2) : new Map<string, number>();
  return {
    lbMarkerOf: (roundNumber, matchNumber, side) =>
      losers.get(keyOf(roundNumber, matchNumber, side)) ?? null,
    wbRoundOneSeedOf: (matchNumber, side) => winners.get(keyOf(1, matchNumber, side)) ?? null,
  };
}
