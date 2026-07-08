import type { RoundRecord } from './types';

export interface TeamRosters {
  /** Selected player ids per side, in slot order (max 2 per side). */
  team1: string[];
  team2: string[];
}

function nextForSide(lastThrowerId: string | null, roster: string[]): string | null {
  if (roster.length === 0) return null;
  if (roster.length === 1) return roster[0];
  if (lastThrowerId === null) return roster[0];
  const idx = roster.indexOf(lastThrowerId);
  if (idx === -1) return roster[0];
  return roster[(idx + 1) % roster.length];
}

/**
 * Derive who throws next by alternating from the latest recorded round.
 * Because this reads the round log (not separate state), it stays correct
 * after undo, corrections, and page refresh.
 */
export function deriveNextThrowers(
  rounds: RoundRecord[],
  roster: TeamRosters
): { team1ThrowerId: string | null; team2ThrowerId: string | null } {
  let last: RoundRecord | null = null;
  for (const round of rounds) {
    if (last === null || round.roundNumber > last.roundNumber) last = round;
  }
  return {
    team1ThrowerId: nextForSide(last?.team1ThrowerId ?? null, roster.team1),
    team2ThrowerId: nextForSide(last?.team2ThrowerId ?? null, roster.team2),
  };
}
