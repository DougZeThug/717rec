import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import type { SeedOrdering, StageSettings } from 'brackets-model';

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
 * rebuilt instead: an empty copy of the stage is created in memory with the
 * same size and orderings but no seeding. Without seeding there are no BYEs,
 * and the library marks every drop-in slot — the marker depends only on the
 * slot and the orderings, never on the teams.
 */
export async function computeLbFeederMarkers(
  stage: Pick<StorageStage, 'type' | 'settings'>
): Promise<LbFeederMarkers> {
  if (stage.type !== 'double_elimination') {
    throw new BusinessLogicError('Only a double-elimination bracket has a losers bracket.');
  }
  const { size, seedOrdering, skipFirstRound } = stage.settings;
  if (typeof size !== 'number') {
    throw new BusinessLogicError(
      "This bracket's settings have no size, so its losers-bracket layout cannot be worked out."
    );
  }

  // A fresh object from known keys only: the library writes into the settings
  // it is given, and the grand final (created after the losers bracket) is
  // irrelevant to the markers.
  const settings: StageSettings = { size, grandFinal: 'none' };
  if (Array.isArray(seedOrdering) && seedOrdering.length > 0) {
    settings.seedOrdering = [...seedOrdering] as SeedOrdering[];
  }
  if (skipFirstRound === true) settings.skipFirstRound = true;

  const markers = new Map<string, number>();
  try {
    const manager = new BracketsManager(new InMemoryDatabase());
    const created = await manager.create.stage({
      tournamentId: 0,
      name: 'layout',
      type: 'double_elimination',
      settings,
    });
    const data = await manager.get.stageData(created.id);
    const losersGroup = data.group.find((group) => group.number === 2);
    const roundNumberById = new Map(
      data.round
        .filter((round) => round.group_id === losersGroup?.id)
        .map((round) => [round.id, round.number])
    );
    for (const match of data.match) {
      const roundNumber = roundNumberById.get(match.round_id);
      if (roundNumber === undefined) continue;
      for (const side of SIDES) {
        const position = match[side]?.position;
        if (position !== undefined) markers.set(keyOf(roundNumber, match.number, side), position);
      }
    }
  } catch (error) {
    throw new BusinessLogicError(
      `Could not work out this bracket's losers-bracket layout: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      error
    );
  }

  return {
    markerOf: (roundNumber, matchNumber, side) =>
      markers.get(keyOf(roundNumber, matchNumber, side)) ?? null,
  };
}
