import type { TeamTimeslot } from '@/types/timeslots';

import { DOUBLE_HEADER_START_TIMES, getBackToBackPair } from './autoSchedule/constants';

/** The value a bye is stored as, in the timeslot column itself. */
export const BYE_SLOT = 'BYE';

/** "6:30 + 7:00 PM", the pair of times a booking actually writes. */
export const describeBlock = (timeslot: string): string => {
  if (timeslot === BYE_SLOT) return 'bye';
  const second = getBackToBackPair(timeslot);
  return second ? `${timeslot.replace(' PM', '')} + ${second}` : timeslot;
};

/**
 * Every block a team can be booked into, as a choice.
 *
 * The value is the block's first time, which is what a booking takes; the label
 * names both times it covers, because booking one books both. Anything that
 * asks a person to name a time offers these rather than a text box.
 */
export const BLOCK_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  DOUBLE_HEADER_START_TIMES.map((start) => ({ value: start, label: describeBlock(start) }));

/**
 * Read a block out of the free text a team typed when it asked for a time.
 *
 * `team_requests.requested_timeslot` has no constraint of any kind, and for a
 * long time the form was a plain text box, so stored rows can hold anything a
 * person typed. **The form offers `BLOCK_OPTIONS` now**, so new rows always
 * hold a block's first time and this reads them straight through; it stays for
 * every row written before that. The rule it follows is the whole point of it:
 *
 * **It may answer "I do not know". It may never be wrong.**
 *
 * A wrong reading would move a team to a time nobody asked for, on one press.
 * So it matches shapes exactly, never fuzzily, and returns null for everything
 * else. The screen then says what was asked for and lets the admin choose.
 *
 * Returns a block's *first* time, which is the value a booking takes. 9:30 PM
 * is a legal stored time but starts no block, so it is never returned.
 */
export const parseRequestedBlock = (raw: string | null | undefined): string | null => {
  if (!raw) return null;

  const text = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  const match = /^(\d{1,2})(?::(\d{2}))?\s?(am|pm|a|p)?$/.exec(text);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  const meridiem = match[3];

  // Blocks start on the hour or the half hour and nowhere else.
  if (minute !== 0 && minute !== 30) return null;

  if (meridiem === 'am' || meridiem === 'a') return null;

  if (meridiem === 'pm' || meridiem === 'p') {
    // 12 PM is noon, which is not an evening block.
    if (hour < 1 || hour > 11) return null;
  } else if (hour >= 13 && hour <= 21) {
    hour -= 12;
  } else if (hour < 1 || hour > 9) {
    // Nothing said morning or afternoon, and the league plays in the evening,
    // so a bare 1-9 is read as PM. 10, 11 and 12 are left alone rather than
    // guessed at.
    return null;
  }

  const label = `${hour}:${minute === 0 ? '00' : '30'} PM`;
  return DOUBLE_HEADER_START_TIMES.includes(label) ? label : null;
};

/** What the team already holds on the night being looked at. */
export interface TeamNight {
  /** The first time of each block the team holds. Two means a double header. */
  blocks: string[];
  /** True when the team is marked as not playing. */
  hasBye: boolean;
  /** Times held outside any block, which older rows can still be. */
  looseTimes: string[];
  /** Every row id, which is what a move clears. */
  rowIds: string[];
}

/** What the team holds on this night, read off the night's rows. */
export const readTeamNight = (timeslots: TeamTimeslot[], teamId: string): TeamNight => {
  const night: TeamNight = { blocks: [], hasBye: false, looseTimes: [], rowIds: [] };

  for (const row of timeslots) {
    if (row.team_id !== teamId) continue;
    night.rowIds.push(row.id);

    if (row.timeslot === BYE_SLOT) {
      night.hasBye = true;
    } else if (row.is_back_to_back) {
      // A block writes two rows and marks the first of them, so counting the
      // firsts counts the blocks: one for a block, two for a double header.
      if (row.match_sequence === 1) night.blocks.push(row.timeslot);
    } else {
      night.looseTimes.push(row.timeslot);
    }
  }

  return night;
};

/**
 * What a one-press move would do, or why it cannot be one press.
 *
 * `ambiguous` and `already` carry no button on purpose. A team with two games
 * that night has two bookings a time change could mean, and the request does
 * not say which — guessing would delete a game.
 */
type MovePlanKind = 'book' | 'move' | 'clear-all' | 'already' | 'ambiguous' | 'unknown-time';

export interface MovePlan {
  kind: MovePlanKind;
  /** Rows to clear, read before the new booking is written. */
  removeIds: string[];
  /** The block being aimed at, or null when the request could not be read. */
  target: string | null;
  /** What the team holds now, for the sentence on screen. */
  night: TeamNight;
}

/** Whether a plan can be carried out by pressing one button. */
export const isActionable = (plan: MovePlan): boolean =>
  plan.kind === 'book' || plan.kind === 'move' || plan.kind === 'clear-all';

/** Work out what moving this team to this block on this night would mean. */
export const buildMovePlan = (
  timeslots: TeamTimeslot[],
  teamId: string,
  target: string | null
): MovePlan => {
  const night = readTeamNight(timeslots, teamId);
  const base = { removeIds: night.rowIds, target, night };
  const holdsSomething = night.blocks.length > 0 || night.hasBye || night.looseTimes.length > 0;

  if (!target) return { ...base, kind: 'unknown-time' };
  if (!holdsSomething) return { ...base, kind: 'book' };

  if (target === BYE_SLOT) {
    const byeOnly = night.hasBye && night.blocks.length === 0 && night.looseTimes.length === 0;
    return { ...base, kind: byeOnly ? 'already' : 'clear-all' };
  }

  // Two blocks is a double header, and a time change does not say which of the
  // two games it means.
  if (night.blocks.length > 1) return { ...base, kind: 'ambiguous' };

  const alreadyThere =
    night.blocks.length === 1 &&
    night.blocks[0] === target &&
    !night.hasBye &&
    night.looseTimes.length === 0;

  return { ...base, kind: alreadyThere ? 'already' : 'move' };
};

/** The words the screen uses for a plan. */
export interface MovePlanWords {
  title: string;
  body: string;
  /** The button, or null when the plan cannot be one press. */
  action: string | null;
}

/** Everything the team holds now, as one readable list. */
const describeHolding = (night: TeamNight): string => {
  const parts = [
    ...night.blocks.map((block) => `the ${describeBlock(block)} block`),
    ...night.looseTimes.map((time) => time),
  ];
  if (night.hasBye) parts.push('a bye');

  if (parts.length === 0) return 'nothing';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
};

/** Turn a plan into the sentence the card shows. Pure, so the copy is testable. */
export const describeMovePlan = (
  plan: MovePlan,
  context: { teamName: string; dateLabel: string; requestedText?: string | null }
): MovePlanWords => {
  const { teamName, dateLabel, requestedText } = context;
  const holding = describeHolding(plan.night);

  switch (plan.kind) {
    case 'book':
      return {
        title: `Book ${teamName}`,
        body:
          plan.target === BYE_SLOT
            ? `${teamName} has nothing on ${dateLabel}. This marks them as not playing.`
            : `${teamName} has nothing on ${dateLabel}. This books the ${describeBlock(plan.target as string)} block.`,
        action: plan.target === BYE_SLOT ? 'Give the bye' : 'Book the block',
      };

    case 'move':
      return {
        title: `Move ${teamName}`,
        body: `${teamName} has ${holding} on ${dateLabel}. This books the ${describeBlock(plan.target as string)} block and removes what they have now.`,
        action: 'Move them',
      };

    case 'clear-all':
      return {
        title: `Give ${teamName} a bye`,
        body: `${teamName} has ${holding} on ${dateLabel}. A bye means they are not playing, so this removes ${holding}.`,
        action: 'Give the bye',
      };

    case 'already':
      return {
        title: 'Nothing to change',
        body:
          plan.target === BYE_SLOT
            ? `${teamName} already has a bye on ${dateLabel}.`
            : `${teamName} is already in the ${describeBlock(plan.target as string)} block on ${dateLabel}.`,
        action: null,
      };

    case 'ambiguous':
      return {
        title: `${teamName} has two games that night`,
        body: `${teamName} has ${holding} on ${dateLabel}. The request does not say which game to move, so this cannot be done in one press. Remove the one you want to move from the list of current timeslots, then book the new block below.`,
        action: null,
      };

    case 'unknown-time':
    default:
      return {
        title: 'The requested time is not a block',
        body: requestedText
          ? `The request asked for "${requestedText}", which is not one of the blocks. ${teamName} has ${holding} on ${dateLabel}. Pick a block below.`
          : `The request did not say which time was wanted. ${teamName} has ${holding} on ${dateLabel}. Pick a block below.`,
        action: null,
      };
  }
};
