import { DEFAULT_GAME_RULES } from './rules';
import type { GameRules, TeamSide } from './types';

/** A game is won by reaching the target with the required lead. */
export function checkGameWinner(
  team1Total: number,
  team2Total: number,
  rules: GameRules = DEFAULT_GAME_RULES
): TeamSide | null {
  if (rules.hardCap !== null) {
    if (team1Total >= rules.hardCap && team1Total > team2Total) return 1;
    if (team2Total >= rules.hardCap && team2Total > team1Total) return 2;
  }

  const lead = Math.abs(team1Total - team2Total);
  if (team1Total >= rules.targetScore && team1Total > team2Total && lead >= rules.winBy) return 1;
  if (team2Total >= rules.targetScore && team2Total > team1Total && lead >= rules.winBy) return 2;
  return null;
}
