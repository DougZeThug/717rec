export type TeamSide = 1 | 2;

export interface RoundScore {
  team1: number;
  team2: number;
}

export interface RoundRecord extends RoundScore {
  roundNumber: number;
  team1ThrowerId: string | null;
  team2ThrowerId: string | null;
}

export interface GameRules {
  /** Score a team must reach to win a game. */
  targetScore: number;
  /** Minimum lead required at or past the target score. */
  winBy: number;
  /** Reaching this score wins outright regardless of lead (null = no cap). */
  hardCap: number | null;
}

export interface BagBreakdown {
  bagsIn: number;
  bagsOn: number;
  bagsOff: number;
}

export interface GameSummary {
  gameNumber: number;
  status: 'in_progress' | 'completed';
  winnerSide: TeamSide | null;
}
