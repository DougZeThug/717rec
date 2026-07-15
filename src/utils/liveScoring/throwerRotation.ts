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
  // Walk rounds in ascending order so we can find each side's most recent
  // *non-null* thrower independently. An "Unassigned" (null) thrower in the
  // latest round must not reset the alternation established by earlier rounds.
  const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  let lastTeam1: string | null = null;
  let lastTeam2: string | null = null;
  for (const round of sorted) {
    if (round.team1ThrowerId != null) lastTeam1 = round.team1ThrowerId;
    if (round.team2ThrowerId != null) lastTeam2 = round.team2ThrowerId;
  }
  return {
    team1ThrowerId: nextForSide(lastTeam1, roster.team1),
    team2ThrowerId: nextForSide(lastTeam2, roster.team2),
  };
}
