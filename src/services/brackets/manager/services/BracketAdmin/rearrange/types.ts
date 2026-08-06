import type { MatchUpdateFields, OpponentSide, SlotShape } from '../shapes';

/** One opponent slot of one match, addressed for assignment. */
export interface SlotRef {
  matchId: number;
  side: OpponentSide;
}

export const slotKeyOf = (ref: SlotRef): string => `${ref.matchId}:${ref.side}`;

/**
 * The admin's desired occupancy of one origin slot: a movable team's
 * participant id, or null to leave the spot as a BYE.
 */
export interface SlotAssignment extends SlotRef {
  participantId: number | null;
}

/**
 * How a slot participates in the rearrange screen.
 *
 * - 'team'    — an origin slot holding a movable team (draggable, droppable)
 * - 'bye'     — an origin slot holding a stored BYE (droppable destination)
 * - 'derived' — filled automatically by another editable match; read-only
 * - 'locked'  — belongs to a match that cannot be rearranged
 */
type RearrangeSlotKind = 'team' | 'bye' | 'derived' | 'locked';

export interface RearrangeSlotView {
  matchId: number;
  side: OpponentSide;
  kind: RearrangeSlotKind;
  participantId: number | null;
  participantName: string | null;
  /** Plain-language note for derived slots, e.g. "Filled automatically from Match 2". */
  autoNote: string | null;
}

export interface RearrangeMatchView {
  matchId: number;
  matchNumber: number;
  roundNumber: number;
  status: number;
  locked: boolean;
  /** Plain-language reason when locked, e.g. "has already been played". */
  lockedReason: string | null;
  slots: [RearrangeSlotView, RearrangeSlotView];
}

/** One losers-bracket match as the pure simulation sees it. */
export interface SnapshotSlot {
  shape: SlotShape;
  participantId: number | null;
  /** Feeder marker: the WB match number whose loser this occupant is. Travels with the team. */
  position: number | null;
  result: string | null;
  score: number | null;
  /** Assignable by the admin (team or BYE in an editable match, not auto-filled). */
  isOrigin: boolean;
  /** Filled automatically by another editable losers-bracket match. */
  isDerived: boolean;
}

export interface SnapshotMatch {
  id: number;
  number: number;
  roundNumber: number;
  status: number;
  editable: boolean;
  lockedReason: string | null;
  opponent1: SnapshotSlot;
  opponent2: SnapshotSlot;
}

/**
 * Everything the pure simulation needs, loaded once by the board and shared
 * verbatim with the browser so live preview and server-side apply can never
 * disagree.
 */
export interface RearrangeSnapshot {
  bracketId: string;
  stageId: number;
  /** All losers-bracket matches, ascending (roundNumber, number). */
  matches: SnapshotMatch[];
  /**
   * feeder matchId -> the slot its automatic result lands in, one round later.
   * Explicitly null for matches in the last losers-bracket round (their winner
   * goes to the grand final, which this tool does not touch).
   */
  landings: Record<string, SlotRef | null>;
  /** participantId -> team name, for plain-language messages. */
  names: Record<string, string>;
}

export interface RearrangeBoard {
  bracketId: string;
  stageId: number;
  rounds: { roundNumber: number; matches: RearrangeMatchView[] }[];
  snapshot: RearrangeSnapshot;
}

export interface RearrangeProblem {
  message: string;
  /** The slot the problem is about, when it is about one. */
  slot?: SlotRef;
}

export interface PlannedMatchWrite {
  matchId: number;
  roundNumber: number;
  matchNumber: number;
  fields: MatchUpdateFields;
}

/** A slot's simulated end state, for live board rendering. */
export interface SimSlot {
  shape: SlotShape;
  participantId: number | null;
  position: number | null;
  result: string | null;
  score: number | null;
}

export interface SimMatchState {
  opponent1: SimSlot;
  opponent2: SimSlot;
  status: number;
}

export interface RearrangePlanResult {
  ok: boolean;
  /** Plain-language blockers, shown live in the UI. Empty when ok. */
  problems: RearrangeProblem[];
  /** The admin's explicit moves, restated in plain language. */
  moves: string[];
  /** Automatic knock-on changes, for the confirmation step. */
  consequences: string[];
  /** Exact database writes, ascending (round, match number). Empty unless ok. */
  writes: PlannedMatchWrite[];
  /** Post-rearrange state of every losers-bracket match, keyed by matchId. */
  preview: Record<string, SimMatchState>;
}

export interface RearrangeApplyResult {
  changedMatchIds: number[];
  message: string;
}
